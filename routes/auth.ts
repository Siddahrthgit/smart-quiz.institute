import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import { User } from '../db/User';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = express.Router();

function signToken(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ userId }, secret, { expiresIn: '30d' });
}

router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'name, username, email, and password are all required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, username, email, passwordHash, lastActiveAt: new Date() });

    const token = signToken(user.id);
    return res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, username: user.username, email: user.email, subscription: user.subscription },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to register' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'emailOrUsername and password are required' });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername.toLowerCase() }],
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    user.lastActiveAt = new Date();
    await user.save();

    const token = signToken(user.id);
    return res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, username: user.username, email: user.email, subscription: user.subscription },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to log in' });
  }
});

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});


// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always respond success even if user not found, to avoid leaking which emails are registered
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: user.email,
      subject: 'Reset your Smart Exam Preparation password',
      html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    });

    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
