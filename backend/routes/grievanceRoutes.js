import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import auth from '../middleware/auth.js';
import { uploadCombined } from '../middleware/upload.js';
import Grievance from '../models/Grievance.js';
import AiAnalysis from '../models/AiAnalysis.js';
import StatusUpdate from '../models/StatusUpdate.js';
import TrainingData from '../models/TrainingData.js';
import { getPortalsForCategory } from '../utils/portalData.js';

const router = express.Router();
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://ai-engine:8000';

// ─── POST /api/grievance/ingest ─────────────────────────────────
router.post('/ingest', auth, uploadCombined.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]), (req, res) => {
  const inputTypes = [];
  if (req.body.text?.trim()) inputTypes.push('text');
  if (req.files?.['image']?.[0]) inputTypes.push('image');
  if (req.files?.['audio']?.[0]) inputTypes.push('audio');
  const inputType = inputTypes.length ? inputTypes.join('+') : 'text';
  return processIngest(req, res, inputType);
});

async function processIngest(req, res, inputType) {
  try {
    const grievanceData = {
      user_id: req.user.userId,
      status: 'processing',
      input_type: inputType,
    };
    const imageFile = req.files?.['image']?.[0];
    const audioFile = req.files?.['audio']?.[0];
    if (imageFile) grievanceData.image_url = imageFile.path;
    if (audioFile) grievanceData.audio_url = audioFile.path;

    const grievance = new Grievance(grievanceData);
    await grievance.save();

    const formData = new FormData();
    formData.append('grievance_id', grievance._id.toString());

    if (req.body.text?.trim()) {
      formData.append('text', req.body.text || '');
    }

    if (imageFile) {
      formData.append('image', fs.createReadStream(imageFile.path), {
        filename: imageFile.originalname,
        contentType: imageFile.mimetype,
      });
    }

    if (audioFile) {
      formData.append('audio', fs.createReadStream(audioFile.path), {
        filename: audioFile.originalname,
        contentType: audioFile.mimetype,
      });
    }

    let aiResponse;
    try {
      aiResponse = await axios.post(
        `${AI_ENGINE_URL}/process-grievance-full`,
        formData,
        { headers: formData.getHeaders(), timeout: 180000 }
      );
    } catch (aiErr) {
      grievance.status = 'pending';
      await grievance.save();
      const status = aiErr.response?.status || 503;
      return res.status(status).json({
        message: aiErr.response?.data?.detail || 'AI Engine unavailable. Your grievance was saved.',
        grievance_id: grievance._id,
        error: status < 500 ? 'AI_ENGINE_REJECTED_INPUT' : 'AI_ENGINE_UNAVAILABLE',
      });
    }

    const aiData = aiResponse.data;
    const aiAnalysis = new AiAnalysis({
      grievance_id: grievance._id,
      english_summary: aiData.english_summary || aiData.english_text || '',
      verification_sentence: aiData.verification_sentence || '',
      detected_language: aiData.detected_language || 'en-IN',
      ocr_raw_text: aiData.ocr_raw_text || '',
      stt_transcript: aiData.stt_transcript || '',
      llm_category: aiData.category || '',
      keywords: aiData.keywords || [],
      confidence_score: aiData.confidence_score || 0,
      processing_ms: aiData.processing_ms || 0,
    });
    await aiAnalysis.save();

    grievance.title = (aiData.title || aiData.english_summary || aiData.english_text || 'Untitled Grievance').substring(0, 80);
    grievance.original_text = aiData.original_text || req.body.text || '';
    grievance.original_language = aiData.detected_language || 'en-IN';
    grievance.category = aiData.category || 'other';
    grievance.status = 'pending';
    await grievance.save();

    res.status(200).json({
      grievance_id: grievance._id,
      verification_sentence: aiData.verification_sentence || '',
      detected_language: aiData.detected_language || 'en-IN',
      category: aiData.category || 'other',
      keywords: aiData.keywords || [],
      english_summary: aiData.english_summary || aiData.english_text || '',
      original_text: grievance.original_text || '',
      confidence_score: aiData.confidence_score || 0,
    });
  } catch (error) {
    console.error('❌ Ingest error:', error.message);
    res.status(500).json({ message: 'Failed to process grievance', error: error.message });
  }
}

