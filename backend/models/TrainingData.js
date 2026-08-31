import mongoose from 'mongoose';

const trainingDataSchema = new mongoose.Schema({
  original_text: { type: String, required: true },
  detected_language: { type: String, required: true },
  english_text: { type: String, required: true },
  confirmed_category: { type: String, required: true },
  confirmed_at: { type: Date, default: Date.now }
});

export default mongoose.model('TrainingData', trainingDataSchema);
