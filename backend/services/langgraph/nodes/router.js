const { hasAllRequiredInfo, hasCompleteLocation } = require('../state');
const { ConfirmationCheckSchema } = require('../tools/extractors');
const { ChatOpenAI } = require('@langchain/openai');
const { isTicketQuery } = require('./memoryRetrieval');

/**
 * Router Node
 * Determines which node to go to next based on the current state
 * This is the decision-making heart of the graph
 */

async function routerNode(state) {
  console.log('[Router] Current state:', {
    location: state.location,
    emergencyTypes: state.emergencyTypes,
    phone: state.phone,
    affectedPeople: state.affectedPeople,
    confirmationShown: state.confirmationShown,
    userConfirmed: state.userConfirmed,
    isAuthenticated: state.isAuthenticated,
  });

  // Check if user is asking about past tickets (only if authenticated or message suggests it)
  if (isTicketQuery(state.currentMessage)) {
    console.log('[Router] Ticket query detected -> memoryRetrieval');
    return {
      currentStep: 'ticketQuery',
    };
  }

  // If we're in confirmation stage
  if (state.confirmationShown && !state.userConfirmed) {
    // Check if user is confirming or correcting
    const isConfirming = await checkUserConfirmation(state.currentMessage);
    
    if (isConfirming) {
      console.log('[Router] User confirmed -> createTicket');
      return {
        currentStep: 'complete',
        userConfirmed: true,
        shouldCreateTicket: true,
      };
    } else {
      console.log('[Router] User correcting info -> back to collection');
      return {
        confirmationShown: false,
        userConfirmed: false,
        currentStep: determineNextStep(state),
      };
    }
  }
  
  // Check if all required info is collected
  if (hasAllRequiredInfo(state) && !state.confirmationShown) {
    console.log('[Router] All info collected -> showConfirmation');
    return {
      currentStep: 'confirm',
    };
  }
  
  // Determine what's missing and go to appropriate collection node
  const nextStep = determineNextStep(state);
  console.log('[Router] Next step:', nextStep);
  
  return {
    currentStep: nextStep,
  };
}

/**
 * Determine the next step based on missing information
 * Priority order (updated flow):
 * 1. Emergency type (tình hình thực trạng - what's happening)
 * 2. First aid guidance (hướng dẫn xử lý ban đầu - after knowing the situation)
 * 3. Location (địa chỉ cụ thể)
 * 4. Phone (số điện thoại người báo cáo)
 * 5. Affected people count
 * 6. Confirmation
 */
function determineNextStep(state) {
  // Priority 1: Emergency type (must know what's happening first)
  if (!state.emergencyTypes || state.emergencyTypes.length === 0) {
    return 'emergency';
  }

  // Priority 2: Show first aid guidance after knowing emergency type (only once)
  if (!state.firstAidShown && state.emergencyTypes.length > 0) {
    return 'firstAid';
  }

  // Priority 3: Location (where is the emergency)
  if (!hasCompleteLocation(state.location)) {
    return 'location';
  }

  // Priority 4: Phone (contact number for responders)
  if (!state.phone || state.phone.length < 9) {
    return 'phone';
  }

  // Priority 5: Affected people (need to know scale)
  if (state.affectedPeople.total === 0) {
    return 'people';
  }

  // All info collected
  return 'confirm';
}

/**
 * Check if user is confirming information using LLM
 */
async function checkUserConfirmation(message) {
  // Quick keyword check first
  const confirmKeywords = ['đúng', 'xác nhận', 'ok', 'yes', 'đúng rồi', 'chính xác', 'đồng ý', 'oke', 'ừ', 'uh', 'vâng', 'được'];
  const lowerMessage = message.toLowerCase().trim();
  
  if (confirmKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return true;
  }
  
  // If not obvious, use LLM to check
  try {
    const model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: 0,
    });
    
    const confirmationModel = model.withStructuredOutput(ConfirmationCheckSchema);
    
    const result = await confirmationModel.invoke(`
Người dùng vừa được hỏi xác nhận thông tin. Họ trả lời: "${message}"

Họ có đang xác nhận (đồng ý với thông tin) hay đang sửa/phản đối?
    `);
    
    return result.isConfirming && !result.isCorrection;
  } catch (error) {
    console.error('[Router] Error checking confirmation:', error);
    // Fallback to keyword check
    return false;
  }
}

/**
 * Conditional edge function for LangGraph
 * Returns the name of the next node to execute
 */
function routeToNextNode(state) {
  const step = state.currentStep;

  console.log('[Router] Routing based on step:', step);

  switch (step) {
    case 'ticketQuery':
      return 'memoryRetrieval';
    case 'emergency':
      return 'collectEmergency';
    case 'firstAid':
      return 'showFirstAidGuidance';
    case 'location':
      return 'collectLocation';
    case 'phone':
      return 'collectPhone';
    case 'people':
      return 'collectPeople';
    case 'confirm':
      return 'showConfirmation';
    case 'complete':
      return 'createTicket';
    default:
      return 'collectEmergency'; // Default: ask about the situation first
  }
}

module.exports = {
  routerNode,
  routeToNextNode,
  determineNextStep,
  checkUserConfirmation,
};

