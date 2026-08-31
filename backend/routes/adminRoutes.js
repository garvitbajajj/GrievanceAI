import express from 'express';
import axios from 'axios';
import auth from '../middleware/auth.js';
import Grievance from '../models/Grievance.js';
import AiAnalysis from '../models/AiAnalysis.js';
import StatusUpdate from '../models/StatusUpdate.js';
import User from '../models/User.js';
import { sendResolutionEmail } from '../utils/mailer.js';

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (!req.user || !['authority', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied. Admin or Authority role required.' });
  }
  next();
};

router.use(auth, requireAdmin);

// ─── GET /api/admin/grievances ──────────────────────────────────
router.get('/grievances', async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      status, category, language,
      sort_by = 'submitted_at', sort_order = 'desc',
    } = req.query;

    const filter = {};
    if (status)   filter.status            = status;
    if (category) filter.category          = category;
    if (language) filter.original_language = language;


    const pageNum      = parseInt(page,  10);
    const limitNum     = parseInt(limit, 10);
    const skip         = (pageNum - 1) * limitNum;
    const sortDirection = sort_order === 'asc' ? 1 : -1;

    const [grievances, total] = await Promise.all([
      Grievance.find(filter)
        .sort({ [sort_by]: sortDirection })
        .skip(skip)
        .limit(limitNum),
      Grievance.countDocuments(filter),
    ]);

    // Attach ai_analysis to each grievance
    const grievanceIds = grievances.map(g => g._id);
    const analyses     = await AiAnalysis.find({ grievance_id: { $in: grievanceIds } });
    const analysisMap  = {};
    analyses.forEach(a => { analysisMap[a.grievance_id.toString()] = a; });

    const result = grievances.map(g => ({
      ...g.toObject(),
      ai_analysis: analysisMap[g._id.toString()] || null,
    }));

    res.status(200).json({
      grievances: result,
      pagination: {
        current_page: pageNum,
        total_pages:  Math.ceil(total / limitNum),
        total_count:  total,
        per_page:     limitNum,
      },
    });
  } catch (error) {
    console.error('❌ Admin grievances list error:', error.message);
    res.status(500).json({ message: 'Failed to fetch grievances', error: error.message });
  }
});

// ─── GET /api/admin/grievance/:id ───────────────────────────────
router.get('/grievance/:id', async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });

    const aiAnalysis    = await AiAnalysis.findOne({ grievance_id: grievance._id });
    // FIX: key is status_timeline to match GrievanceDetail.jsx
    const statusTimeline = await StatusUpdate.find({ grievance_id: grievance._id })
      .sort({ updated_at: 1 });

    res.status(200).json({
      grievance:       grievance.toObject(),
      ai_analysis:     aiAnalysis || null,
      status_timeline: statusTimeline,
    });
  } catch (error) {
    console.error('❌ Admin grievance detail error:', error.message);
    res.status(500).json({ message: 'Failed to fetch grievance details', error: error.message });
  }
});

// ─── PUT /api/admin/grievance/:id/status ────────────────────────
router.put('/grievance/:id/status', async (req, res) => {
  try {
    const { status, remark } = req.body;
    if (!status) return res.status(400).json({ message: 'status is required' });

    const validStatuses = ['pending', 'processing', 'open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });

    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });

    const oldStatus   = grievance.status;
    grievance.status  = status;
    if (status === 'resolved') grievance.resolved_at = new Date();
    await grievance.save();

    await StatusUpdate.create({
      grievance_id: grievance._id,
      old_status:   oldStatus,
      new_status:   status,
      changed_by:   req.user.email,
      remark:       remark || '',
    });

    res.status(200).json({
      message:     `Status updated from '${oldStatus}' to '${status}'`,
      grievance_id: grievance._id,
      old_status:   oldStatus,
      new_status:   status,
    });
  } catch (error) {
    console.error('❌ Status update error:', error.message);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
});

// ─── PUT /api/admin/grievance/:id/assign ────────────────────────
router.put('/grievance/:id/assign', async (req, res) => {
  try {
    const { assigned_to } = req.body;
    if (!assigned_to) return res.status(400).json({ message: 'assigned_to is required' });

    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });

    const previousAssignment = grievance.assigned_to || 'unassigned';
    grievance.assigned_to    = assigned_to;
    const oldStatus          = grievance.status;
    if (grievance.status === 'open') grievance.status = 'in_progress';
    await grievance.save();

    await StatusUpdate.create({
      grievance_id: grievance._id,
      old_status:   oldStatus,
      new_status:   grievance.status,
      changed_by:   req.user.email,
      remark:       `Assigned to ${assigned_to} (was: ${previousAssignment})`,
    });

    res.status(200).json({
      message:     `Grievance assigned to '${assigned_to}'`,
      grievance_id: grievance._id,
      assigned_to,
      status:       grievance.status,
    });
  } catch (error) {
    console.error('❌ Assignment error:', error.message);
    res.status(500).json({ message: 'Failed to assign grievance', error: error.message });
  }
});

