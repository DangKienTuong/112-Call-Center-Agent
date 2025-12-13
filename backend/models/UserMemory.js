const mongoose = require('mongoose');

/**
 * UserMemory Model
 * Long-term memory storage for authenticated users
 * Stores preferences, common locations, and ticket history for quick access
 */
const userMemorySchema = new mongoose.Schema({
  // Reference to User (unique - one memory per user)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Saved user information for quick form filling
  savedInfo: {
    phone: {
      type: String,
      default: null
    },
    fullName: {
      type: String,
      default: null
    },
    // Common locations for quick selection
    commonLocations: [{
      address: String,
      ward: String,
      district: String,
      city: String,
      label: String, // e.g., "Home", "Work", "Parent's house"
      usageCount: {
        type: Number,
        default: 1
      },
      lastUsed: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Compact ticket history for quick reference
  ticketHistory: [{
    ticketId: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      required: true
    },
    emergencyTypes: [{
      type: String,
      enum: ['FIRE_RESCUE', 'MEDICAL', 'SECURITY']
    }],
    status: {
      type: String,
      enum: ['URGENT', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED']
    },
    location: String,
    description: String
  }],

  // Summary of past interactions for agent context
  conversationSummary: {
    type: String,
    default: null
  },

  // Statistics
  stats: {
    totalTickets: {
      type: Number,
      default: 0
    },
    resolvedTickets: {
      type: Number,
      default: 0
    },
    lastEmergencyType: String
  },

  // User preferences for the chat
  preferences: {
    language: {
      type: String,
      enum: ['vi', 'en'],
      default: 'vi'
    },
    quickMode: {
      type: Boolean,
      default: false // If true, skip confirmations when info is complete
    }
  },

  // Last interaction timestamp
  lastInteraction: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Static method to get or create memory for user
userMemorySchema.statics.getOrCreate = async function(userId) {
  let memory = await this.findOne({ userId });

  if (!memory) {
    memory = new this({
      userId,
      savedInfo: {
        phone: null,
        fullName: null,
        commonLocations: []
      },
      ticketHistory: [],
      stats: {
        totalTickets: 0,
        resolvedTickets: 0
      }
    });
    await memory.save();
  }

  return memory;
};

// Method to add a ticket to history
userMemorySchema.methods.addTicket = async function(ticketData) {
  const historyEntry = {
    ticketId: ticketData.ticketId,
    createdAt: ticketData.createdAt || new Date(),
    emergencyTypes: ticketData.emergencyTypes || [],
    status: ticketData.status || 'URGENT',
    location: ticketData.location,
    description: ticketData.description
  };

  this.ticketHistory.unshift(historyEntry);

  // Keep only last 50 tickets
  if (this.ticketHistory.length > 50) {
    this.ticketHistory = this.ticketHistory.slice(0, 50);
  }

  // Update stats
  this.stats.totalTickets++;
  this.stats.lastEmergencyType = ticketData.emergencyTypes?.[0];
  this.lastInteraction = new Date();

  return this.save();
};

// Method to update saved info
userMemorySchema.methods.updateSavedInfo = async function(info) {
  if (info.phone) {
    this.savedInfo.phone = info.phone;
  }
  if (info.fullName) {
    this.savedInfo.fullName = info.fullName;
  }
  this.lastInteraction = new Date();
  return this.save();
};

// Method to add or update a common location
userMemorySchema.methods.addLocation = async function(location) {
  const existingIndex = this.savedInfo.commonLocations.findIndex(
    loc => loc.address === location.address && loc.city === location.city
  );

  if (existingIndex >= 0) {
    // Update existing location
    this.savedInfo.commonLocations[existingIndex].usageCount++;
    this.savedInfo.commonLocations[existingIndex].lastUsed = new Date();
  } else {
    // Add new location
    this.savedInfo.commonLocations.push({
      address: location.address,
      ward: location.ward,
      district: location.district,
      city: location.city,
      label: location.label || null,
      usageCount: 1,
      lastUsed: new Date()
    });

    // Keep only top 10 most used locations
    if (this.savedInfo.commonLocations.length > 10) {
      this.savedInfo.commonLocations.sort((a, b) => b.usageCount - a.usageCount);
      this.savedInfo.commonLocations = this.savedInfo.commonLocations.slice(0, 10);
    }
  }

  return this.save();
};

// Method to get recent tickets
userMemorySchema.methods.getRecentTickets = function(limit = 5) {
  return this.ticketHistory.slice(0, limit);
};

// Method to update ticket status in history
userMemorySchema.methods.updateTicketStatus = async function(ticketId, newStatus) {
  const ticket = this.ticketHistory.find(t => t.ticketId === ticketId);
  if (ticket) {
    ticket.status = newStatus;
    if (newStatus === 'RESOLVED') {
      this.stats.resolvedTickets++;
    }
    return this.save();
  }
  return this;
};

// Method to build context for LangGraph
userMemorySchema.methods.buildContext = function() {
  return {
    savedPhone: this.savedInfo.phone,
    savedName: this.savedInfo.fullName,
    commonLocations: this.savedInfo.commonLocations.slice(0, 3),
    recentTickets: this.ticketHistory.slice(0, 3).map(t => ({
      ticketId: t.ticketId,
      date: t.createdAt,
      type: t.emergencyTypes?.[0],
      status: t.status,
      location: t.location
    })),
    totalTickets: this.stats.totalTickets,
    preferences: this.preferences
  };
};

module.exports = mongoose.model('UserMemory', userMemorySchema);
