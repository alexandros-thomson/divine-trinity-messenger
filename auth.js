const jwt = require('jsonwebtoken');
const { getDatabase } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = '30d';

async function generateToken(psid) {
  const token = jwt.sign({ psid }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
  return token;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function getUserFromToken(token) {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const db = await getDatabase();
  const user = await db.get('SELECT * FROM users WHERE psid = ?', [decoded.psid]);
  return user;
}

module.exports = {
  generateToken,
  verifyToken,
  getUserFromToken
};
