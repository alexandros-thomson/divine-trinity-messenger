// server.js - Express wrapper for Netlify Functions on Render
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'divine-trinity-messenger',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Import your Netlify functions (These are in netlify/functions directory)
const messengerHandler = require('./netlify/functions/webhook').handler;

// Route: POST /webhook - Main messenger webhook
app.post('/webhook', async (req, res) => {
  console.log('Webhook POST received');
  
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(req.body),
    queryStringParameters: req.query,
    headers: req.headers
  };
  
  try {
    const response = await messengerHandler(event);
    res.status(response.statusCode).json(JSON.parse(response.body));
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: GET /webhook - Webhook verification for Meta
app.get('/webhook', async (req, res) => {
  console.log('Webhook GET verification request');
  
  const event = {
    httpMethod: 'GET',
    queryStringParameters: req.query,
    headers: req.headers
  };
  
  try {
    const response = await messengerHandler(event);
    res.status(response.statusCode).send(response.body);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
});

// Health check endpoint for monitoring
app.get('/.netlify/functions/health', (req, res) => {
  res.json({ status: 'healthy', service: 'oauth-temple' });
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Error' : err.message
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Divine Trinity Messenger running on port ${PORT}`);
  console.log(`URL: https://divine-trinity-messenger.onrender.com`);
  console.log(`Webhook: https://divine-trinity-messenger.onrender.com/webhook`);
  console.log(`Health: https://divine-trinity-messenger.onrender.com/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
