// auth.js - JWT authentication for Divine Trinity Messenger
// Used for web-based premium portal and API access.

const jwt = require('jsonwebtoken');
const { getDatabase } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '30d';

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('[AUTH] JWT_SECRET is not set. Authentication will fail.');
}

async function generateToken(psid) {
  const secret = JWT_SECRET || 'dev-secret-change-in-production';
  return jwt.sign({ psid }, secret, { expiresIn: JWT_EXPIRATION });
}

function verifyToken(token) {
  try {
    const secret = JWT_SECRET || 'dev-secret-change-in-production';
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

async function getUserFromToken(token) {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const db = await getDatabase();
  return db.get('SELECT * FROM users WHERE psid = ?', [decoded.psid]);
}

module.exports = {
  generateToken,
  verifyToken,
  getUserFromToken
};
