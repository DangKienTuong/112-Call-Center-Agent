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
      // User is correcting/updating info
      // The extractInfo node will have already extracted the corrections
      // After extraction, we should show confirmation again (not ask other questions)
      console.log('[Router] User correcting info -> will show updated confirmation');
      return {
        confirmationShown: false, // Reset so it will show again
        userConfirmed: false,
        currentStep: 'confirm', // Go directly back to confirmation
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
 * 4. Phone (số điện thoại người báo cáo) - skip if authenticated user has phone
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
  // Skip if authenticated user has phone from userMemory (but validate it first)
  let hasPhoneFromMemory = false;
  if (state.isAuthenticated && state.userMemory?.savedPhone) {
    // Validate phone from user memory
    const { validateVietnamesePhone } = require('../../../utils/phoneValidator');
    const validation = validateVietnamesePhone(state.userMemory.savedPhone);
    hasPhoneFromMemory = validation.isValid;
    if (!validation.isValid) {
      console.log('[Router] Phone from userMemory is invalid:', state.userMemory.savedPhone);
    }
  }
  
  const hasValidPhone = state.phone && state.phone.length >= 9;

  // If phone validation failed, go back to collectPhone to ask again
  if (state.phoneValidationError) {
    return 'phone';
  }

  if (!hasValidPhone && !hasPhoneFromMemory) {
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
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for CORRECTION keywords first (higher priority)
  const correctionKeywords = [
    'không', 'sai', 'nhầm', 'không phải', 'chưa đúng', 'sửa', 'thay đổi', 
    'không đúng', 'xin lỗi', 'sorry', 'chỉnh', 'đổi', 'khác', 'không chính xác',
    'cập nhật', 'thực ra', 'thật ra'
  ];
  
  // If message contains correction keywords, it's NOT a confirmation
  if (correctionKeywords.some(keyword => lowerMessage.includes(keyword))) {
    console.log('[Router] Detected correction keyword, not a confirmation');
    return false;
  }
  
  // Quick keyword check for confirmation (only if no correction keywords)
  const confirmKeywords = ['đúng', 'xác nhận', 'ok', 'yes', 'đúng rồi', 'chính xác', 'đồng ý', 'oke', 'ừ', 'uh', 'vâng', 'được'];
  
  // Check if it's a simple, short confirmation (avoid false positives like "địa chỉ đúng là...")
  if (lowerMessage.length < 20 && confirmKeywords.some(keyword => lowerMessage === keyword || lowerMessage.startsWith(keyword + ' ') || lowerMessage.endsWith(' ' + keyword))) {
    return true;
  }
  
  // If message is longer or ambiguous, use LLM to check
  try {
    const model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: 0,
    });
    
    const confirmationModel = model.withStructuredOutput(ConfirmationCheckSchema);
    
    const result = await confirmationModel.invoke(`
Người dùng vừa được hỏi xác nhận thông tin. Họ trả lời: "${message}"

QUAN TRỌNG:
- Nếu họ đang SỬA/CHỈNH/THAY ĐỔI bất kỳ thông tin nào → isConfirming = false, isCorrection = true
- Nếu họ nói có SỰ NHẦM LẪN hoặc XIN LỖI → isConfirming = false, isCorrection = true
- Chỉ khi họ ĐỒNG Ý/XÁC NHẬN đơn giản → isConfirming = true, isCorrection = false

Ví dụ:
- "đúng" → isConfirming = true, isCorrection = false
- "xin lỗi, địa chỉ đúng là..." → isConfirming = false, isCorrection = true
- "không phải, tôi cần..." → isConfirming = false, isCorrection = true

Họ có đang xác nhận (đồng ý với thông tin) hay đang sửa/phản đối?
    `);
    
    console.log('[Router] LLM confirmation check result:', result);
    return result.isConfirming && !result.isCorrection;
  } catch (error) {
    console.error('[Router] Error checking confirmation:', error);
    // Fallback: if message is very short and has confirm keyword, assume confirm
    // Otherwise assume correction to be safe
    return lowerMessage.length < 10 && confirmKeywords.some(k => lowerMessage.includes(k));
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

