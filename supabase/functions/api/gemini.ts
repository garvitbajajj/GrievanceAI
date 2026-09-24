/**
 * GrievanceAI — Gemini client (replaces the old Python/FastAPI AI engine).
 *
 * Gemini is multimodal, so one call does OCR (image/PDF), speech-to-text
 * (audio), translation to English and classification. Every helper walks
 * GEMINI_MODELS in order, moving on when a model is missing (404),
 * rate-limited (429) or erroring (5xx), so a free-tier quota running out on
 * one model doesn't take the app down.
 */
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

const API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODELS = (Deno.env.get('GEMINI_MODELS') ?? 'gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash')
  .split(',').map((m) => m.trim()).filter(Boolean);

export const CATEGORIES = [
  'cybercrime', 'telecom_fraud', 'human_rights', 'corruption',
  'consumer_rights', 'banking', 'stock_market', 'insurance',
  'telecom', 'railways', 'airlines', 'road_transport',
  'real_estate', 'sanitation', 'food_safety', 'medicines',
  'health_schemes', 'environment', 'aadhaar', 'passport',
  'income_tax', 'provident_fund', 'pensions', 'postal_services',
  'rti', 'electricity_water', 'national_general', 'state_general', 'other',
];

// deno-lint-ignore no-explicit-any
type Part = Record<string, any>;

async function generate(parts: Part[], schema: object, temperature = 0.2, system?: string) {
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not set');
  let lastError = '';
  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
          body: JSON.stringify({
            ...(system && { systemInstruction: { parts: [{ text: system }] } }),
            contents: [{ role: 'user', parts }],
            generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature },
          }),
          signal: AbortSignal.timeout(45_000),
        },
      );
      if (!res.ok) {
        lastError = `${model}: ${res.status} ${(await res.text()).slice(0, 300)}`;
        console.warn('Gemini failed, trying next model —', lastError);
        continue;
      }
      const data = await res.json();
      // deno-lint-ignore no-explicit-any
      const text = (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('');
      return JSON.parse(text);
    } catch (err) {
      lastError = `${model}: ${err instanceof Error ? err.message : err}`;
      console.warn('Gemini error, trying next model —', lastError);
    }
  }
  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}

const fileToPart = async (file: File) => ({
  inline_data: { mime_type: file.type, data: encodeBase64(new Uint8Array(await file.arrayBuffer())) },
});

const S = (description?: string) => ({ type: 'STRING', ...(description && { description }) });

const ANALYSIS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    original_text: S('The full complaint in its original language and script: audio transcript, then text read from the attachment, then the typed text'),
    detected_language: S('BCP-47 code of the complaint language, e.g. hi-IN, ta-IN, bn-IN, en-IN'),
    english_text: S('Faithful English translation of original_text'),
    stt_transcript: S('Verbatim transcript of the audio, or empty string if there is no audio'),
    ocr_raw_text: S('Verbatim text read from the attachment, or empty string if there is no attachment'),
    title: S('8-word English title summarizing the issue'),
    english_summary: S('2-3 sentence English summary for the admin dashboard'),
    verification_sentence: S('Short yes/no question, under 10 words, written in the complaint language and script, confirming the issue type'),
    category: { type: 'STRING', enum: CATEGORIES },
    keywords: { type: 'ARRAY', items: S(), description: '3 to 5 key terms from the complaint' },
    confidence_score: { type: 'NUMBER', description: 'Confidence between 0.70 and 0.99' },
  },
  required: ['original_text', 'detected_language', 'english_text', 'stt_transcript', 'ocr_raw_text', 'title',
    'english_summary', 'verification_sentence', 'category', 'keywords', 'confidence_score'],
};

const ANALYSIS_PROMPT = `Analyze this citizen grievance submitted to an Indian government grievance portal.
The complaint may be typed text, a voice recording, an attached image/PDF, or any mix of them, in any Indian language.
Read and transcribe everything, translate it to English, then classify it.

Categories guide:
- cybercrime: Online scam, hacking, phishing, financial cyber fraud
- telecom_fraud: Stolen mobile, proxy SIM, fake caller ID, telecom fraud
- human_rights: Police brutality, illegal detention, human rights violations
- corruption: Bribery demands, corrupt government officials (Lokpal)
- consumer_rights: Product quality issues, e-commerce disputes, misleading ads
- banking: Bank branch issues, ATM failures, RBI complaints
- stock_market: Trading issues, SEBI rules, mutual funds
- insurance: Denied claims, fake policies, IRDAI
- telecom: Network outage, broadband issues, DTH complaints (TRAI)
- railways: Train delays, station cleanliness, IRCTC issues
- airlines: Flight delays, lost baggage, airline complaints
- road_transport: RTO, driving license, bus services, Parivahan
- real_estate: Property disputes, builder delays, RERA
- sanitation: Garbage dumping, street cleaning, local municipal issues
- food_safety: Adulterated food, restaurant hygiene (FSSAI)
- medicines: Fake drugs, pharmacy complaints (CDSCO)
- health_schemes: Ayushman Bharat, govt hospital issues
- environment: Pollution, noise, illegal logging, CPCB
- aadhaar: UIDAI update issues, fingerprint mismatch
- passport: Passport delays, police verification issues
- income_tax: ITR refunds, PAN card issues
- provident_fund: PF withdrawal delays, UAN issues (EPFO)
- pensions: Pension stoppages, life certificate issues
- postal_services: Missing parcels, India Post delays
- rti: Right to Information appeals
- electricity_water: Power cuts, high bills, lack of water supply
- national_general: Central government policies, PMO, generic national
- state_general: State CM issues, generic district administration
- other: Any uncategorized issue

IMPORTANT: verification_sentence MUST be written in the complaint's own language and script.
Do NOT use Hindi unless the complaint is in Hindi. Examples:
- Bengali: 'এটা কি পানির সমস্যা?'
- Tamil: 'இது தண்ணீர் பிரச்சனையா?'
- Hindi: 'क्या यह पानी की समस्या है?'
- Marathi: 'हा पाण्याचा प्रश्न आहे का?'
- Telugu: 'ఇది నీటి సమస్యా?'`;

