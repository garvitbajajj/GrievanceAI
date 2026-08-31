import mongoose from 'mongoose';

const aiAnalysisSchema = new mongoose.Schema({
  grievance_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grievance',
    required: true,
    unique: true
  },
  english_summary: { type: String },
  verification_sentence: { type: String },
  detected_language: { type: String },
  ocr_raw_text: { type: String },
  stt_transcript: { type: String },
  llm_category: { type: String },
  keywords: [{ type: String }],
  confidence_score: { type: Number, min: 0, max: 1 },
  processing_ms: { type: Number },
  processed_at: { type: Date, default: Date.now }
});

export default mongoose.model('AiAnalysis', aiAnalysisSchema);
