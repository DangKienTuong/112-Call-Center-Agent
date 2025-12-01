const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  isAdmin,
  isAdminOrStaff,
  canUpdateTicketStatus,
  canFullUpdateTicket
} = require('../middleware/authorize');

// Public routes (for chatbot)
router.post('/public', ticketController.createTicket);
router.get('/:id', ticketController.getTicket);

// Protected routes
router.use(auth); // All routes below require authentication

// Create ticket (admin/staff only)
router.post('/', isAdminOrStaff, ticketController.createTicket);

// Get all tickets - accessible by admin, staff, supervisor, operator
router.get('/', ticketController.getTickets);

// Update ticket status only - accessible by admin and staff
router.patch('/:id/status', isAdminOrStaff, ticketController.updateTicketStatus);

// Full ticket update - admin only
router.put('/:id', isAdmin, ticketController.updateTicket);

// Add chat message
router.post('/:id/messages', ticketController.addChatMessage);

// Generate PDF - accessible by admin and staff
router.get('/:id/pdf', isAdminOrStaff, ticketController.generatePDF);

// Statistics - accessible by admin, supervisor
router.get('/stats/overview', ticketController.getStatistics);

module.exports = router;