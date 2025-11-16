const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Process chat message with OpenAI
router.post('/message', chatController.processMessage);

// Create ticket from chat
router.post('/create-ticket', chatController.createTicketFromChat);

// Get session history (for debugging)
router.get('/session/:sessionId', chatController.getSessionHistory);

// Clear session (reset conversation)
router.delete('/session/:sessionId', chatController.clearSession);

// Health check
router.get('/health', chatController.healthCheck);

module.exports = router;