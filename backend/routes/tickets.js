const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const {
  isAdmin,
  isAdminOrStaff
} = require('../middleware/authorize');

// Public routes (for chatbot)
router.post('/public', ticketController.createTicket);

// Protected routes
router.use(auth); // All routes below require authentication

// Statistics - MUST be before /:id routes to avoid being caught by the param
router.get('/stats/overview', ticketController.getStatistics);

// Get all tickets - accessible by admin, staff
router.get('/', ticketController.getTickets);

// Create ticket (admin/staff only)
router.post('/', isAdminOrStaff, ticketController.createTicket);

// Generate PDF - accessible by ticket owner, admin and staff (before /:id to avoid conflict)
router.get('/:id/pdf', ticketController.generatePDF);

// Update ticket status only - accessible by admin and staff
router.patch('/:id/status', isAdminOrStaff, ticketController.updateTicketStatus);

// Add chat message
router.post('/:id/messages', ticketController.addChatMessage);

// Get single ticket
router.get('/:id', ticketController.getTicket);

// Full ticket update - admin only
router.put('/:id', isAdmin, ticketController.updateTicket);

module.exports = router;