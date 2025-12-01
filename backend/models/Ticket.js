const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['URGENT', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
    default: 'URGENT'
  },
  // Reporter Information
  reporter: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: String
  },
  // Incident Location
  location: {
    address: {
      type: String,
      required: true
    },
    street: String,
    ward: String,
    district: String,
    city: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  // Emergency Details
  // FIRE_RESCUE: Phòng cháy chữa cháy và Cứu nạn cứu hộ
  // MEDICAL: Cấp cứu
  // SECURITY: An ninh
  emergencyType: {
    type: String,
    enum: ['FIRE_RESCUE', 'MEDICAL', 'SECURITY'],
    required: true
  },
  emergencySubType: String,
  description: {
    type: String,
    required: true
  },
  // Affected People
  affectedPeople: {
    total: {
      type: Number,
      default: 0
    },
    injured: {
      type: Number,
      default: 0
    },
    critical: {
      type: Number,
      default: 0
    },
    deceased: {
      type: Number,
      default: 0
    },
    status: String
  },
  // Required Support
  supportRequired: {
    police: {
      type: Boolean,
      default: false
    },
    ambulance: {
      type: Boolean,
      default: false
    },
    fireDepartment: {
      type: Boolean,
      default: false
    },
    rescue: {
      type: Boolean,
      default: false
    },
    other: String
  },
  // Additional Information
  additionalInfo: {
    assets: String,
    hazardousMaterials: String,
    specialRequirements: String,
    notes: String
  },
  // Chat History
  chatHistory: [{
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
  // Operator Information
  assignedOperator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Response Team
  responseTeam: [{
    unit: String,
    dispatchedAt: Date,
    arrivedAt: Date,
    status: {
      type: String,
      enum: ['DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'COMPLETED']
    }
  }],
  // Timestamps
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'HIGH'
  },
  resolvedAt: Date,
  notes: [String]
}, {
  timestamps: true
});

// Indexes for better query performance
ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ emergencyType: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ 'location.district': 1, 'location.city': 1 });

// Generate ticket ID
ticketSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN').replace(/\//g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    this.ticketId = `TD-${dateStr}-${timeStr}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);