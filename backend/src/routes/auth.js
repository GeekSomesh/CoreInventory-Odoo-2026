import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, saveDB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const otpStore = {};

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = db.data.users.find(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.password_hash))
        return res.status(401).json({ error: 'Invalid credentials' });
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        process.env.JWT_SECRET, { expiresIn: '8h' }
    );
    res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
});

router.post('/otp/request', (req, res) => {
    const { email } = req.body;
    const user = db.data.users.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };
    console.log(`📧 OTP for ${email}: ${otp}`);
    res.json({ message: 'OTP sent. Check server console for demo OTP.' });
});

router.post('/otp/verify', (req, res) => {
    const { email, otp } = req.body;
    const entry = otpStore[email];
    if (!entry || entry.otp !== otp || Date.now() > entry.expires)
        return res.status(400).json({ error: 'Invalid or expired OTP' });
    const resetToken = jwt.sign({ email, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '10m' });
    res.json({ resetToken });
});

router.post('/otp/reset', async (req, res) => {
    const { resetToken, newPassword } = req.body;
    let payload;
    try { payload = jwt.verify(resetToken, process.env.JWT_SECRET); if (payload.purpose !== 'reset') throw new Error(); }
    catch { return res.status(401).json({ error: 'Invalid reset token' }); }
    const user = db.data.users.find(u => u.email === payload.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    await saveDB();
    delete otpStore[payload.email];
    res.json({ message: 'Password updated successfully' });
});

router.get('/me', authMiddleware, (req, res) => {
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { password_hash, ...safe } = user;
    res.json(safe);
});

router.put('/profile', authMiddleware, async (req, res) => {
    const { name, avatar } = req.body;
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    await saveDB();
    const { password_hash, ...safe } = user;
    res.json(safe);
});

router.put('/password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password_hash))
        return res.status(400).json({ error: 'Current password incorrect' });
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    await saveDB();
    res.json({ message: 'Password changed successfully' });
});

export default router;