// Keyword classifier used when Gemini is down; only possible for typed text.
function fallbackAnalysis(text: string) {
  const lower = text.toLowerCase();
  const rules: Record<string, string[]> = {
    electricity_water: ['electricity', 'power cut', 'water', 'bill', 'supply', 'बिजली', 'पानी'],
    sanitation: ['garbage', 'drain', 'sewage', 'cleaning', 'waste', 'कचरा'],
    banking: ['bank', 'atm', 'upi', 'account', 'transaction'],
    cybercrime: ['scam', 'fraud', 'phishing', 'hacked', 'otp'],
    road_transport: ['road', 'bus', 'rto', 'license', 'traffic', 'सड़क'],
    railways: ['train', 'railway', 'irctc', 'station'],
    health_schemes: ['hospital', 'doctor', 'ayushman', 'medical'],
    passport: ['passport', 'police verification'],
    aadhaar: ['aadhaar', 'uidai'],
    postal_services: ['parcel', 'post office', 'speed post'],
  };
  let category = 'other';
  let keywords: string[] = [];
  for (const [cat, words] of Object.entries(rules)) {
    const hits = words.filter((w) => lower.includes(w));
    if (hits.length) { category = cat; keywords = hits.slice(0, 5); break; }
  }
  return {
    original_text: text,
    detected_language: /[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-IN',
    english_text: text,
    stt_transcript: '',
    ocr_raw_text: '',
    title: text.slice(0, 60).trim(),
    english_summary: text,
    verification_sentence: 'Is this information correct?',
    category,
    keywords,
    confidence_score: 0.5,
  };
}

/** Full grievance pipeline. Throws only when there is no typed text to fall back on. */
export async function analyzeGrievance({ text, image, audio }: { text: string; image?: File | null; audio?: File | null }) {
  const parts: Part[] = [{ text: ANALYSIS_PROMPT }];
  if (audio) parts.push({ text: 'Voice complaint (audio):' }, await fileToPart(audio));
  if (image) parts.push({ text: 'Attached document/image:' }, await fileToPart(image));
  if (text) parts.push({ text: `Typed complaint:\n${text}` });

  try {
    const result = await generate(parts, ANALYSIS_SCHEMA, 0.2,
      'You are an AI assistant for GrievanceAI, an Indian citizen grievance portal. Analyze complaints and extract structured data.');
    if (!CATEGORIES.includes(result.category)) result.category = 'other';
    result.confidence_score = Math.min(1, Math.max(0, Number(result.confidence_score) || 0));
    return result;
  } catch (err) {
    if (!text) throw err;
    console.warn('Gemini unavailable — using keyword fallback:', (err as Error).message);
    return fallbackAnalysis(text);
  }
}

export async function locateNearbyOffices(category: string, district: string, state: string) {
  const prompt = `Identify 3 to 4 specific government offices, authorities, or centers that handle '${category}' grievances.

CRITICAL LOCATION CONSTRAINT:
- District: ${district}
- State: ${state}
- Country: India

You MUST return offices located specifically in ${district} district of ${state} state.
Do NOT return offices from Delhi, New Delhi, or any other city unless the user's state IS Delhi.
Name them with their full address including the district name.
Provide realistic approximate latitude and longitude coordinates for these offices within ${district}, ${state}.`;
  const schema = {
    type: 'OBJECT',
    properties: {
      offices: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { name: S('Name of the government office'), lat: { type: 'NUMBER' }, lng: { type: 'NUMBER' } },
          required: ['name', 'lat', 'lng'],
        },
      },
    },
    required: ['offices'],
  };
  try {
    return (await generate([{ text: prompt }], schema, 0.3)).offices ?? [];
  } catch (err) {
    console.warn('Nearby offices lookup failed:', (err as Error).message);
    return [];
  }
}

/** Translate free text; returns the input unchanged if Gemini is unavailable. */
export async function translateText(text: string, targetLanguage: string) {
  if (!text?.trim()) return text;
  try {
    const out = await generate(
      [{ text: `Translate the following text into ${targetLanguage}. Keep names, numbers and addresses intact.\n\n${text}` }],
      { type: 'OBJECT', properties: { translated_text: S() }, required: ['translated_text'] },
      0.1,
    );
    return out.translated_text || text;
  } catch (err) {
    console.warn('Translation failed:', (err as Error).message);
    return text;
  }
}

export async function translateAnalysis(
  data: { summary: string; category: string; steps: string[]; offices: string[] },
  targetLang: string,
) {
  const prompt = `Translate the following Indian government grievance analysis data into ${targetLang}.
Ensure the tone is official and helpful.

Data to translate:
- Summary: ${data.summary ?? ''}
- Category: ${data.category ?? ''}
- Next Steps: ${(data.steps ?? []).join(' | ')}
- Offices: ${(data.offices ?? []).join(' | ')}`;
  const schema = {
    type: 'OBJECT',
    properties: {
      summary: S('Translated summary'),
      category: S('Translated category name'),
      steps: { type: 'ARRAY', items: S(), description: 'Translated procedure steps, same order' },
      offices: { type: 'ARRAY', items: S(), description: 'Translated office names, same order' },
    },
    required: ['summary', 'category', 'steps', 'offices'],
  };
  try {
    return await generate([{ text: prompt }], schema, 0.1);
  } catch (err) {
    console.warn('Analysis translation failed:', (err as Error).message);
    return data;
  }
}
