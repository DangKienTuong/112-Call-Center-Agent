const { ChatOpenAI } = require('@langchain/openai');
const { ExtractedInfoSchema, createExtractionPrompt, determineSupportRequired } = require('../tools/extractors');

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
  
  const prompt = createExtractionPrompt(state.currentMessage, { collectedInfo });
  
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
      
      // Determine required support based on emergency types
      const support = determineSupportRequired(extracted.emergencyTypes);
      updates.supportRequired = support;
    }
    
    // Update phone if provided
    if (extracted.phone) {
      // Clean phone number
      const cleanPhone = extracted.phone.replace(/[-.\s]/g, '');
      updates.phone = cleanPhone;
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
      updates.phone = match[0].replace(/[-.\s]/g, '');
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

