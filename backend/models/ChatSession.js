const mongoose = require('mongoose');

/**
 * ChatSession Model
 * Stores chat sessions with optional user association for authenticated users
 * Guest sessions are saved temporarily with sessionId only
 */
const chatSessionSchema = new mongoose.Schema({
  // Unique session identifier (used for both guests and authenticated users)
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Reference to User (optional - null for guest sessions)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },

  // Chat messages
  messages: [{
    role: {
      type: String,
      enum: ['operator', 'reporter', 'system'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Reference to created ticket (if any)
  ticketId: {
    type: String,
    default: null
  },

  // Session status
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },

  // Serialized LangGraph state for persistence
  langgraphState: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // Last checkpoint data for LangGraph
  checkpoint: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // Metadata for the session
  metadata: {
    userAgent: String,
    ipAddress: String,
    language: {
      type: String,
      default: 'vi'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ status: 1 });
chatSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 * 30 }); // TTL: 30 days for guest sessions

// Static method to find or create session
chatSessionSchema.statics.findOrCreateSession = async function(sessionId, userId = null) {
  let session = await this.findOne({ sessionId });

  if (!session) {
    session = new this({
      sessionId,
      userId,
      messages: [],
      status: 'active'
    });
    await session.save();
  } else if (userId && !session.userId) {
    // Link guest session to user when they login
    session.userId = userId;
    await session.save();
  }

  return session;
};

// Method to add message
chatSessionSchema.methods.addMessage = async function(role, message) {
  this.messages.push({
    role,
    message,
    timestamp: new Date()
  });
  return this.save();
};

// Method to complete session with ticket
chatSessionSchema.methods.completeWithTicket = async function(ticketId) {
  this.ticketId = ticketId;
  this.status = 'completed';
  return this.save();
};

// Method to save LangGraph checkpoint
chatSessionSchema.methods.saveCheckpoint = async function(checkpoint, state) {
  this.checkpoint = checkpoint;
  this.langgraphState = state;
  return this.save();
};

module.exports = mongoose.model('ChatSession', chatSessionSchema);
