import mongoose from 'mongoose';

const statusUpdateSchema = new mongoose.Schema({
  grievance_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grievance',
    required: true
  },
  old_status: { type: String, required: true },
  new_status: { type: String, required: true },
  changed_by: { type: String, required: true },
  remark: { type: String },
  updated_at: { type: Date, default: Date.now }
});

export default mongoose.model('StatusUpdate', statusUpdateSchema);
