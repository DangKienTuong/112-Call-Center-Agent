const { hasAllRequiredInfo, hasCompleteLocation } = require('../state');
const { ConfirmationCheckSchema } = require('../tools/extractors');
const { ChatOpenAI } = require('@langchain/openai');

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
  });
  
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
 * Priority order: location -> emergency -> phone -> people
 */
function determineNextStep(state) {
  // Priority 1: Location (most important for emergency response)
  if (!hasCompleteLocation(state.location)) {
    return 'location';
  }
  
  // Priority 2: Emergency type (need to know what to dispatch)
  if (!state.emergencyTypes || state.emergencyTypes.length === 0) {
    return 'emergency';
  }
  
  // Priority 3: Phone (need contact number)
  if (!state.phone || state.phone.length < 9) {
    return 'phone';
  }
  
  // Priority 4: Affected people (need to know scale)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d829d33b-6fb1-464a-9714-f6b338a91340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'router.js:81',message:'Checking affectedPeople',data:{total:state.affectedPeople.total,injured:state.affectedPeople.injured,critical:state.affectedPeople.critical,checkResult:state.affectedPeople.total===0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  if (state.affectedPeople.total === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d829d33b-6fb1-464a-9714-f6b338a91340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'router.js:83',message:'total===0, routing to people',data:{willReturn:'people'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    return 'people';
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d829d33b-6fb1-464a-9714-f6b338a91340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'router.js:90',message:'All info collected, routing to confirm',data:{willReturn:'confirm'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
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
    case 'location':
      return 'collectLocation';
    case 'emergency':
      return 'collectEmergency';
    case 'phone':
      return 'collectPhone';
    case 'people':
      return 'collectPeople';
    case 'confirm':
      return 'showConfirmation';
    case 'complete':
      return 'createTicket';
    default:
      return 'collectLocation'; // Default fallback
  }
}

module.exports = {
  routerNode,
  routeToNextNode,
  determineNextStep,
  checkUserConfirmation,
};

