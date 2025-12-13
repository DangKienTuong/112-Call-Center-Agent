const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const optionalAuth = require('../middleware/optionalAuth');
const auth = require('../middleware/auth');

// Process chat message - supports both guest and authenticated users
router.post('/message', optionalAuth, chatController.processMessage);

// Create ticket from chat - supports both guest and authenticated users
router.post('/create-ticket', optionalAuth, chatController.createTicketFromChat);

// Get session history (for debugging)
router.get('/session/:sessionId', optionalAuth, chatController.getSessionHistory);

// Get specific chat session details
router.get('/session/:sessionId/details', optionalAuth, chatController.getChatSessionDetails);

// Clear session (reset conversation)
router.delete('/session/:sessionId', chatController.clearSession);

// Health check
router.get('/health', chatController.healthCheck);

// Protected routes - require authentication
// Get user's chat history
router.get('/history', auth, chatController.getChatHistory);

// Get user's ticket history
router.get('/tickets', auth, chatController.getTicketHistory);

// Get user's saved info (for pre-filling)
router.get('/saved-info', auth, chatController.getUserSavedInfo);

module.exports = router;