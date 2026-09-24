/**
 * GrievanceAI — API (Supabase Edge Function, replaces the Express backend).
 *
 * Deployed as the `api` function, so every route lives under
 *   https://<project>.supabase.co/functions/v1/api/...
 * which keeps the same /api/... paths the React app already calls.
 *
 * Auth: Supabase Auth issues the JWT; we verify it with auth.getUser() and
 * read the role from public.profiles. Data access uses the service role, so
 * the ownership / role checks below are the access control.
 */
import { Hono, type Context, type Next } from 'jsr:@hono/hono@4';
import { cors } from 'jsr:@hono/hono@4/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { analyzeGrievance, locateNearbyOffices, translateAnalysis, translateText } from './gemini.ts';
import { getPortalsForCategory, RESOLUTION_DAYS } from './portalData.js';
import { sendFollowUpEmail, sendResolutionEmail } from './mailer.js';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const BUCKET = 'grievance-uploads';
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_CHARS = 4000;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const AUDIO_TYPES = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4', 'audio/webm'];
const STATUSES = ['pending', 'processing', 'open', 'in_progress', 'resolved', 'closed'];

// deno-lint-ignore no-explicit-any
type User = { userId: string; email: string; role: string; profile: any; twoFactor: boolean };
const app = new Hono<{ Variables: { user: User } }>().basePath('/api');

app.use('*', cors());
app.onError((err, c) => {
  console.error('❌ Unhandled error:', err.message);
  return c.json({ message: err.message || 'Internal Server Error' }, 500);
});

// ─── Helpers ──────────────────────────────────────────────────────
// The frontend was written against MongoDB and reads `_id`.
// deno-lint-ignore no-explicit-any
const withId = (row: any) => (row ? { ...row, _id: row.id } : row);

const countBy = <T>(rows: T[], key: keyof T) =>
  rows.reduce<Record<string, number>>((acc, r) => {
    const k = String(r[key] ?? 'unknown');
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

// Unwraps a supabase-js result, turning query errors into thrown 500s.
const must = <T>({ data, error }: { data: T; error: { message: string } | null }) => {
  if (error) throw new Error(error.message);
  return data as NonNullable<T>; // only maybeSingle() can yield null, and callers check for it
};

const addStatusUpdate = (grievance_id: string, old_status: string, new_status: string, changed_by: string, remark = '') =>
  db.from('status_updates').insert({ grievance_id, old_status, new_status, changed_by, remark }).then(must);

const signed = async (path: string | null) =>
  path ? (await db.storage.from(BUCKET).createSignedUrl(path, 3600)).data?.signedUrl ?? null : null;

async function grievanceWithDetails(id: string) {
  const grievance = must(await db.from('grievances').select('*').eq('id', id).maybeSingle());
  if (!grievance) return null;
  const [ai_analysis, timeline, image_url, audio_url] = await Promise.all([
    db.from('ai_analyses').select('*').eq('grievance_id', id).maybeSingle().then(must),
    db.from('status_updates').select('*').eq('grievance_id', id).order('updated_at').then(must),
    signed(grievance.image_url),
    signed(grievance.audio_url),
  ]);
  return {
    grievance: withId({ ...grievance, image_url, audio_url }),
    ai_analysis,
    status_timeline: timeline.map(withId),
  };
}

// ─── Auth middleware ──────────────────────────────────────────────
async function auth(c: Context, next: Next) {
  const token = c.req.header('Authorization')?.replace(/^Bearer /, '');
  if (!token) return c.json({ message: 'No token provided' }, 401);

  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return c.json({ message: 'Invalid token' }, 401);

  // Users who enabled TOTP must finish the second factor (aal2) before using the API.
  const twoFactor = !!user.factors?.some((f) => f.status === 'verified');
  const { aal } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  if (twoFactor && aal !== 'aal2') return c.json({ message: 'Two-factor verification required' }, 401);

  const profile = must(await db.from('profiles').select('*').eq('id', user.id).single());
  c.set('user', { userId: user.id, email: user.email ?? '', role: profile.role, profile, twoFactor });
  await next();
}

async function requireAdmin(c: Context, next: Next) {
  if (!['authority', 'admin'].includes(c.get('user').role)) {
    return c.json({ message: 'Access denied. Admin or Authority role required.' }, 403);
  }
  await next();
}

// ─── Health / public ──────────────────────────────────────────────
app.get('/', (c) => c.json({ status: 'online', service: 'GrievanceAI API', timestamp: new Date().toISOString() }));

app.get('/public/stats', async (c) => {
  // ponytail: aggregates in JS over every row; move to a SQL view once grievances run into the thousands.
  const rows = must(await db.from('grievances').select('status, category'));
  return c.json({ total: rows.length, by_status: countBy(rows, 'status'), by_category: countBy(rows, 'category') });
});

// ─── Auth ─────────────────────────────────────────────────────────
// Created server-side with email_confirm so sign-up works without waiting on a
// confirmation email (Supabase's built-in mailer is heavily rate-limited).
app.post('/auth/register', async (c) => {
  const { name, email, password, phone, preferred_language } = await c.req.json();
  if (!email || !password || password.length < 6) {
    return c.json({ message: 'Email and a password of at least 6 characters are required' }, 400);
  }
  const { data, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name },
  });
  if (error) {
    const taken = /already/i.test(error.message);
    return c.json({ message: taken ? 'Email already registered' : error.message }, taken ? 400 : 500);
  }
  if (phone || preferred_language) {
    await db.from('profiles').update({ phone, preferred_language: preferred_language || 'en-IN' }).eq('id', data.user.id);
  }
  return c.json({ message: 'Registration successful!' }, 201);
});

