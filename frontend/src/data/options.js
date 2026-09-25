/**
 * GrievanceAI — shared dropdown options.
 * CATEGORIES mirrors the enum the AI classifies into (supabase/functions/api/gemini.ts).
 */
export const CATEGORIES = [
  ['cybercrime', 'Cybercrime'],
  ['telecom_fraud', 'Telecom Fraud'],
  ['human_rights', 'Human Rights'],
  ['corruption', 'Corruption'],
  ['consumer_rights', 'Consumer Rights'],
  ['banking', 'Banking'],
  ['stock_market', 'Stock Market'],
  ['insurance', 'Insurance'],
  ['telecom', 'Telecom & Internet'],
  ['railways', 'Railways'],
  ['airlines', 'Airlines'],
  ['road_transport', 'Road Transport'],
  ['real_estate', 'Real Estate'],
  ['sanitation', 'Sanitation'],
  ['food_safety', 'Food Safety'],
  ['medicines', 'Medicines'],
  ['health_schemes', 'Health Schemes'],
  ['environment', 'Environment'],
  ['aadhaar', 'Aadhaar'],
  ['passport', 'Passport'],
  ['income_tax', 'Income Tax'],
  ['provident_fund', 'Provident Fund'],
  ['pensions', 'Pensions'],
  ['postal_services', 'Postal Services'],
  ['rti', 'RTI'],
  ['electricity_water', 'Electricity & Water'],
  ['national_general', 'National (General)'],
  ['state_general', 'State (General)'],
  ['other', 'Other'],
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES);
export const categoryLabel = (id) => CATEGORY_LABELS[id] || 'General';

export const STATUSES = [
  ['pending', 'Pending'],
  ['processing', 'Processing'],
  ['open', 'Open'],
  ['in_progress', 'In Progress'],
  ['resolved', 'Resolved'],
  ['closed', 'Closed'],
];

// BCP-47 codes as detected by Gemini (grievances.original_language).
export const LANGUAGES = [
  ['en-IN', 'English'],
  ['hi-IN', 'Hindi'],
  ['bn-IN', 'Bengali'],
  ['ta-IN', 'Tamil'],
  ['te-IN', 'Telugu'],
  ['mr-IN', 'Marathi'],
  ['gu-IN', 'Gujarati'],
  ['kn-IN', 'Kannada'],
  ['ml-IN', 'Malayalam'],
  ['pa-IN', 'Punjabi'],
  ['od-IN', 'Odia'],
  ['ur-IN', 'Urdu'],
];
