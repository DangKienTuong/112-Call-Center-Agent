const Ticket = require('../models/Ticket');
const ChatSession = require('../models/ChatSession');
const UserMemory = require('../models/UserMemory');
const langgraphService = require('../services/langgraph');
const openaiService = require('../services/openaiService'); // Keep as fallback
const firstAidService = require('../services/firstAidService'); // Keep as fallback

// Process chat message using LangGraph
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

    // Get user ID if authenticated (from optionalAuth middleware)
    const userId = req.user?._id || null;
    const isAuthenticated = req.isAuthenticated || false;

    console.log(`Processing message for session ${sessionId}: ${message}`);
    console.log(`User: ${userId || 'guest'}, Authenticated: ${isAuthenticated}`);

    let result;
    try {
      // Use new LangGraph service with optional userId
      result = await langgraphService.processMessage(message, sessionId, context, { userId });
      console.log('[Controller] LangGraph processing successful');
    } catch (langgraphError) {
      console.error('[Controller] LangGraph error, falling back to old service:', langgraphError);
      // Fallback to old service
      result = await openaiService.processMessage(message, sessionId, context);
      console.log('[Controller] Fallback service used');
    }

    // Log the response for debugging
    console.log('AI Response:', result.response);
    console.log('Extracted Info:', result.ticketInfo);
    console.log('Should Create Ticket:', result.shouldCreateTicket);

    // If LangGraph indicates ticket should be created, create it here
    if (result.shouldCreateTicket && result.ticketInfo) {
      console.log('[Controller] Auto-creating ticket from LangGraph output');
      
      try {
        const ticketData = await createTicketFromInfo(result.ticketInfo, sessionId);

        // Complete session and update user memory
        await langgraphService.completeSessionWithTicket(
          sessionId,
          ticketData.ticketId,
          {
            emergencyTypes: result.ticketInfo.emergencyTypes,
            location: result.ticketInfo.location,
            description: result.ticketInfo.description,
            phone: result.ticketInfo.reporter?.phone,
            reporterName: result.ticketInfo.reporter?.name,
            locationDetails: result.ticketInfo.locationDetails
          },
          userId
        );

        // Build final response with ticket info and first aid guidance
        const emergencyTypeMap = {
          'FIRE_RESCUE': 'PCCC & Cứu nạn cứu hộ',
          'MEDICAL': 'Cấp cứu y tế',
          'SECURITY': 'An ninh'
        };
        
        const emergencyTypes = result.ticketInfo.emergencyTypes || [result.ticketInfo.emergencyType];
        const emergencyTypesVi = emergencyTypes.map(t => emergencyTypeMap[t] || t).join(', ');
        
        const forces = [];
        if (result.ticketInfo.supportRequired?.police) forces.push('Công an');
        if (result.ticketInfo.supportRequired?.fireDepartment) forces.push('Cứu hỏa');
        if (result.ticketInfo.supportRequired?.ambulance) forces.push('Cấp cứu');
        if (result.ticketInfo.supportRequired?.rescue && !result.ticketInfo.supportRequired?.fireDepartment) {
          forces.push('Cứu hộ');
        }
        const forcesStr = forces.length > 0 ? forces.join(', ') : 'Lực lượng cứu hộ';
        
        // Note: First aid guidance was already shown earlier in the flow
        // So we don't need to repeat it here, just show simple reminder
        const confirmationMessage = `✅ **PHIẾU KHẨN CẤP ${ticketData.ticketId} ĐÃ ĐƯỢC TẠO**

📋 **Thông tin đã ghi nhận:**
• Địa điểm: ${result.ticketInfo.location}
• Loại tình huống: ${emergencyTypesVi}
• Số điện thoại: ${result.ticketInfo.reporter.phone}
• Số người bị ảnh hưởng: ${result.ticketInfo.affectedPeople?.total || 1}

🚨 **${forcesStr} đang được điều động đến ngay!**

Vui lòng giữ bình tĩnh và thực hiện theo hướng dẫn đã cung cấp trong khi chờ lực lượng chức năng đến hỗ trợ.`;
        
        // Clear session after ticket creation
        await langgraphService.clearSession(sessionId);
        
        return res.json({
          success: true,
          data: {
            response: confirmationMessage,
            ticketInfo: result.ticketInfo,
            shouldCreateTicket: false, // Already created
            ticketId: ticketData.ticketId,
            ticket: ticketData.ticket,
            firstAidGuidance: result.firstAidGuidance,
            sessionId: sessionId
          }
        });
      } catch (ticketError) {
        console.error('[Controller] Error creating ticket:', ticketError);
        // Return the original result even if ticket creation fails
      }
    }

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

/**
 * Helper function to create ticket from ticketInfo
 */