app.get('/auth/profile', auth, (c) => {
  const { profile, twoFactor } = c.get('user');
  return c.json({ user: { ...profile, isTwoFactorEnabled: twoFactor } });
});

app.put('/auth/profile', auth, async (c) => {
  const { userId, twoFactor } = c.get('user');
  const { name, email, phone, preferred_language } = await c.req.json();
  if (email !== undefined && email !== c.get('user').email) {
    const { error } = await db.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) return c.json({ message: 'This email is already registered to another account.' }, 400);
  }
  const updates = Object.fromEntries(
    Object.entries({ name, email, phone, preferred_language }).filter(([, v]) => v !== undefined),
  );
  const user = must(await db.from('profiles').update(updates).eq('id', userId).select().single());
  return c.json({ message: 'Profile updated successfully', user: { ...user, isTwoFactorEnabled: twoFactor } });
});

app.post('/auth/change-password', auth, async (c) => {
  const { currentPassword, newPassword } = await c.req.json();
  if (!newPassword || newPassword.length < 6) return c.json({ message: 'New password must be at least 6 characters' }, 400);

  // Verify the current password with a throwaway anon client.
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
  });
  const { error } = await anon.auth.signInWithPassword({ email: c.get('user').email, password: currentPassword });
  if (error) return c.json({ message: 'Incorrect current password' }, 400);

  const { error: updateError } = await db.auth.admin.updateUserById(c.get('user').userId, { password: newPassword });
  if (updateError) return c.json({ message: updateError.message }, 400);
  return c.json({ message: 'Password updated successfully' });
});

