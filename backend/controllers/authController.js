const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendPasswordChangeOtp } = require('../utils/emailService');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';
const OTP_TTL_MS = 5 * 60 * 1000;
const CHANGE_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const passwordIsStrong = (password) => typeof password === 'string' && password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const signAuthToken = (staff) => jwt.sign({ staffId: staff.staff_id, email: staff.email, name: staff.full_name, department: staff.department, role: staff.role, authVersion: staff.auth_version || 0 }, SECRET_KEY, { expiresIn: '24h' });

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const [rows] = await pool.execute('SELECT * FROM staff WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid email or password' });
    const staff = rows[0];
    const storedPassword = String(staff.password || '');
    const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);
    const candidate = Buffer.from(String(password));
    const legacy = Buffer.from(storedPassword);
    const isValidPassword = isBcryptHash ? await bcrypt.compare(password, storedPassword) : staff.is_first_login && candidate.length === legacy.length && crypto.timingSafeEqual(candidate, legacy);
    if (!isValidPassword) return res.status(401).json({ message: 'Invalid email or password' });

    // Convert a legacy temporary plaintext password to bcrypt immediately after
    // its first successful use. It remains flagged as temporary until changed.
    if (!isBcryptHash) {
      await pool.execute('UPDATE staff SET password = ? WHERE staff_id = ?', [await bcrypt.hash(password, 12), staff.staff_id]);
      staff.password = null;
    }
    const token = signAuthToken(staff);
    res.json({ success: true, token, user: { id: staff.staff_id, name: staff.full_name, email: staff.email, department: staff.department, role: staff.role, isFirstLogin: Boolean(staff.is_first_login) } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const sendChangePasswordOtp = async (req, res) => {
  try {
    const staffId = req.user?.staffId;
    const [staffRows] = await pool.execute('SELECT staff_id, full_name, email FROM staff WHERE staff_id = ? LIMIT 1', [staffId]);
    if (!staffRows.length) return res.status(404).json({ message: 'Faculty account not found' });
    const [[existing]] = await pool.execute("SELECT created_at FROM password_change_verifications WHERE staff_id = ? AND purpose = 'password_change'", [staffId]);
    if (existing && Date.now() - new Date(existing.created_at).getTime() < RESEND_COOLDOWN_MS) return res.status(429).json({ message: 'Please wait before requesting another verification code.' });
    const otp = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const otpHash = await bcrypt.hash(otp, 12);
    await pool.execute(`INSERT INTO password_change_verifications (staff_id, purpose, otp_hash, expires_at, attempts, verified_at, change_token_hash, change_token_expires_at, created_at)
      VALUES (?, 'password_change', ?, ?, 0, NULL, NULL, NULL, NOW())
      ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), attempts = 0, verified_at = NULL, change_token_hash = NULL, change_token_expires_at = NULL, created_at = NOW()`, [staffId, otpHash, expiresAt]);
    try { await sendPasswordChangeOtp({ email: staffRows[0].email, name: staffRows[0].full_name, otp }); }
    catch (mailError) { await pool.execute("DELETE FROM password_change_verifications WHERE staff_id = ? AND purpose = 'password_change'", [staffId]); throw mailError; }
    return res.json({ success: true, message: 'Verification code sent to your registered email.' });
  } catch (error) {
    console.error('Password-change OTP delivery failed:', error.message);
    return res.status(503).json({ message: 'Unable to send verification code. Please try again later.' });
  }
};

const verifyChangePasswordOtp = async (req, res) => {
  try {
    const otp = String(req.body?.otp || '').trim();
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ message: 'Enter the 6-digit verification code.' });
    const [rows] = await pool.execute("SELECT * FROM password_change_verifications WHERE staff_id = ? AND purpose = 'password_change'", [req.user.staffId]);
    const verification = rows[0];
    if (!verification || verification.verified_at || new Date(verification.expires_at) <= new Date()) return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
    if (verification.attempts >= MAX_OTP_ATTEMPTS) return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.' });
    if (!await bcrypt.compare(otp, verification.otp_hash)) {
      const attempts = verification.attempts + 1;
      await pool.execute('UPDATE password_change_verifications SET attempts = ? WHERE id = ?', [attempts, verification.id]);
      return res.status(attempts >= MAX_OTP_ATTEMPTS ? 429 : 400).json({ message: attempts >= MAX_OTP_ATTEMPTS ? 'Too many incorrect attempts. Please request a new code.' : 'Invalid verification code.' });
    }
    const changeToken = crypto.randomBytes(32).toString('base64url');
    await pool.execute('UPDATE password_change_verifications SET verified_at = NOW(), change_token_hash = ?, change_token_expires_at = ? WHERE id = ?', [tokenHash(changeToken), new Date(Date.now() + CHANGE_TOKEN_TTL_MS), verification.id]);
    return res.json({ success: true, message: 'Email verified successfully.', passwordChangeToken: changeToken });
  } catch (error) { console.error('Password-change OTP verification failed:', error); return res.status(500).json({ message: 'Unable to verify code.' }); }
};

const changePassword = async (req, res) => {
  try {
    const { newPassword, passwordChangeToken } = req.body || {};
    if (!passwordIsStrong(newPassword)) return res.status(400).json({ message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
    if (!passwordChangeToken) return res.status(400).json({ message: 'Password change authorization is required.' });
    const [rows] = await pool.execute("SELECT id FROM password_change_verifications WHERE staff_id = ? AND purpose = 'password_change' AND verified_at IS NOT NULL AND change_token_hash = ? AND change_token_expires_at > NOW()", [req.user.staffId, tokenHash(passwordChangeToken)]);
    if (!rows.length) return res.status(401).json({ message: 'Password change authorization is invalid or expired.' });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('UPDATE staff SET password = ?, is_first_login = FALSE, auth_version = auth_version + 1 WHERE staff_id = ?', [await bcrypt.hash(newPassword, 12), req.user.staffId]);
      await connection.execute('DELETE FROM password_change_verifications WHERE id = ?', [rows[0].id]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    return res.json({ success: true, message: 'Password changed successfully. Please log in again with your new password.' });
  } catch (error) { console.error('Password change failed:', error); return res.status(500).json({ message: 'Unable to change password.' }); }
};

// Retained only to give old clients a clear safe migration path.
const resetPassword = (_req, res) => res.status(410).json({ message: 'Use email verification to change your password.' });
module.exports = { login, resetPassword, sendChangePasswordOtp, verifyChangePasswordOtp, changePassword };
