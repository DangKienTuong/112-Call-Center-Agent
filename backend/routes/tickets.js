const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Public routes
router.post('/', ticketController.createTicket);
router.get('/:id', ticketController.getTicket);

// Protected routes
router.use(auth); // All routes below require authentication

router.get('/', ticketController.getTickets);
router.put('/:id', ticketController.updateTicket);
router.post('/:id/messages', ticketController.addChatMessage);
router.get('/:id/pdf', ticketController.generatePDF);
router.get('/stats/overview', ticketController.getStatistics);

module.exports = router;