// ─── Citizen grievance flow ───────────────────────────────────────
app.post('/grievance/ingest', auth, async (c) => {
  const { userId } = c.get('user');
  const form = await c.req.formData();
  const text = String(form.get('text') ?? '').trim().slice(0, MAX_TEXT_CHARS);
  const image = form.get('image') instanceof File ? form.get('image') as File : null;
  const audio = form.get('audio') instanceof File ? form.get('audio') as File : null;

  for (const [file, types] of [[image, IMAGE_TYPES], [audio, AUDIO_TYPES]] as const) {
    if (!file) continue;
    // Browsers append codecs, e.g. "audio/webm;codecs=opus".
    if (!types.includes(file.type.split(';')[0])) return c.json({ message: 'Unsupported file type' }, 400);
    if (file.size > MAX_FILE_BYTES) return c.json({ message: 'File is too large. Maximum supported size is 4 MB.' }, 413);
  }
  if (!text && !image && !audio) return c.json({ message: 'Provide at least one of: text, image, or audio.' }, 400);

  const inputType = [text && 'text', image && 'image', audio && 'audio'].filter(Boolean).join('+');
  const grievance = must(await db.from('grievances')
    .insert({ user_id: userId, status: 'processing', input_type: inputType }).select().single());

  const upload = async (file: File | null, kind: string) => {
    if (!file) return null;
    const path = `${userId}/${grievance.id}/${kind}-${file.name.replace(/[^\w.-]/g, '_')}`;
    must(await db.storage.from(BUCKET).upload(path, file, { contentType: file.type }));
    return path;
  };

  const started = Date.now();
  // deno-lint-ignore no-explicit-any
  let ai: any;
  try {
    const [image_url, audio_url, result] = await Promise.all([
      upload(image, 'image'), upload(audio, 'audio'), analyzeGrievance({ text, image, audio }),
    ]);
    ai = result;
    await db.from('grievances').update({ image_url, audio_url }).eq('id', grievance.id);
  } catch (err) {
    console.error('❌ AI analysis failed:', (err as Error).message);
    await db.from('grievances').update({ status: 'pending' }).eq('id', grievance.id);
    return c.json({
      message: 'AI Engine unavailable. Your grievance was saved.',
      grievance_id: grievance.id,
      error: 'AI_ENGINE_UNAVAILABLE',
    }, 503);
  }

  must(await db.from('ai_analyses').insert({
    grievance_id: grievance.id,
    english_summary: ai.english_summary || ai.english_text || '',
    verification_sentence: ai.verification_sentence || '',
    detected_language: ai.detected_language || 'en-IN',
    ocr_raw_text: ai.ocr_raw_text || '',
    stt_transcript: ai.stt_transcript || '',
    llm_category: ai.category,
    keywords: ai.keywords || [],
    confidence_score: ai.confidence_score || 0,
    processing_ms: Date.now() - started,
  }));

  const original_text = ai.original_text || text;
  must(await db.from('grievances').update({
    title: (ai.title || ai.english_summary || 'Untitled Grievance').substring(0, 80),
    original_text,
    original_language: ai.detected_language || 'en-IN',
    category: ai.category,
    status: 'pending',
  }).eq('id', grievance.id));

  return c.json({
    grievance_id: grievance.id,
    verification_sentence: ai.verification_sentence || '',
    detected_language: ai.detected_language || 'en-IN',
    category: ai.category,
    keywords: ai.keywords || [],
    english_summary: ai.english_summary || ai.english_text || '',
    original_text,
    confidence_score: ai.confidence_score || 0,
  });
});

// Loads a grievance and checks the caller owns it; returns a Response on failure.
async function ownGrievance(c: Context, id: string) {
  const grievance = must(await db.from('grievances').select('*').eq('id', id).maybeSingle());
  if (!grievance) return c.json({ message: 'Grievance not found' }, 404);
  if (grievance.user_id !== c.get('user').userId) return c.json({ message: 'Not authorized' }, 403);
  return grievance;
}

app.post('/grievance/confirm', auth, async (c) => {
  const { grievance_id, confirmed } = await c.req.json();
  const grievance = await ownGrievance(c, grievance_id);
  if (grievance instanceof Response) return grievance;

  if (confirmed === false || confirmed === 'false') {
    await db.from('grievances').update({ status: 'pending' }).eq('id', grievance.id);
    return c.json({ retry: true, message: 'Grievance reset for reprocessing' });
  }

  must(await db.from('grievances').update({ status: 'open' }).eq('id', grievance.id));
  await addStatusUpdate(grievance.id, grievance.status, 'open', 'citizen', 'Citizen confirmed AI understanding');

  const ai = must(await db.from('ai_analyses').select('*').eq('grievance_id', grievance.id).maybeSingle());
  if (ai) {
    await db.from('training_data').insert({
      original_text: grievance.original_text || '',
      detected_language: ai.detected_language || 'en-IN',
      english_text: ai.english_summary || '',
      confirmed_category: grievance.category || 'other',
    });
  }
  return c.json({ success: true, grievance_id: grievance.id });
});