async function createTicketFromInfo(ticketInfo, sessionId) {
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
      name: ticketInfo.reporter?.name || 'Chưa xác định',
      phone: ticketInfo.reporter?.phone || ticketInfo.phone,
      email: ticketInfo.reporter?.email || ''
    },
    location: {
      address: ticketInfo.location,
      landmarks: ticketInfo.landmarks || ''
    },
    emergencyTypes: ticketInfo.emergencyTypes || [ticketInfo.emergencyType],
    emergencyType: ticketInfo.emergencyType || ticketInfo.emergencyTypes[0],
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

  await ticket.save();
  console.log(`[Controller] Emergency ticket created: ${ticketId}`);

  return { ticketId, ticket };
}

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
      emergencyTypes: ticketInfo.emergencyTypes || [ticketInfo.emergencyType], // Mảng các loại
      emergencyType: ticketInfo.emergencyType, // Loại chính (tương thích ngược)
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

    // Get first aid guidance from OpenAI based on emergency types and description
    let firstAidGuidance = '';
    try {
      // Pass all emergency types (array) and the description
      const emergencyTypes = ticketInfo.emergencyTypes || [ticketInfo.emergencyType];
      firstAidGuidance = await firstAidService.getFirstAidGuidance(
        emergencyTypes,
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

    // Build emergency types display string
    const emergencyTypes = ticketInfo.emergencyTypes || [ticketInfo.emergencyType];
    const emergencyTypesVi = emergencyTypes.map(t => emergencyTypeMap[t] || t).join(', ');

    // Build forces being dispatched
    const forces = [];
    if (ticketInfo.supportRequired?.police) forces.push('Công an');
    if (ticketInfo.supportRequired?.fireDepartment) forces.push('Cứu hỏa');
    if (ticketInfo.supportRequired?.ambulance) forces.push('Cấp cứu');
    if (ticketInfo.supportRequired?.rescue && !ticketInfo.supportRequired?.fireDepartment) forces.push('Cứu hộ');
    const forcesStr = forces.length > 0 ? forces.join(', ') : 'Lực lượng cứu hộ';

    // Build response message (first aid guidance was already shown earlier in flow)
    const confirmationMessage = `✅ **PHIẾU KHẨN CẤP ${ticketId} ĐÃ ĐƯỢC TẠO**

📋 **Thông tin đã ghi nhận:**
• Địa điểm: ${ticketInfo.location}
• Loại tình huống: ${emergencyTypesVi}
• Số điện thoại: ${ticketInfo.reporter.phone}
• Số người bị ảnh hưởng: ${ticketInfo.affectedPeople?.total || 1}

🚨 **${forcesStr} đang được điều động đến ngay!**

Vui lòng giữ bình tĩnh và thực hiện theo hướng dẫn đã cung cấp trong khi chờ lực lượng chức năng đến hỗ trợ.`;

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
    
    // Try LangGraph first
    let state = await langgraphService.getSessionState(sessionId);
    
    if (!state) {
      // Fallback to old service
      const history = openaiService.getSessionHistory(sessionId);
      return res.json({
        success: true,
        data: {
          sessionId: sessionId,
          history: history,
          source: 'legacy'
        }
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        state: state,
        source: 'langgraph'
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
    
    // Clear in both services for safety
    await langgraphService.clearSession(sessionId);
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
    // Get retriever status
    const retriever = require('../services/langgraph/retriever');
    const retrieverStatus = retriever.getStatus();

    const status = {
      service: 'Emergency 112 Chat Service',
      status: 'operational',
      engine: 'LangGraph',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
      openai_model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview (default)',
      retriever: {
        initialized: retrieverStatus.initialized,
        hasVectorStore: retrieverStatus.hasVectorStore,
        documentTypes: Object.keys(retrieverStatus.documents)
      },
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

// Get user's chat history (requires authentication)
exports.getChatHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view chat history'
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const history = await langgraphService.getUserChatHistory(req.user._id, limit);

    res.json({
      success: true,
      data: {
        sessions: history,
        total: history.length
      }
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history',
      error: error.message
    });
  }
};

// Get user's ticket history (requires authentication)
exports.getTicketHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view ticket history'
      });
    }

    const tickets = await langgraphService.getUserTicketHistory(req.user._id);

    // Also get full ticket details from Ticket model for active tickets
    const ticketIds = tickets.map(t => t.ticketId);
    const fullTickets = await Ticket.find({ ticketId: { $in: ticketIds } })
      .select('ticketId status emergencyTypes location description createdAt updatedAt')
      .lean();

    // Merge ticket details
    const ticketsWithDetails = tickets.map(t => {
      const fullTicket = fullTickets.find(ft => ft.ticketId === t.ticketId);
      return {
        ...t,
        currentStatus: fullTicket?.status || t.status,
        updatedAt: fullTicket?.updatedAt || t.createdAt
      };
    });

    res.json({
      success: true,
      data: {
        tickets: ticketsWithDetails,
        total: ticketsWithDetails.length
      }
    });
  } catch (error) {
    console.error('Error getting ticket history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ticket history',
      error: error.message
    });
  }
};

// Get a specific chat session details
exports.getChatSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ChatSession.findOne({ sessionId })
      .select('sessionId userId messages status ticketId createdAt updatedAt')
      .lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check ownership if authenticated
    if (req.user && session.userId && session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error getting session details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session details',
      error: error.message
    });
  }
};

// Get user's saved info (for pre-filling forms)
exports.getUserSavedInfo = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const memory = await UserMemory.findOne({ userId: req.user._id });

    if (!memory) {
      return res.json({
        success: true,
        data: {
          savedInfo: null,
          hasHistory: false
        }
      });
    }

    res.json({
      success: true,
      data: {
        savedInfo: memory.savedInfo,
        recentTickets: memory.getRecentTickets(3),
        stats: memory.stats,
        hasHistory: memory.ticketHistory.length > 0
      }
    });
  } catch (error) {
    console.error('Error getting user saved info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get saved info',
      error: error.message
    });
  }
};
