const { StateGraph, END } = require('@langchain/langgraph');
const { MemorySaver } = require('@langchain/langgraph');
const { EmergencyStateAnnotation } = require('./state');
const { mongoCheckpointer } = require('./checkpointer');
const UserMemory = require('../../models/UserMemory');
const ChatSession = require('../../models/ChatSession');
const { extractInfoNode } = require('./nodes/extractInfo');
const { routerNode, routeToNextNode } = require('./nodes/router');
const {
  collectLocationNode,
  collectEmergencyNode,
  collectPhoneNode,
  collectPeopleNode,
  showFirstAidGuidanceNode
} = require('./nodes/collectInfo');
const { showConfirmationNode, createTicketNode } = require('./nodes/confirm');
const { firstAidRagNode } = require('./nodes/firstAidRag');
const { memoryRetrievalNode } = require('./nodes/memoryRetrieval');

/**
 * Emergency Call Center LangGraph
 * 
 * This graph orchestrates the multi-step emergency information collection process:
 * 1. Extract information from user message using LLM
 * 2. Route to appropriate collection node based on missing info
 * 3. Show confirmation when all info collected
 * 4. Create ticket after user confirmation
 * 5. Provide first aid guidance using RAG
 */

// Create the state graph
const workflow = new StateGraph(EmergencyStateAnnotation);

// Add all nodes to the graph
workflow.addNode('extractInfo', extractInfoNode);
workflow.addNode('router', routerNode);
workflow.addNode('collectEmergency', collectEmergencyNode);
workflow.addNode('showFirstAidGuidance', showFirstAidGuidanceNode);
workflow.addNode('collectLocation', collectLocationNode);
workflow.addNode('collectPhone', collectPhoneNode);
workflow.addNode('collectPeople', collectPeopleNode);
workflow.addNode('showConfirmation', showConfirmationNode);
workflow.addNode('createTicket', createTicketNode);
workflow.addNode('firstAidRag', firstAidRagNode);
workflow.addNode('memoryRetrieval', memoryRetrievalNode);

// Define the flow edges
// Start with extractInfo node
workflow.setEntryPoint('extractInfo');

// After extraction, always go to router
workflow.addEdge('extractInfo', 'router');

// Router decides which collection node to go to
// New flow: emergency -> firstAid -> location -> phone -> people -> confirm
// Also handles ticket queries for authenticated users
workflow.addConditionalEdges(
  'router',
  routeToNextNode,
  {
    memoryRetrieval: 'memoryRetrieval',
    collectEmergency: 'collectEmergency',
    showFirstAidGuidance: 'showFirstAidGuidance',
    collectLocation: 'collectLocation',
    collectPhone: 'collectPhone',
    collectPeople: 'collectPeople',
    showConfirmation: 'showConfirmation',
    createTicket: 'createTicket',
  }
);

// All collection nodes end and wait for user's next message
workflow.addEdge('collectEmergency', END);
workflow.addEdge('showFirstAidGuidance', END);
workflow.addEdge('collectLocation', END);
workflow.addEdge('collectPhone', END);
workflow.addEdge('collectPeople', END);

// Memory retrieval ends and waits for user's next message
workflow.addEdge('memoryRetrieval', END);

// After showing confirmation, wait for user response
workflow.addEdge('showConfirmation', END);

// After ticket creation, get first aid guidance
workflow.addEdge('createTicket', 'firstAidRag');

// After first aid guidance, end
workflow.addEdge('firstAidRag', END);

// Compile the graph with MongoDB checkpointer for persistent session storage
// Use MemorySaver as fallback for development/testing
const useMongoDb = process.env.USE_MONGODB_CHECKPOINTER !== 'false';
const checkpointer = useMongoDb ? mongoCheckpointer : new MemorySaver();
const graph = workflow.compile({ checkpointer });

console.log(`[LangGraph] Using ${useMongoDb ? 'MongoDB' : 'Memory'} checkpointer`);

/**
 * Process a message in the emergency conversation
 * @param {Object} input - Input containing message and optional context
 * @param {string} input.message - The user's message
 * @param {Array} input.context - Optional conversation context
 * @param {string} sessionId - Session ID for state persistence
 * @param {Object} options - Optional settings
 * @param {string} options.userId - User ID for authenticated users
 * @returns {Object} Response with message, ticket info, and flags
 */
