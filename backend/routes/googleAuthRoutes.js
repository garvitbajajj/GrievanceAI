/**
 * BhashaFlow — Google OAuth Routes
 *
 * Strategy: passport-google-oauth20
 * Flow:
 *   1. Frontend opens  GET /api/auth/google         → redirects to Google consent
 *   2. Google redirects to GET /api/auth/google/callback
 *   3. We find-or-create the User, sign a JWT, and redirect the browser to
 *      the frontend with the token in the URL fragment:
 *      http://localhost:3000/auth/oauth-success#token=<jwt>
 *   4. The frontend reads the fragment, stores the token, and navigates to /dashboard.
 *
 * Setup:
 *   npm install passport passport-google-oauth20
 *
 *   Add to .env:
 *     GOOGLE_CLIENT_ID=<from Google Cloud Console>
 *     GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
 *     FRONTEND_URL=http://localhost:3000
 *
 *   Google Cloud Console steps:
 *     1. https://console.cloud.google.com → APIs & Services → Credentials
 *     2. Create OAuth 2.0 Client ID → Web application
 *     3. Authorised redirect URI: http://localhost:5000/api/auth/google/callback
 *     4. Copy Client ID and Client Secret into .env
 */

import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// ─── Configure Passport Google Strategy ─────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email returned from Google'), null);
        }

        // Find existing user or create a new citizen account
        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name: profile.displayName || email.split('@')[0],
            email,
            // OAuth users have no password — set a random unhashable placeholder
            password: `GOOGLE_OAUTH_${profile.id}`,
            role: 'citizen',
            preferred_language: 'en-IN',
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Passport requires these even if we don't use sessions
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ─── GET /api/auth/google ────────────────────────────────────────
// Initiates the Google OAuth flow.
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// ─── GET /api/auth/google/callback ──────────────────────────────
// Google redirects here after user consents.
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth?error=oauth_failed', session: false }),
  (req, res) => {
    const user = req.user;

    // Sign a JWT exactly the same way as the normal login route
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Redirect to frontend with token in URL fragment (never in query string)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/auth/oauth-success#token=${token}&name=${encodeURIComponent(user.name)}&role=${user.role}`
    );
  }
);

export default router;