// ─── POST /api/grievance/confirm ────────────────────────────────
router.post('/confirm', auth, async (req, res) => {
  try {
    const { grievance_id, confirmed } = req.body;
    const grievance = await Grievance.findById(grievance_id);
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });
    if (grievance.user_id.toString() !== req.user.userId) return res.status(403).json({ message: 'Not authorized' });

    if (confirmed === false || confirmed === 'false') {
      grievance.status = 'pending';
      await grievance.save();
      return res.status(200).json({ retry: true, message: 'Grievance reset for reprocessing' });
    }

    const oldStatus = grievance.status;
    grievance.status = 'open';
    await grievance.save();

    await StatusUpdate.create({
      grievance_id: grievance._id,
      old_status: oldStatus,
      new_status: 'open',
      changed_by: 'citizen',
      remark: 'Citizen confirmed AI understanding',
    });

    const aiAnalysis = await AiAnalysis.findOne({ grievance_id: grievance._id });
    if (aiAnalysis) {
      await TrainingData.create({
        original_text: grievance.original_text || '',
        detected_language: aiAnalysis.detected_language || 'en-IN',
        english_text: aiAnalysis.english_summary || '',
        confirmed_category: grievance.category || 'other',
      });
    }
    res.status(200).json({ success: true, grievance_id: grievance._id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to confirm grievance', error: error.message });
  }
});

// ─── PATCH /api/grievance/:id/details ───────────────────────────
router.patch('/:id/details', auth, async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance || grievance.user_id.toString() !== req.user.userId) return res.status(403).json({ message: 'Unauthorized' });

    const fields = ['user_name', 'user_phone', 'state', 'district', 'pincode', 'address', 'landmark'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) grievance[field] = req.body[field];
    });

    await grievance.save();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save details', error: error.message });
  }
});

// ─── POST /api/grievance/submit ─────────────────────────────────
router.post('/submit', auth, async (req, res) => {
  try {
    const { grievance_id, user_name, user_phone, state, district, pincode, address, landmark } = req.body;
    const grievance = await Grievance.findById(grievance_id);
    if (!grievance || grievance.user_id.toString() !== req.user.userId) return res.status(403).json({ message: 'Unauthorized' });

    let translatedAddress = address;
    try {
      const tr = await axios.post(`${AI_ENGINE_URL}/translate`, { text: address, source_language_code: 'auto', target_language_code: 'en-IN' }, { timeout: 15000 });
      translatedAddress = tr.data.translated_text || address;
    } catch (e) { console.warn('Address translation failed'); }

    grievance.user_name = user_name;
    grievance.user_phone = user_phone;
    grievance.state = state;
    grievance.district = district;
    grievance.pincode = pincode;
    grievance.address = translatedAddress;
    grievance.landmark = landmark;

    let nearbyOffices = [];
    try {
      const nomFormData = new FormData();
      nomFormData.append('category', grievance.category || 'other');
      nomFormData.append('district', district);
      nomFormData.append('state', state);

      const aiResponse = await axios.post(`${AI_ENGINE_URL}/nearby-offices`, nomFormData, {
        headers: nomFormData.getHeaders(),
        timeout: 20000
      });
      nearbyOffices = aiResponse.data.offices || [];
    } catch (e) {
      console.warn('AI Engine nearby offices failed:', e.message);
    }

    const { portalLinks, procedureSteps, expectedResolutionDays } = getPortalsForCategory(grievance.category || 'other', state);
    grievance.portal_links = portalLinks;
    grievance.nearby_offices = nearbyOffices;
    grievance.procedure_steps = procedureSteps;
    grievance.expected_resolution_days = expectedResolutionDays;
    await grievance.save();

    res.status(200).json({ grievance_id: grievance._id, nearby_offices: nearbyOffices, portal_links: portalLinks, procedure_steps: procedureSteps, expected_resolution_days: expectedResolutionDays });
  } catch (error) {
    res.status(500).json({ message: 'Submit error', error: error.message });
  }
});

// ─── GET /api/grievance/recent ──────────────────────────────────
router.get('/recent', auth, async (req, res) => {
  try {
    const grievances = await Grievance.find({
      user_id: req.user.userId,
      status: { $nin: ['pending', 'processing'] },
      state: { $exists: true, $ne: '' }
    }).sort({ submitted_at: -1 });

    const analyses = await AiAnalysis.find({ grievance_id: { $in: grievances.map(g => g._id) } });
    const analysisMap = {};
    analyses.forEach(a => analysisMap[a.grievance_id.toString()] = a);

    const result = grievances.map(g => ({ ...g.toObject(), ai_analysis: analysisMap[g._id.toString()] || null }));
    res.status(200).json({ grievances: result });
  } catch (error) {
    res.status(500).json({ message: 'Recent error', error: error.message });
  }
});

