// End-to-end smoke test of the deployed `api` function.
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/smoke.mjs
// Creates a throwaway citizen; set SUPABASE_SERVICE_ROLE_KEY too to delete it afterwards.
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = `${URL_}/functions/v1/api`;
const email = `smoke-${Date.now()}@example.com`, password = 'smoke-test-123';
const j = async (r) => ({ status: r.status, body: await r.json().catch(() => null) });
const assert = (c, m) => { if (!c) { throw new Error('FAIL: ' + m); } console.log('ok -', m); };

let r = await j(await fetch(API)); assert(r.status === 200 && r.body.status === 'online', 'health');
r = await j(await fetch(`${API}/public/stats`)); assert(r.status === 200 && 'total' in r.body, 'public stats');
r = await j(await fetch(`${API}/grievance/recent`)); assert(r.status === 401, 'protected route rejects no token');
r = await j(await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Smoke Test', email, password }) }));
assert(r.status === 201, 'register ' + JSON.stringify(r.body));
r = await j(await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }));
assert(r.status === 200, 'login'); const userId = r.body.user.id; const H = { Authorization: `Bearer ${r.body.access_token}` };
r = await j(await fetch(`${API}/auth/profile`, { headers: H })); assert(r.body.user?.role === 'citizen' && r.body.user.name === 'Smoke Test', 'profile via trigger');
const fd = new FormData(); fd.append('text', 'मेरे मोहल्ले में तीन दिन से पानी नहीं आ रहा है, कृपया मदद करें।');
r = await j(await fetch(`${API}/grievance/ingest`, { method: 'POST', headers: H, body: fd }));
console.log('   ingest ->', JSON.stringify(r.body));
assert(r.status === 200 && r.body.grievance_id, 'ingest'); const id = r.body.grievance_id;
r = await j(await fetch(`${API}/grievance/confirm`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ grievance_id: id, confirmed: true }) }));
assert(r.body.success, 'confirm');
r = await j(await fetch(`${API}/grievance/submit`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ grievance_id: id, user_name: 'Smoke', user_phone: '9999999999', state: 'Delhi', district: 'South Delhi', pincode: '110017', address: 'Saket', landmark: '' }) }));
console.log('   submit ->', JSON.stringify(r.body).slice(0, 300));
assert(r.status === 200 && r.body.portal_links?.length, 'submit + portal routing');
r = await j(await fetch(`${API}/grievance/recent`, { headers: H })); assert(r.body.grievances?.[0]?._id === id && r.body.grievances[0].ai_analysis, 'recent (with _id + ai_analysis)');
r = await j(await fetch(`${API}/grievance/${id}`, { headers: H })); assert(r.body.status_timeline?.length === 1, 'detail + timeline');
r = await j(await fetch(`${API}/admin/stats`, { headers: H })); assert(r.status === 403, 'citizen blocked from admin');
if (SERVICE) {
  await fetch(`${URL_}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
  console.log('cleaned up', email);
} else {
  console.log('left test user', email);
}
