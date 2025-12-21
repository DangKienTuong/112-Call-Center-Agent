const { ChatOpenAI } = require('@langchain/openai');
const { ExtractedInfoSchema, createExtractionPrompt, determineSupportRequired } = require('../tools/extractors');
const { validateVietnamesePhone } = require('../../../utils/phoneValidator');

/**
 * Extract Information Node
 * Uses LLM with structured output to extract emergency information from user message
 * Replaces the fragile regex-based extraction from the old system
 */

async function extractInfoNode(state) {
  console.log('[ExtractInfo] Processing message:', state.currentMessage);
  console.log('[ExtractInfo] Current state location:', JSON.stringify(state.location, null, 2));
  console.log('[ExtractInfo] Current state emergencyTypes:', state.emergencyTypes);
  console.log('[ExtractInfo] Current state phone:', state.phone);
  
  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    temperature: 0.1, // Low temperature for consistent extraction
  });
  
  // Use structured output with Zod schema
  const extractionModel = model.withStructuredOutput(ExtractedInfoSchema);
  
  // Create context with already collected info
  const collectedInfo = {
    location: state.location,
    emergencyTypes: state.emergencyTypes,
    phone: state.phone,
    affectedPeople: state.affectedPeople,
  };
  
  // Get the last operator message for context
  const lastOperatorMessage = state.messages
    ?.filter(m => m.role === 'operator')
    ?.slice(-1)[0]?.message;
  
  const prompt = createExtractionPrompt(state.currentMessage, { collectedInfo, lastOperatorMessage });
  
  try {
    // Extract information using LLM
    const extracted = await extractionModel.invoke(prompt);
    console.log('[ExtractInfo] Extracted data:', JSON.stringify(extracted, null, 2));
    
    // Build state updates
    const updates = {};
    
    // Update location if provided
    if (extracted.location) {
      const locationUpdate = {};
      if (extracted.location.address) locationUpdate.address = extracted.location.address;
      if (extracted.location.ward) locationUpdate.ward = extracted.location.ward;
      if (extracted.location.district) locationUpdate.district = extracted.location.district;
      if (extracted.location.city) locationUpdate.city = extracted.location.city;
      
      // Check if location is complete
      const hasAddress = locationUpdate.address || state.location.address;
      const hasWardOrCity = locationUpdate.ward || locationUpdate.city || state.location.ward || state.location.city;
      const hasCity = locationUpdate.city || state.location.city;
      
      if (hasAddress && hasWardOrCity && hasCity) {
        locationUpdate.isComplete = true;
      }
      
      if (Object.keys(locationUpdate).length > 0) {
        updates.location = locationUpdate;
      }
    }
    
    // Update emergency types if provided
    if (extracted.emergencyTypes && extracted.emergencyTypes.length > 0) {
      updates.emergencyTypes = extracted.emergencyTypes;
      
      // Only auto-determine support if user didn't explicitly specify it
      if (!extracted.supportRequired) {
        const support = determineSupportRequired(extracted.emergencyTypes);
        updates.supportRequired = support;
      }
    }
    
    // Update supportRequired if explicitly provided (user correction)
    // This allows users to adjust forces needed without changing emergency type
    // Takes priority over auto-determined support from emergencyTypes
    if (extracted.supportRequired) {
      // Merge with existing supportRequired to only update specified fields
      // If emergencyTypes was also updated, merge with the base from that
      const baseSupport = updates.supportRequired || state.supportRequired;
      updates.supportRequired = {
        ...baseSupport,
        ...extracted.supportRequired
      };
      console.log('[ExtractInfo] Updated supportRequired:', updates.supportRequired);
    }
    
    // Update phone if provided
    if (extracted.phone) {
      // Clean phone number
      const cleanPhone = extracted.phone.replace(/[-.\s]/g, '');
      
      // IMPORTANT: Only validate if this is a NEW phone number (different from current state)
      // This prevents re-validating an old invalid phone when user provides other info (like address)
      const currentPhone = state.phone ? state.phone.replace(/[-.\s]/g, '') : null;
      
      if (cleanPhone !== currentPhone) {
        // This is a new phone number, validate it
        const phoneValidation = validateVietnamesePhone(cleanPhone);
        
        if (phoneValidation.isValid) {
          // Use normalized phone number
          updates.phone = phoneValidation.normalized;
          updates.phoneValidationError = false; // Clear any previous error
          console.log('[ExtractInfo] Phone validated successfully:', phoneValidation.normalized);
        } else {
          // Phone is invalid, don't update phone, set error flag
          updates.phoneValidationError = true;
          console.log('[ExtractInfo] Phone validation failed:', phoneValidation.error);
        }
      } else {
        // Same phone as before, ignore it (LLM probably extracted from context)
        console.log('[ExtractInfo] Ignoring phone - same as current state:', cleanPhone);
      }
    }
    
    // Update affected people if provided
    if (extracted.affectedPeople) {
      const affectedUpdate = {};
      if (extracted.affectedPeople.total !== undefined) {
        affectedUpdate.total = extracted.affectedPeople.total;
      }
      if (extracted.affectedPeople.injured !== undefined) {
        affectedUpdate.injured = extracted.affectedPeople.injured;
      }
      if (extracted.affectedPeople.critical !== undefined) {
        affectedUpdate.critical = extracted.affectedPeople.critical;
      }
      
      // Auto-calculate total if not explicitly provided
      // This prevents infinite loop where router checks total === 0
      if (affectedUpdate.total === undefined && (affectedUpdate.injured !== undefined || affectedUpdate.critical !== undefined)) {
        const currentTotal = state.affectedPeople.total || 0;
        const currentInjured = state.affectedPeople.injured || 0;
        const currentCritical = state.affectedPeople.critical || 0;
        
        const newInjured = affectedUpdate.injured !== undefined ? affectedUpdate.injured : currentInjured;
        const newCritical = affectedUpdate.critical !== undefined ? affectedUpdate.critical : currentCritical;
        
        // If total was 0 and we now have injured/critical, set total to their sum
        // Otherwise, keep existing total
        if (currentTotal === 0) {
          affectedUpdate.total = newInjured + newCritical;
        }
      }
      
      if (Object.keys(affectedUpdate).length > 0) {
        updates.affectedPeople = affectedUpdate;
      }
    }
    
    // Update priority if provided
    if (extracted.priority) {
      updates.priority = extracted.priority;
    }
    
    // Update description if provided and not already set
    if (extracted.description && !state.description) {
      updates.description = extracted.description;
    }
    
    // Update reporter name if provided
    if (extracted.reporterName) {
      updates.reporter = { name: extracted.reporterName };
    }
    
    // Add current message to history
    updates.messages = [{
      role: 'reporter',
      message: state.currentMessage,
      timestamp: new Date(),
    }];
    
    console.log('[ExtractInfo] State updates:', JSON.stringify(updates, null, 2));
    
    return updates;
    
  } catch (error) {
    console.error('[ExtractInfo] Error during extraction:', error);
    console.log('[ExtractInfo] Falling back to regex extraction');
    
    // Fallback to regex extraction
    const fallbackUpdates = fallbackExtraction(state.currentMessage, state);
    
    // Add message to history
    fallbackUpdates.messages = [{
      role: 'reporter',
      message: state.currentMessage,
      timestamp: new Date(),
    }];
    
    console.log('[ExtractInfo] Fallback updates:', JSON.stringify(fallbackUpdates, null, 2));
    
    return fallbackUpdates;
  }
}

