const { StateGraph, END } = require('@langchain/langgraph');
const { MemorySaver } = require('@langchain/langgraph');
const { EmergencyStateAnnotation } = require('./state');
const { extractInfoNode } = require('./nodes/extractInfo');
const { routerNode, routeToNextNode } = require('./nodes/router');
const { 
  collectLocationNode, 
  collectEmergencyNode, 
  collectPhoneNode, 
  collectPeopleNode 
} = require('./nodes/collectInfo');
const { showConfirmationNode, createTicketNode } = require('./nodes/confirm');
const { firstAidRagNode } = require('./nodes/firstAidRag');

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
workflow.addNode('collectLocation', collectLocationNode);
workflow.addNode('collectEmergency', collectEmergencyNode);
workflow.addNode('collectPhone', collectPhoneNode);
workflow.addNode('collectPeople', collectPeopleNode);
workflow.addNode('showConfirmation', showConfirmationNode);
workflow.addNode('createTicket', createTicketNode);
workflow.addNode('firstAidRag', firstAidRagNode);

// Define the flow edges
// Start with extractInfo node
workflow.setEntryPoint('extractInfo');

// After extraction, always go to router
workflow.addEdge('extractInfo', 'router');

// Router decides which collection node to go to
workflow.addConditionalEdges(
  'router',
  routeToNextNode,
  {
    collectLocation: 'collectLocation',
    collectEmergency: 'collectEmergency',
    collectPhone: 'collectPhone',
    collectPeople: 'collectPeople',
    showConfirmation: 'showConfirmation',
    createTicket: 'createTicket',
  }
);

// All collection nodes loop back to extractInfo
// (waiting for user's next message with the requested info)
workflow.addEdge('collectLocation', END);
workflow.addEdge('collectEmergency', END);
workflow.addEdge('collectPhone', END);
workflow.addEdge('collectPeople', END);

// After showing confirmation, wait for user response
workflow.addEdge('showConfirmation', END);

// After ticket creation, get first aid guidance
workflow.addEdge('createTicket', 'firstAidRag');

// After first aid guidance, end
workflow.addEdge('firstAidRag', END);

// Compile the graph with memory checkpointer for session persistence
const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });

/**
 * Process a message in the emergency conversation
 * @param {Object} input - Input containing message and optional context
 * @param {string} input.message - The user's message
 * @param {Array} input.context - Optional conversation context
 * @param {string} sessionId - Session ID for state persistence
 * @returns {Object} Response with message, ticket info, and flags
 */
async function processMessage(message, sessionId, context = []) {
  console.log(`\n=== Processing Message for Session ${sessionId} ===`);
  console.log('Message:', message);
  
  try {
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
  // With MemorySaver, sessions are automatically managed
  // This function is kept for API compatibility
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
};

