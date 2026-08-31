import mongoose from 'mongoose';

const grievanceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String },
  original_text: { type: String },
  original_language: { type: String },
  input_type: {
    type: String,
    enum: ['text', 'image', 'audio', 'text+image', 'text+audio', 'image+audio', 'text+image+audio']
  },
  image_url: { type: String },
  audio_url: { type: String },
  status: {
    type: String,
    enum: ['pending', 'processing', 'open', 'in_progress', 'resolved', 'closed'],
    default: 'pending'
  },
  category: {
    type: String,
    enum: [
      'cybercrime', 'telecom_fraud', 'human_rights', 'corruption',
      'consumer_rights', 'banking', 'stock_market', 'insurance',
      'telecom', 'railways', 'airlines', 'road_transport',
      'real_estate', 'sanitation', 'food_safety', 'medicines',
      'health_schemes', 'environment', 'aadhaar', 'passport',
      'income_tax', 'provident_fund', 'pensions', 'postal_services',
      'rti', 'electricity_water', 'national_general', 'state_general', 'other'
    ]
  },
  assigned_to: { type: String },
  user_name: { type: String },
  user_phone: { type: String },
  state: { type: String },
  district: { type: String },
  pincode: { type: String },
  address: { type: String },
  landmark: { type: String },
  portal_links: { type: mongoose.Schema.Types.Mixed, default: null },
  nearby_offices: { type: [mongoose.Schema.Types.Mixed], default: [] },
  procedure_steps: { type: [String], default: [] },
  expected_resolution_days: { type: Number, default: null },
  follow_up_sent: { type: Boolean, default: false },
  // citizen_feedback: set when citizen clicks Yes/No in resolution email
  citizen_feedback: {
    type: String,
    enum: ['resolved', 'not_resolved', null],
    default: null
  },
  submitted_at: { type: Date, default: Date.now },
  resolved_at: { type: Date }
});

export default mongoose.model('Grievance', grievanceSchema);