/**
 * Fallback extraction using regex patterns (as backup)
 * Only used if LLM extraction fails
 */
function fallbackExtraction(message, state) {
  const updates = {};
  const lowerMessage = message.toLowerCase();
  
  // Extract phone number (Vietnamese format)
  const phonePatterns = [
    /(?:0|\+84)(?:\d{9,10})/g,
    /\b\d{4}[-.\s]?\d{3}[-.\s]?\d{3}\b/g,
  ];
  
  for (const pattern of phonePatterns) {
    const match = message.match(pattern);
    if (match) {
      const cleanPhone = match[0].replace(/[-.\s]/g, '');
      
      // Only validate if this is a NEW phone number (different from current state)
      const currentPhone = state.phone ? state.phone.replace(/[-.\s]/g, '') : null;
      
      if (cleanPhone !== currentPhone) {
        // Validate Vietnamese phone format
        const phoneValidation = validateVietnamesePhone(cleanPhone);
        
        if (phoneValidation.isValid) {
          updates.phone = phoneValidation.normalized;
          updates.phoneValidationError = false;
        } else {
          updates.phoneValidationError = true;
        }
      }
      break;
    }
  }
  
  // Extract emergency types from keywords
  const emergencyTypes = new Set();
  
  // SECURITY keywords
  if (/trộm|cướp|đột nhập|ăn trộm|đánh nhau|hành hung|gây rối/i.test(lowerMessage)) {
    emergencyTypes.add('SECURITY');
  }
  
  // MEDICAL keywords
  if (/tai nạn|bị thương|chảy máu|bất tỉnh|ngất|đau tim|đột quỵ/i.test(lowerMessage)) {
    emergencyTypes.add('MEDICAL');
  }
  
  // FIRE_RESCUE keywords
  if (/cháy|lửa|khói|nổ|mắc kẹt|đuối nước|sập/i.test(lowerMessage)) {
    emergencyTypes.add('FIRE_RESCUE');
  }
  
  if (emergencyTypes.size > 0) {
    updates.emergencyTypes = Array.from(emergencyTypes);
    updates.supportRequired = determineSupportRequired(updates.emergencyTypes);
  }
  
  // Extract number of people
  const peopleMatch = message.match(/(\d+)\s*(?:người|nạn nhân)/i);
  if (peopleMatch) {
    updates.affectedPeople = { total: parseInt(peopleMatch[1]) || 0 };
  }
  
  return updates;
}

module.exports = {
  extractInfoNode,
  fallbackExtraction,
};