const DETAIL_FIELDS = ['user_name', 'user_phone', 'state', 'district', 'pincode', 'address', 'landmark'];
// deno-lint-ignore no-explicit-any
const pickDetails = (body: any) => Object.fromEntries(DETAIL_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

app.patch('/grievance/:id/details', auth, async (c) => {
  const grievance = await ownGrievance(c, c.req.param('id')!);
  if (grievance instanceof Response) return grievance;
  must(await db.from('grievances').update(pickDetails(await c.req.json())).eq('id', grievance.id));
  return c.json({ success: true });
});

app.post('/grievance/submit', auth, async (c) => {
  const body = await c.req.json();
  const grievance = await ownGrievance(c, body.grievance_id);
  if (grievance instanceof Response) return grievance;

  const category = grievance.category || 'other';
  const [address, nearby_offices] = await Promise.all([
    // Only spend a Gemini call when the address isn't already plain ASCII/English.
    /[^\x00-\x7F]/.test(body.address ?? '') ? translateText(body.address, 'English') : body.address,
    locateNearbyOffices(category, body.district, body.state),
  ]);
  const { portalLinks, procedureSteps, expectedResolutionDays } = getPortalsForCategory(category, body.state);

  must(await db.from('grievances').update({
    ...pickDetails(body),
    address,
    portal_links: portalLinks,
    nearby_offices,
    procedure_steps: procedureSteps,
    expected_resolution_days: expectedResolutionDays,
  }).eq('id', grievance.id));

  return c.json({
    grievance_id: grievance.id,
    nearby_offices,
    portal_links: portalLinks,
    procedure_steps: procedureSteps,
    expected_resolution_days: expectedResolutionDays,
  });
});

app.get('/grievance/recent', auth, async (c) => {
  const rows = must(await db.from('grievances')
    .select('*, ai_analysis:ai_analyses(*)')
    .eq('user_id', c.get('user').userId)
    .not('status', 'in', '(pending,processing)')
    .neq('state', '')
    .order('submitted_at', { ascending: false }));
  return c.json({ grievances: rows.map(withId) });
});

app.delete('/grievance/:id', auth, async (c) => {
  const grievance = await ownGrievance(c, c.req.param('id')!);
  if (grievance instanceof Response) return grievance;
  if (['open', 'in_progress', 'resolved', 'closed'].includes(grievance.status)) {
    return c.json({ message: 'Cannot delete a submitted grievance' }, 400);
  }
  const files = [grievance.image_url, grievance.audio_url].filter(Boolean);
  if (files.length) await db.storage.from(BUCKET).remove(files);
  must(await db.from('grievances').delete().eq('id', grievance.id)); // cascades to analysis + timeline
  return c.json({ success: true, message: 'Grievance discarded' });
});

app.get('/grievance/:id', auth, async (c) => {
  const grievance = await ownGrievance(c, c.req.param('id')!);
  if (grievance instanceof Response) return grievance;
  return c.json(await grievanceWithDetails(grievance.id));
});

app.post('/grievance/:id/translate-analysis', auth, async (c) => {
  const { target_lang, summary, category, steps, offices } = await c.req.json();
  const translated = await translateAnalysis({ summary, category, steps: steps ?? [], offices: offices ?? [] }, target_lang);
  return c.json({ success: true, translated });
});

// Called when the citizen clicks Yes/No from the resolution email link.
app.post('/grievance/:id/feedback', auth, async (c) => {
  const { result } = await c.req.json();
  if (!['resolved', 'not_resolved'].includes(result)) {
    return c.json({ message: 'result must be "resolved" or "not_resolved"' }, 400);
  }
  const grievance = await ownGrievance(c, c.req.param('id')!);
  if (grievance instanceof Response) return grievance;

  const resolved = result === 'resolved';
  const status = resolved ? 'closed' : ['resolved', 'closed'].includes(grievance.status) ? 'in_progress' : grievance.status;
  must(await db.from('grievances').update({
    citizen_feedback: result,
    status,
    ...(resolved && { resolved_at: grievance.resolved_at ?? new Date().toISOString() }),
  }).eq('id', grievance.id));
  await addStatusUpdate(grievance.id, grievance.status, status, 'citizen_feedback',
    resolved ? 'Citizen confirmed: issue is resolved.' : 'Citizen reported: issue is NOT resolved. Needs further attention.');

  return c.json({ success: true, result, status });
});

// ─── Admin / authority ────────────────────────────────────────────
app.use('/admin/*', auth, requireAdmin);

const SORTABLE = ['submitted_at', 'resolved_at', 'status', 'category', 'title'];

app.get('/admin/grievances', async (c) => {
  const { page = '1', limit = '20', status, category, language, sort_by = 'submitted_at', sort_order = 'desc' } = c.req.query();
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  let query = db.from('grievances').select('*, ai_analysis:ai_analyses(*)', { count: 'exact' });
  if (status) query = query.eq('status', status);
  if (category) query = query.eq('category', category);
  if (language) query = query.eq('original_language', language);
  const { data, count, error } = await query
    .order(SORTABLE.includes(sort_by) ? sort_by : 'submitted_at', { ascending: sort_order === 'asc' })
    .range((pageNum - 1) * limitNum, pageNum * limitNum - 1);
  if (error) throw new Error(error.message);

  return c.json({
    grievances: data.map(withId),
    pagination: {
      current_page: pageNum,
      total_pages: Math.ceil((count ?? 0) / limitNum),
      total_count: count ?? 0,
      per_page: limitNum,
    },
  });
});

app.get('/admin/grievance/:id', async (c) => {
  const details = await grievanceWithDetails(c.req.param('id')!);
  return details ? c.json(details) : c.json({ message: 'Grievance not found' }, 404);
});

app.put('/admin/grievance/:id/status', async (c) => {
  const { status, remark } = await c.req.json();
  if (!status) return c.json({ message: 'status is required' }, 400);
  if (!STATUSES.includes(status)) return c.json({ message: `Invalid status. Must be one of: ${STATUSES.join(', ')}` }, 400);

  const grievance = must(await db.from('grievances').select('id, status').eq('id', c.req.param('id')!).maybeSingle());
  if (!grievance) return c.json({ message: 'Grievance not found' }, 404);

  must(await db.from('grievances').update({
    status,
    ...(status === 'resolved' && { resolved_at: new Date().toISOString() }),
  }).eq('id', grievance.id));
  await addStatusUpdate(grievance.id, grievance.status, status, c.get('user').email, remark || '');

  return c.json({
    message: `Status updated from '${grievance.status}' to '${status}'`,
    grievance_id: grievance.id,
    old_status: grievance.status,
    new_status: status,
  });
});

app.put('/admin/grievance/:id/assign', async (c) => {
  const { assigned_to } = await c.req.json();
  if (!assigned_to) return c.json({ message: 'assigned_to is required' }, 400);

  const grievance = must(await db.from('grievances').select('id, status, assigned_to').eq('id', c.req.param('id')!).maybeSingle());
  if (!grievance) return c.json({ message: 'Grievance not found' }, 404);

  const status = grievance.status === 'open' ? 'in_progress' : grievance.status;
  must(await db.from('grievances').update({ assigned_to, status }).eq('id', grievance.id));
  await addStatusUpdate(grievance.id, grievance.status, status, c.get('user').email,
    `Assigned to ${assigned_to} (was: ${grievance.assigned_to || 'unassigned'})`);

  return c.json({ message: `Grievance assigned to '${assigned_to}'`, grievance_id: grievance.id, assigned_to, status });
});

app.get('/admin/stats', async (c) => {
  // ponytail: aggregates in JS over every row; move to a SQL view once grievances run into the thousands.
  const rows = must(await db.from('grievances').select('status, category, original_language, submitted_at, resolved_at'));
  const resolved = rows.filter((g) => g.status === 'resolved' && g.resolved_at);
  const totalHours = resolved.reduce(
    (sum, g) => sum + (Date.parse(g.resolved_at!) - Date.parse(g.submitted_at)) / 36e5, 0);

  return c.json({
    total: rows.length,
    by_status: countBy(rows, 'status'),
    by_category: countBy(rows, 'category'),
    by_language: countBy(rows, 'original_language'),
    avg_resolution_hours: resolved.length ? Math.round((totalHours / resolved.length) * 10) / 10 : 0,
    resolved_count: resolved.length,
  });
});

app.get('/admin/ai-insights', async (c) => {
  const [analyses, grievances] = await Promise.all([
    db.from('ai_analyses').select('confidence_score, llm_category').then(must),
    db.from('grievances').select('portal_links').not('portal_links', 'is', null).then(must),
  ]);
  const avg = analyses.length ? analyses.reduce((s, a) => s + (a.confidence_score ?? 0), 0) / analyses.length : 0;
  return c.json({
    total_ai_analyses: analyses.length,
    avg_confidence: avg,
    categories_analyzed: new Set(analyses.map((a) => a.llm_category).filter(Boolean)).size,
    portals_found: grievances.reduce((s, g) => s + (Array.isArray(g.portal_links) ? g.portal_links.length : 0), 0),
  });
});

// Called by the frontend after an admin resolves: translate the remark and email the citizen.
app.post('/admin/grievance/:id/notify-citizen', async (c) => {
  const { remark } = await c.req.json();
  const grievance = must(await db.from('grievances')
    .select('*, ai_analysis:ai_analyses(detected_language), profile:profiles(email)')
    .eq('id', c.req.param('id')!).maybeSingle());
  if (!grievance) return c.json({ message: 'Grievance not found' }, 404);
  if (!grievance.profile?.email) return c.json({ message: 'No citizen email on record, skipping.' });

  const lang = grievance.ai_analysis?.detected_language || grievance.original_language || 'en-IN';
  const translatedRemark = remark && !lang.startsWith('en') ? await translateText(remark, lang) : remark;

  await sendResolutionEmail(grievance.profile.email, grievance.id, grievance.category || 'General',
    grievance.title || 'Your Grievance', remark, translatedRemark, lang);
  return c.json({ message: 'Resolution email sent successfully.' });
});

// ─── Daily follow-up job (triggered by pg_cron) ───────────────────
// Deliberately unauthenticated: it's idempotent and only emails citizens whose
// grievance is past its expected resolution date, once (follow_up_sent).
app.post('/cron/follow-up', async (c) => {
  const rows = must(await db.from('grievances')
    .select('id, category, title, submitted_at, profile:profiles(email)')
    .in('status', ['open', 'in_progress'])
    .eq('follow_up_sent', false));

  let sent = 0;
  for (const g of rows) {
    const days: Record<string, number> = RESOLUTION_DAYS;
    const expectedDays = days[g.category ?? 'other'] ?? days.other;
    // deno-lint-ignore no-explicit-any
    const email = (g.profile as any)?.email;
    if (!email || (Date.now() - Date.parse(g.submitted_at)) / 864e5 < expectedDays) continue;
    try {
      const info = await sendFollowUpEmail(email, g.id, g.category || 'general', g.title || 'Your grievance');
      if (info.messageId === 'skipped') break; // mail not configured; leave flags for when it is
      await db.from('grievances').update({ follow_up_sent: true }).eq('id', g.id);
      sent++;
    } catch (err) {
      console.error(`❌ [CRON] Failed to email for grievance ${g.id}:`, (err as Error).message);
    }
  }
  console.log(`✅ [CRON] Daily follow-up complete. Emails sent: ${sent}`);
  return c.json({ checked: rows.length, sent });
});

Deno.serve(app.fetch);
