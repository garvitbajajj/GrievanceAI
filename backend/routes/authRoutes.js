import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import auth from '../middleware/auth.js';

const router = express.Router();

// ─── REGISTER ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, preferred_language } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Role is always 'citizen' on self-registration.
    // Authority/admin accounts must be created by an existing admin directly in the DB.
    const newUser = new User({
      name,
      email,
      password,
      role: 'citizen',
      phone: phone || undefined,
      preferred_language: preferred_language || 'en-IN'
    });

    await newUser.save();

    console.log(`✅ Citizen Saved to DB: ${email}`);
    res.status(201).json({ message: 'Registration successful!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Email already exists or Server Error' });
  }
});

// ─── LOGIN ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Compare the entered password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate secure JWT with role in payload
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send token and user info back to React frontend
    res.status(200).json({
      message: 'Login successful!',
      token: token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        preferred_language: user.preferred_language
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── FORGOT PASSWORD ────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Return a 200 anyway so we don't leak which emails are registered
      return res.status(200).json({ message: 'If that email is registered, a password reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    await sendPasswordResetEmail(user.email, token);

    res.status(200).json({ message: 'If that email is registered, a password reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── RESET PASSWORD ─────────────────────────────────────────────
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    // Set new password (the pre-save hook will hash it)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'Password has been successfully reset. Please log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── CHANGE PASSWORD (LOGGED IN USER) ───────────────────────────
router.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET PROFILE (LOGGED IN USER) ──────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -twoFactorSecret -resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── UPDATE PROFILE (LOGGED IN USER) ───────────────────────────
router.put('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, phone, preferred_language } = req.body;

    // Only update fields that were actually sent
    if (name !== undefined)               user.name = name;
    if (email !== undefined)              user.email = email;
    if (phone !== undefined)              user.phone = phone;
    if (preferred_language !== undefined)  user.preferred_language = preferred_language;

    await user.save();

    // Update localStorage-facing response
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        preferred_language: user.preferred_language,
        role: user.role,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      }
    });
  } catch (err) {
    console.error(err);
    // Duplicate email
    if (err.code === 11000) {
      return res.status(400).json({ message: 'This email is already registered to another account.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── 2FA GENERATE ─────────────────────────────────────────────
router.post('/2fa/generate', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({
      name: `BhashaFlow (${user.email})`
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) return res.status(500).json({ message: 'Error generating QR code' });
      res.status(200).json({
        secret: secret.base32,
        qrCodeUrl: data_url
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── 2FA VERIFY & ENABLE ──────────────────────────────────────
router.post('/2fa/verify', auth, async (req, res) => {
  const { token } = req.body;
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      user.isTwoFactorEnabled = true;
      await user.save();
      res.status(200).json({ message: 'Two-Factor Authentication enabled successfully' });
    } else {
      res.status(400).json({ message: 'Invalid 2FA token' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;