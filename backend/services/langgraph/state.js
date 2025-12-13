const { z } = require('zod');
const { Annotation } = require('@langchain/langgraph');

/**
 * Emergency State Schema
 * Tracks all information collected during the emergency call conversation
 */

// Zod schemas for validation
const LocationSchema = z.object({
  address: z.string().nullable(),
  ward: z.string().nullable(),
  district: z.string().nullable(),
  city: z.string().nullable(),
  isComplete: z.boolean(),
});

const AffectedPeopleSchema = z.object({
  total: z.number(),
  injured: z.number(),
  critical: z.number(),
});

const EmergencyTypeEnum = z.enum(['FIRE_RESCUE', 'MEDICAL', 'SECURITY']);

const StepEnum = z.enum(['location', 'emergency', 'phone', 'people', 'confirm', 'complete']);

const SupportRequiredSchema = z.object({
  police: z.boolean(),
  ambulance: z.boolean(),
  fireDepartment: z.boolean(),
  rescue: z.boolean(),
});

// Define the state annotation for LangGraph
const EmergencyStateAnnotation = Annotation.Root({
  // Session information
  sessionId: Annotation({
    reducer: (prev, next) => next || prev,
    default: () => null,
  }),
  
  // Message history (array of messages)
  messages: Annotation({
    reducer: (prev, next) => [...(prev || []), ...(Array.isArray(next) ? next : [next])],
    default: () => [],
  }),
  
  // Current user message
  currentMessage: Annotation({
    reducer: (prev, next) => next || prev,
    default: () => '',
  }),
  
  // Collected information (4 required fields)
  location: Annotation({
    reducer: (prev, next) => next ? { ...prev, ...next } : prev,
    default: () => ({
      address: null,
      ward: null,
      district: null,
      city: null,
      isComplete: false,
    }),
  }),
  
  emergencyTypes: Annotation({
    reducer: (prev, next) => {
      if (!next) return prev || [];
      // Merge unique types
      const combined = [...(prev || []), ...(Array.isArray(next) ? next : [next])];
      return [...new Set(combined)];
    },
    default: () => [],
  }),
  
  phone: Annotation({
    reducer: (prev, next) => next || prev,
    default: () => null,
  }),
  
  affectedPeople: Annotation({
    reducer: (prev, next) => next ? { ...prev, ...next } : prev,
    default: () => ({
      total: 0,
      injured: 0,
      critical: 0,
    }),
  }),
  
  // Support required flags
  supportRequired: Annotation({
    reducer: (prev, next) => next ? { ...prev, ...next } : prev,
    default: () => ({
      police: false,
      ambulance: false,
      fireDepartment: false,
      rescue: false,
    }),
  }),
  
  // Flow control
  currentStep: Annotation({
    reducer: (prev, next) => next || prev,
    default: () => 'location',
  }),
  
  confirmationShown: Annotation({
    reducer: (prev, next) => (next !== undefined ? next : prev),
    default: () => false,
  }),

  // Flag to track if first aid guidance has been shown (to avoid showing twice)
  firstAidShown: Annotation({
    reducer: (prev, next) => (next !== undefined ? next : prev),
    default: () => false,
  }),

  userConfirmed: Annotation({
    reducer: (prev, next) => (next !== undefined ? next : prev),
    default: () => false,
  }),
  
  priority: Annotation({
    reducer: (prev, next) => next || prev,
    default: () => 'HIGH',
  }),
  
  description: Annotation({
    reducer: (prev, next) => next || prev,
    default: () => null,
  }),
  
  // Output fields
  ticketId: Annotation({
    reducer: (prev, next) => next || prev,
    default: () => null,
  }),
  
  firstAidGuidance: Annotation({
    reducer: (prev, next) => next || prev,
    default: () => null,
  }),
  
  response: Annotation({
    reducer: (prev, next) => next || prev,
    default: () => '',
  }),
  
  // Flag for ticket creation
  shouldCreateTicket: Annotation({
    reducer: (prev, next) => (next !== undefined ? next : prev),
    default: () => false,
  }),
  
  // Ticket info object (for controller response)
  ticketInfo: Annotation({
    reducer: (prev, next) => next ? { ...prev, ...next } : prev,
    default: () => ({}),
  }),
});

/**
 * Helper functions for state validation
 */

/**
 * Check if location has all required fields
 */
function hasCompleteLocation(location) {
  const hasValidLocation = location.address && (
    location.ward ||
    location.city ||
    (location.address && location.address.includes(','))
  );
  
  return !!(hasValidLocation && 
    (location.ward || location.city) && 
    location.city);
}

/**
 * Check if all 4 required fields are collected
 */
function hasAllRequiredInfo(state) {
  const hasLocation = hasCompleteLocation(state.location);
  const hasEmergencyType = state.emergencyTypes && state.emergencyTypes.length > 0;
  const hasPhone = state.phone && state.phone.length >= 9;
  const hasAffectedPeople = state.affectedPeople.total > 0;
  
  return hasLocation && hasEmergencyType && hasPhone && hasAffectedPeople;
}

/**
 * Determine what information is still missing
 */
function getMissingInfo(state) {
  const missing = [];
  
  if (!hasCompleteLocation(state.location)) {
    missing.push('location');
  }
  if (!state.emergencyTypes || state.emergencyTypes.length === 0) {
    missing.push('emergency');
  }
  if (!state.phone) {
    missing.push('phone');
  }
  if (state.affectedPeople.total === 0) {
    missing.push('people');
  }
  
  return missing;
}

/**
 * Check if ticket is ready to be created (all info + user confirmation)
 */
function isTicketReady(state) {
  return hasAllRequiredInfo(state) && 
         state.confirmationShown && 
         state.userConfirmed;
}

/**
 * Build ticket info object from state
 */
function buildTicketInfo(state) {
  const locationParts = [
    state.location.address,
    state.location.ward,
    state.location.district,
    state.location.city
  ].filter(Boolean);
  
  return {
    location: locationParts.join(', '),
    landmarks: state.location.landmarks || '',
    emergencyTypes: state.emergencyTypes || [],
    emergencyType: state.emergencyTypes[0] || null, // Primary type for backwards compatibility
    description: state.description || 'Báo cáo qua tổng đài 112',
    reporter: {
      name: state.reporter?.name || 'Chưa xác định',
      phone: state.phone,
      email: state.reporter?.email || ''
    },
    affectedPeople: {
      total: state.affectedPeople.total || 1,
      injured: state.affectedPeople.injured || 0,
      critical: state.affectedPeople.critical || 0
    },
    supportRequired: state.supportRequired,
    priority: state.priority || 'HIGH'
  };
}

module.exports = {
  EmergencyStateAnnotation,
  LocationSchema,
  AffectedPeopleSchema,
  EmergencyTypeEnum,
  StepEnum,
  SupportRequiredSchema,
  hasCompleteLocation,
  hasAllRequiredInfo,
  getMissingInfo,
  isTicketReady,
  buildTicketInfo,
};