// ─── DELETE /api/grievance/:id ──────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance || grievance.user_id.toString() !== req.user.userId) return res.status(403).json({ message: 'Unauthorized' });

    if (['open', 'in_progress', 'resolved', 'closed'].includes(grievance.status)) {
      return res.status(400).json({ message: 'Cannot delete a submitted grievance' });
    }

    await AiAnalysis.deleteMany({ grievance_id: grievance._id });
    await StatusUpdate.deleteMany({ grievance_id: grievance._id });
    await TrainingData.deleteMany({ original_text: grievance.original_text });
    await grievance.deleteOne();

    res.status(200).json({ success: true, message: 'Grievance discarded' });
  } catch (error) {
    res.status(500).json({ message: 'Delete error', error: error.message });
  }
});

// ─── GET /api/grievance/:id ─────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance || grievance.user_id.toString() !== req.user.userId) return res.status(403).json({ message: 'Unauthorized' });

    const aiAnalysis = await AiAnalysis.findOne({ grievance_id: grievance._id });
    const statusTimeline = await StatusUpdate.find({ grievance_id: grievance._id }).sort({ updated_at: 1 });

    res.status(200).json({
      grievance: grievance.toObject(),
      ai_analysis: aiAnalysis || null,
      status_timeline: statusTimeline,
    });
  } catch (error) {
    res.status(500).json({ message: 'Fetch error', error: error.message });
  }
});

// ─── GET /api/grievance/:id/audio ───────────────────────────────
router.get('/:id/audio', auth, async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance || !grievance.audio_url) return res.status(404).send('Audio not found');
    const audioPath = path.resolve(grievance.audio_url);
    if (!fs.existsSync(audioPath)) return res.status(404).send('File missing');
    res.sendFile(audioPath);
  } catch (error) {
    res.status(500).send('Stream error');
  }
});

// ─── POST /api/grievance/:id/translate-analysis ─────────────
router.post('/:id/translate-analysis', auth, async (req, res) => {
  try {
    const { target_lang, summary, category, steps, offices } = req.body;
    
    const aiResponse = await axios.post(`${AI_ENGINE_URL}/translate-analysis`, {
      summary,
      category,
      steps,
      offices,
      target_lang
    });

    res.status(200).json(aiResponse.data);
  } catch (error) {
    console.error('❌ Translate Analysis error:', error.message);
    res.status(500).json({ message: 'Failed to translate analysis', error: error.message });
  }
});

// ─── POST /api/grievance/:id/feedback ───────────────────────────
// Called when citizen clicks Yes/No from resolution email link.
router.post('/:id/feedback', auth, async (req, res) => {
  try {
    const { result } = req.body;
    if (!['resolved', 'not_resolved'].includes(result)) {
      return res.status(400).json({ message: 'result must be "resolved" or "not_resolved"' });
    }

    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });

    grievance.citizen_feedback = result;

    if (result === 'resolved') {
      const oldStatus = grievance.status;
      grievance.status = 'closed';
      grievance.resolved_at = grievance.resolved_at || new Date();
      await grievance.save();
      await StatusUpdate.create({
        grievance_id: grievance._id,
        old_status: oldStatus,
        new_status: 'closed',
        changed_by: 'citizen_feedback',
        remark: 'Citizen confirmed: issue is resolved.',
      });
    } else {
      const oldStatus = grievance.status;
      if (grievance.status === 'resolved' || grievance.status === 'closed') {
        grievance.status = 'in_progress';
      }
      await grievance.save();
      await StatusUpdate.create({
        grievance_id: grievance._id,
        old_status: oldStatus,
        new_status: grievance.status,
        changed_by: 'citizen_feedback',
        remark: 'Citizen reported: issue is NOT resolved. Needs further attention.',
      });
    }

    res.status(200).json({ success: true, result, status: grievance.status });
  } catch (error) {
    console.error('❌ Citizen feedback error:', error.message);
    res.status(500).json({ message: 'Failed to record feedback', error: error.message });
  }
});

export default router;