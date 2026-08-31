import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import passport from 'passport';

// Route imports
import authRoutes from './routes/authRoutes.js';
import googleAuthRoutes from './routes/googleAuthRoutes.js';
import grievanceRoutes from './routes/grievanceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Cron job import
import { startCronJobs } from './utils/cronJobs.js';

// ─── Configuration ────────────────────────────────────────────────
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ─────────────────────────────────────────────────────────
// Allow the React dev server and any future deployed frontend origin.
app.use(cors({
  origin: [
    process.env.FRONTEND_URL, 
    'http://localhost:3000',
    'https://bhasha-flow.vercel.app' // Add your live Vercel URL here!
  ],
  credentials: true,
}));

// ─── Body Parsers ─────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Passport (required by Google OAuth — session: false so no cookies) ──
app.use(passport.initialize());

// ─── Static Files — Multer uploads ───────────────────────────────
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}
app.use('/uploads', express.static('uploads'));

// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);           // Register / Login (email+password)
app.use('/api/auth', googleAuthRoutes);     // Google OAuth (/google, /google/callback)
app.use('/api/grievance', grievanceRoutes); // Protected — citizen routes
app.use('/api/admin', adminRoutes);         // Protected — authority/admin routes

// ─── Public API ──────────────────────────────────────────────────
import Grievance from './models/Grievance.js';
app.get('/api/public/stats', async (req, res) => {
  try {
    const [total, byStatus, byCategory] = await Promise.all([
      Grievance.countDocuments(),
      Grievance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Grievance.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    ]);

    const statusMap = {};
    byStatus.forEach(item => { statusMap[item._id || 'unknown'] = item.count; });
    const categoryMap = {};
    byCategory.forEach(item => { categoryMap[item._id || 'unknown'] = item.count; });

    res.status(200).json({
      total,
      by_status: statusMap,
      by_category: categoryMap,
    });
  } catch (error) {
    console.error('❌ Public stats error:', error.message);
    res.status(500).json({ message: 'Failed to fetch public stats' });
  }
});

// ─── Health Check ────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'BhashaFlow Backend',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Error Handler ─────────────────────────────────────────
// Catches any unhandled errors thrown inside route handlers.
app.use((err, req, res, _next) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// ─── MongoDB Atlas Connection ─────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas successfully!'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ─── Start Server ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/`);
  startCronJobs();
});