// ─── GET /api/admin/stats ───────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [total, byStatus, byCategory, byLanguage, resolvedGrievances] = await Promise.all([
      Grievance.countDocuments(),
      Grievance.aggregate([{ $group: { _id: '$status',            count: { $sum: 1 } } }]),
      Grievance.aggregate([{ $group: { _id: '$category',          count: { $sum: 1 } } }]),
      Grievance.aggregate([{ $group: { _id: '$original_language', count: { $sum: 1 } } }]),
      Grievance.find({ status: 'resolved', resolved_at: { $exists: true } })
        .select('submitted_at resolved_at'),
    ]);

    const statusMap   = {};
    byStatus.forEach(  item => { statusMap[item._id   || 'unknown'] = item.count; });
    const categoryMap = {};
    byCategory.forEach(item => { categoryMap[item._id || 'unknown'] = item.count; });
    const languageMap = {};
    byLanguage.forEach(item => { languageMap[item._id || 'unknown'] = item.count; });

    let avgResolutionHours = 0;
    if (resolvedGrievances.length > 0) {
      const totalHours = resolvedGrievances.reduce((sum, g) => {
        // FIX: use submitted_at (Mongoose field) not created_at
        const hours = (new Date(g.resolved_at) - new Date(g.submitted_at)) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgResolutionHours = Math.round((totalHours / resolvedGrievances.length) * 10) / 10;
    }

    res.status(200).json({
      total,
      by_status:             statusMap,
      by_category:           categoryMap,
      by_language:           languageMap,
      avg_resolution_hours:  avgResolutionHours,
      resolved_count:        resolvedGrievances.length,
    });
  } catch (error) {
    console.error('❌ Stats error:', error.message);
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

// ─── GET /api/admin/ai-insights ─────────────────────────────────
router.get('/ai-insights', async (req, res) => {
  try {
    const [totalAnalyses, avgConfidence, categoriesAnalyzed, portalsFound] = await Promise.all([
      AiAnalysis.countDocuments(),
      AiAnalysis.aggregate([{ $group: { _id: null, avg: { $avg: '$confidence_score' } } }]),
      AiAnalysis.distinct('category'),
      AiAnalysis.aggregate([{ $unwind: '$portal_links' }, { $count: 'total' }]),
    ]);

    const avgConf = avgConfidence.length > 0 ? avgConfidence[0].avg : 0;
    const catCount = categoriesAnalyzed.length;
    const portalCount = portalsFound.length > 0 ? portalsFound[0].total : 0;

    res.status(200).json({
      total_ai_analyses: totalAnalyses,
      avg_confidence: avgConf,
      categories_analyzed: catCount,
      portals_found: portalCount,
    });
  } catch (error) {
    console.error('❌ AI insights error:', error.message);
    res.status(500).json({ message: 'Failed to fetch AI insights', error: error.message });
  }
});

// ─── POST /api/admin/grievance/:id/notify-citizen ───────────────
// Called by frontend after admin resolves. Translates remark + sends email.
router.post('/grievance/:id/notify-citizen', async (req, res) => {
  try {
    const { remark, status } = req.body;
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });

    const user = await User.findById(grievance.user_id);
    if (!user?.email) return res.status(200).json({ message: 'No citizen email on record, skipping.' });

    const aiAnalysis = await AiAnalysis.findOne({ grievance_id: grievance._id });
    const detectedLang = aiAnalysis?.detected_language || grievance.original_language || 'en-IN';
    const isEnglish = detectedLang === 'en-IN' || detectedLang === 'en';

    let translatedRemark = remark;
    if (!isEnglish && remark) {
      try {
        const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://ai-engine:8000';
        const tr = await axios.post(
          `${AI_ENGINE_URL}/translate`,
          { text: remark, source_language_code: 'en-IN', target_language_code: detectedLang },
          { timeout: 15000 }
        );
        translatedRemark = tr.data.translated_text || remark;
      } catch {
        console.warn('⚠ Translation failed, sending English remark only');
        translatedRemark = remark;
      }
    }

    await sendResolutionEmail(
      user.email,
      grievance._id,
      grievance.category || 'General',
      grievance.title || 'Your Grievance',
      remark,
      translatedRemark,
      detectedLang
    );

    res.status(200).json({ message: 'Resolution email sent successfully.' });
  } catch (error) {
    console.error('❌ Notify citizen error:', error.message);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
});

export default router;