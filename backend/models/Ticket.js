const mongoose = require('mongoose');
const { validateVietnamesePhone } = require('../utils/phoneValidator');

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
      required: true,
      validate: {
        validator: function(v) {
          const validation = validateVietnamesePhone(v);
          return validation.isValid;
        },
        message: props => {
          const validation = validateVietnamesePhone(props.value);
          return validation.error || 'Số điện thoại không hợp lệ';
        }
      }
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
  // Emergency Details - Có thể có nhiều loại cùng lúc
  // FIRE_RESCUE: Phòng cháy chữa cháy và Cứu nạn cứu hộ (cháy, nổ, mắc kẹt, đuối nước, sập đổ...)
  // MEDICAL: Cấp cứu y tế (người bị thương, tai nạn giao thông, nguy kịch, bất tỉnh...)
  // SECURITY: An ninh trật tự (trộm, cướp, đánh nhau, giết người, đua xe...)
  emergencyTypes: [{
    type: String,
    enum: ['FIRE_RESCUE', 'MEDICAL', 'SECURITY']
  }],
  // Loại chính (ưu tiên cao nhất) - để tương thích ngược
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
ticketSchema.index({ emergencyTypes: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ 'location.district': 1, 'location.city': 1 });

// Generate ticket ID with random suffix to ensure uniqueness
ticketSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.ticketId = `TD-${dateStr}-${timeStr}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);