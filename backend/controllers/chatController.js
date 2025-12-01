const Ticket = require('../models/Ticket');
const openaiService = require('../services/openaiService');
const geminiService = require('../services/geminiService');

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
    console.log('Should Create Ticket:', result.shouldCreateTicket);

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

// Create ticket from chat and get first aid guidance
exports.createTicketFromChat = async (req, res) => {
  try {
    const { ticketInfo, sessionId } = req.body;

    // Validate required fields
    if (!ticketInfo || !ticketInfo.location || !ticketInfo.emergencyType) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin chưa đầy đủ. Cần có địa chỉ và loại tình huống khẩn cấp.'
      });
    }

    // Validate phone number (MANDATORY)
    if (!ticketInfo.reporter || !ticketInfo.reporter.phone) {
      return res.status(400).json({
        success: false,
        message: 'Cần có số điện thoại để lực lượng cứu hộ liên hệ.'
      });
    }

    // Generate ticket ID
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const ticketId = `TD-${dateStr}-${timeStr}-${randomStr}`;

    // Create ticket object
    const ticket = new Ticket({
      ticketId,
      reporter: {
        name: ticketInfo.reporter.name || 'Chưa xác định',
        phone: ticketInfo.reporter.phone,
        email: ticketInfo.reporter.email || ''
      },
      location: {
        address: ticketInfo.location,
        landmarks: ticketInfo.landmarks || ''
      },
      emergencyType: ticketInfo.emergencyType,
      description: ticketInfo.description || 'Báo cáo qua tổng đài 112',
      affectedPeople: {
        total: ticketInfo.affectedPeople?.total || 1,
        injured: ticketInfo.affectedPeople?.injured || 0,
        critical: ticketInfo.affectedPeople?.critical || 0,
        deceased: ticketInfo.affectedPeople?.deceased || 0
      },
      supportRequired: {
        police: ticketInfo.supportRequired?.police || false,
        ambulance: ticketInfo.supportRequired?.ambulance || false,
        fireDepartment: ticketInfo.supportRequired?.fireDepartment || false,
        rescue: ticketInfo.supportRequired?.rescue || false
      },
      status: 'URGENT',
      priority: ticketInfo.priority || 'HIGH',
      chatSessionId: sessionId
    });

    // Save ticket to database
    await ticket.save();

    // Clear the session history after ticket creation
    openaiService.clearSession(sessionId);

    console.log(`Emergency ticket created: ${ticketId}`);

    // Get first aid guidance from Gemini
    let firstAidGuidance = '';
    try {
      firstAidGuidance = await geminiService.getFirstAidGuidance(
        ticketInfo.emergencyType,
        ticketInfo.description || ''
      );
    } catch (guidanceError) {
      console.error('Error getting first aid guidance:', guidanceError);
      firstAidGuidance = 'Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý.';
    }

    // Map emergency type to Vietnamese
    const emergencyTypeMap = {
      'FIRE_RESCUE': 'PCCC & Cứu nạn cứu hộ',
      'MEDICAL': 'Cấp cứu y tế',
      'SECURITY': 'An ninh'
    };

    // Build response message
    const confirmationMessage = `✅ **PHIẾU KHẨN CẤP ${ticketId} ĐÃ ĐƯỢC TẠO**

📋 **Thông tin đã ghi nhận:**
• Địa điểm: ${ticketInfo.location}
• Loại tình huống: ${emergencyTypeMap[ticketInfo.emergencyType] || ticketInfo.emergencyType}
• Số điện thoại: ${ticketInfo.reporter.phone}
• Số người bị ảnh hưởng: ${ticketInfo.affectedPeople?.total || 1}

🚨 **Lực lượng cứu hộ đang được điều động đến ngay!**

---

💡 **HƯỚNG DẪN XỬ LÝ BAN ĐẦU:**
${firstAidGuidance}`;

    res.json({
      success: true,
      data: {
        ticket: ticket,
        ticketId: ticketId,
        message: confirmationMessage,
        firstAidGuidance: firstAidGuidance
      }
    });

  } catch (error) {
    console.error('Ticket creation error:', error);

    res.status(500).json({
      success: false,
      message: 'Không thể tạo phiếu khẩn cấp',
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
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
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