async function processMessage(message, sessionId, context = [], options = {}) {
  const { userId } = options;

  console.log(`\n=== Processing Message for Session ${sessionId} ===`);
  console.log('Message:', message);
  console.log('User ID:', userId || 'guest');

  try {
    // Link session to user if authenticated
    if (userId && useMongoDb) {
      await mongoCheckpointer.linkToUser(sessionId, userId);
    }

    // Get user memory if authenticated
    let userMemory = null;
    if (userId) {
      try {
        const memory = await UserMemory.getOrCreate(userId);
        userMemory = memory.buildContext();
        console.log('[LangGraph] Loaded user memory:', JSON.stringify(userMemory, null, 2));
      } catch (err) {
        console.log('[LangGraph] Could not load user memory:', err.message);
      }
    }

    // Get existing state for this session
    let currentState = null;
    try {
      const stateSnapshot = await graph.getState({ configurable: { thread_id: sessionId } });
      currentState = stateSnapshot.values;
      console.log('[LangGraph] Found existing state for session');
    } catch (err) {
      console.log('[LangGraph] No existing state, starting new session');
    }

    // Prepare input state (only update currentMessage, don't override other fields)
    const input = {
      currentMessage: message,
      sessionId: sessionId,
    };

    // Inject user memory if available and no existing state (first message)
    if (userMemory && !currentState) {
      input.userMemory = userMemory;
      input.isAuthenticated = true;

      // Pre-fill phone if available
      if (userMemory.savedPhone && !input.phone) {
        input.phone = userMemory.savedPhone;
      }
    }

    // Add context messages if provided (for continuity from old system) and no existing state
    if (context && context.length > 0 && !currentState) {
      input.messages = context.map(msg => ({
        role: msg.role,
        message: msg.message,
        timestamp: msg.timestamp || new Date(),
      }));
    }

    // Invoke the graph with session persistence
    const result = await graph.invoke(input, {
      configurable: { thread_id: sessionId }
    });

    console.log('Graph execution completed');
    console.log('Current step:', result.currentStep);
    console.log('Should create ticket:', result.shouldCreateTicket);
    console.log('Location after execution:', JSON.stringify(result.location, null, 2));

    // Save messages to session if using MongoDB
    if (useMongoDb) {
      await mongoCheckpointer.saveMessages(sessionId, [
        { role: 'reporter', message: message, timestamp: new Date() },
        { role: 'operator', message: result.response, timestamp: new Date() }
      ]);
    }

    // Build response object (compatible with existing controller)
    const response = {
      response: result.response || 'Đang xử lý yêu cầu của bạn...',
      ticketInfo: result.ticketInfo || {},
      shouldCreateTicket: result.shouldCreateTicket || false,
      firstAidGuidance: result.firstAidGuidance || null,
    };

    console.log('=== Processing Complete ===\n');

    return response;

  } catch (error) {
    console.error('Error in LangGraph execution:', error);

    // Fallback response
    return {
      response: 'Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại.',
      ticketInfo: {},
      shouldCreateTicket: false,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    };
  }
}

/**
 * Clear session state
 * @param {string} sessionId - Session ID to clear
 */
async function clearSession(sessionId) {
  console.log(`[LangGraph] Clearing session: ${sessionId}`);

  if (useMongoDb) {
    await mongoCheckpointer.clear(sessionId);
  }
  // With MemorySaver, sessions are automatically managed
  // This function is kept for API compatibility
}

/**
 * Complete session with ticket and update user memory
 * @param {string} sessionId - Session ID
 * @param {string} ticketId - Created ticket ID
 * @param {Object} ticketData - Ticket information to store in memory
 * @param {string} userId - User ID (optional)
 */
async function completeSessionWithTicket(sessionId, ticketId, ticketData, userId = null) {
  console.log(`[LangGraph] Completing session ${sessionId} with ticket ${ticketId}`);

  if (useMongoDb) {
    await mongoCheckpointer.completeSession(sessionId, ticketId);
  }

  // Update user memory if authenticated
  if (userId) {
    try {
      const memory = await UserMemory.getOrCreate(userId);

      // Add ticket to history
      await memory.addTicket({
        ticketId: ticketId,
        createdAt: new Date(),
        emergencyTypes: ticketData.emergencyTypes,
        status: 'URGENT',
        location: ticketData.location,
        description: ticketData.description
      });

      // Update saved info
      if (ticketData.phone) {
        await memory.updateSavedInfo({
          phone: ticketData.phone,
          fullName: ticketData.reporterName
        });
      }

      // Add location to common locations
      if (ticketData.locationDetails) {
        await memory.addLocation(ticketData.locationDetails);
      }

      console.log(`[LangGraph] Updated user memory for user ${userId}`);
    } catch (err) {
      console.error('[LangGraph] Error updating user memory:', err);
    }
  }
}

/**
 * Get user's chat history
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of sessions to return
 * @returns {Array} List of chat sessions
 */
async function getUserChatHistory(userId, limit = 10) {
  try {
    const sessions = await ChatSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('sessionId status ticketId messages createdAt updatedAt')
      .lean();

    return sessions.map(session => ({
      sessionId: session.sessionId,
      status: session.status,
      ticketId: session.ticketId,
      messageCount: session.messages?.length || 0,
      lastMessage: session.messages?.[session.messages.length - 1]?.message,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }));
  } catch (error) {
    console.error('[LangGraph] Error getting user chat history:', error);
    return [];
  }
}

/**
 * Get user's ticket history from memory
 * @param {string} userId - User ID
 * @returns {Array} List of tickets
 */
async function getUserTicketHistory(userId) {
  try {
    const memory = await UserMemory.findOne({ userId });
    if (!memory) {
      return [];
    }
    return memory.ticketHistory;
  } catch (error) {
    console.error('[LangGraph] Error getting user ticket history:', error);
    return [];
  }
}

/**
 * Get session state (for debugging)
 * @param {string} sessionId - Session ID
 */
async function getSessionState(sessionId) {
  try {
    // Get the current state for the session
    const state = await graph.getState({ configurable: { thread_id: sessionId } });
    return state.values;
  } catch (error) {
    console.error('[LangGraph] Error getting session state:', error);
    return null;
  }
}

/**
 * Initialize the graph (preload retriever, etc.)
 */
async function initialize() {
  console.log('[LangGraph] Initializing emergency graph...');
  
  // Initialize the document retriever
  const retriever = require('./retriever');
  await retriever.initialize();
  
  console.log('[LangGraph] Emergency graph ready');
}

// Auto-initialize on module load
initialize().catch(err => {
  console.error('[LangGraph] Initialization error:', err);
});

module.exports = {
  graph,
  processMessage,
  clearSession,
  getSessionState,
  initialize,
  completeSessionWithTicket,
  getUserChatHistory,
  getUserTicketHistory,
};

