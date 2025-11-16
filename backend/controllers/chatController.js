const Ticket = require('../models/Ticket');
const openaiService = require('../services/openaiService');

// Process chat message using OpenAI
exports.processMessage = async (req, res) => {
  try {
    const { message, sessionId, context } = req.body;

    // Validate input
    if (!message || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Message and sessionId are required'
      });
    }

    console.log(`Processing message for session ${sessionId}: ${message}`);

    // Process message through OpenAI service
    const result = await openaiService.processMessage(message, sessionId, context);

    // Log the response for debugging
    console.log('AI Response:', result.response);
    console.log('Extracted Info:', result.ticketInfo);

    res.json({
      success: true,
      data: {
        response: result.response,
        ticketInfo: result.ticketInfo,
        shouldCreateTicket: result.shouldCreateTicket,
        sessionId: sessionId
      }
    });

  } catch (error) {
    console.error('Chat processing error:', error);

    // Provide a helpful error response
    res.status(500).json({
      success: false,
      message: 'Failed to process message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
};

// Create ticket from chat
exports.createTicketFromChat = async (req, res) => {
  try {
    const { ticketInfo, sessionId } = req.body;

    // Validate required fields - must have complete information
    if (!ticketInfo || !ticketInfo.location || !ticketInfo.emergencyType) {
      return res.status(400).json({
        success: false,
        message: 'Incomplete ticket information. Location and emergency type are required.'
      });
    }
    
    // Validate phone number is provided (MANDATORY for emergency callback)
    if (!ticketInfo.reporter || !ticketInfo.reporter.phone) {
      return res.status(400).json({
        success: false,
        message: 'Reporter phone number is required for emergency callback.'
      });
    }
    
    // Validate location has sufficient detail (city/district/ward or landmarks)
    const hasLocationDetails = 
      ticketInfo.location.toLowerCase().includes('city') ||
      ticketInfo.location.toLowerCase().includes('district') ||
      ticketInfo.location.toLowerCase().includes('ward') ||
      ticketInfo.location.toLowerCase().includes('quận') ||
      ticketInfo.location.toLowerCase().includes('phường') ||
      ticketInfo.location.toLowerCase().includes('thành phố') ||
      ticketInfo.landmarks ||
      (ticketInfo.location.includes(',') && ticketInfo.location.split(',').length >= 2);
    
    if (!hasLocationDetails) {
      return res.status(400).json({
        success: false,
        message: 'Location must include city/district/ward information or nearby landmarks for accurate dispatch.'
      });
    }

    // Generate ticket ID
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const randomStr = Math.random().toString(36).substring(7);
    const ticketId = `TD-${dateStr}-${timeStr}-${randomStr.toUpperCase()}`;

    // Create ticket object
    const ticket = new Ticket({
      ticketId,
      reporter: {
        name: ticketInfo.reporter.name || 'Unknown',
        phone: ticketInfo.reporter.phone || 'Not provided',
        relationship: ticketInfo.reporter.relationship || 'Caller'
      },
      location: {
        address: ticketInfo.location,
        landmarks: ticketInfo.landmarks || '',
        coordinates: ticketInfo.coordinates || null
      },
      emergencyType: ticketInfo.emergencyType,
      severity: ticketInfo.severity || 'URGENT',
      description: ticketInfo.description || 'Emergency reported via 112 hotline',
      affectedPeople: {
        total: ticketInfo.affectedPeople?.total || 1,
        injured: ticketInfo.affectedPeople?.injured || 0,
        status: ticketInfo.affectedPeople?.status || 'Unknown'
      },
      supportRequired: {
        police: ticketInfo.supportRequired?.police || false,
        ambulance: ticketInfo.supportRequired?.ambulance || false,
        fireDepartment: ticketInfo.supportRequired?.fireDepartment || false,
        rescue: ticketInfo.supportRequired?.rescue || false
      },
      status: ticketInfo.severity === 'CRITICAL' ? 'DISPATCHED' : 'URGENT',
      priority: ticketInfo.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      additionalInfo: ticketInfo.additionalInfo || '',
      chatSessionId: sessionId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Save ticket to database
    await ticket.save();

    // Clear the session history after ticket creation
    openaiService.clearSession(sessionId);

    // Log ticket creation
    console.log(`Emergency ticket created: ${ticketId}`);

    // Send response
    res.json({
      success: true,
      data: {
        ticket: ticket,
        ticketId: ticketId,
        message: `Emergency ticket ${ticketId} has been created. Help is being dispatched to ${ticketInfo.location}.`
      }
    });

  } catch (error) {
    console.error('Ticket creation error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to create emergency ticket',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
};

// Get session history (for debugging)
exports.getSessionHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = openaiService.getSessionHistory(sessionId);

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        history: history
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session history',
      error: error.message
    });
  }
};

// Clear session (reset conversation)
exports.clearSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    openaiService.clearSession(sessionId);

    res.json({
      success: true,
      message: `Session ${sessionId} has been cleared`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear session',
      error: error.message
    });
  }
};

// Health check endpoint
exports.healthCheck = async (req, res) => {
  try {
    const status = {
      service: 'Emergency 112 Chat Service',
      status: 'operational',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
};