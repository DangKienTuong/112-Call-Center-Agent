const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['AMBULANCE', 'POLICE', 'FIRE_TRUCK'],
    required: true
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true
  },
  station: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  coverage: [{
    ward: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true,
      default: 'Thành phố Hồ Chí Minh'
    }
  }],
  status: {
    type: String,
    enum: ['AVAILABLE', 'ON_MISSION', 'MAINTENANCE'],
    default: 'AVAILABLE'
  },
  currentMission: {
    ticketId: String,
    assignedAt: Date
  },
  specifications: {
    capacity: Number,
    equipment: [String]
  },
  missionHistory: [{
    ticketId: String,
    assignedAt: Date,
    completedAt: Date,
    duration: Number
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
vehicleSchema.index({ vehicleId: 1 });
vehicleSchema.index({ type: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ 'coverage.ward': 1, 'coverage.district': 1, 'coverage.city': 1 });
vehicleSchema.index({ type: 1, status: 1 }); // Compound index for common queries

// Virtual to get vehicle display name
vehicleSchema.virtual('displayName').get(function() {
  const typeMap = {
    'AMBULANCE': 'Xe cấp cứu',
    'POLICE': 'Xe công an',
    'FIRE_TRUCK': 'Xe cứu hỏa'
  };
  return `${typeMap[this.type]} ${this.licensePlate}`;
});

// Method to check if vehicle can serve a location
vehicleSchema.methods.canServeLocation = function(location) {
  if (!location || !location.ward) return false;
  
  return this.coverage.some(c => 
    c.ward === location.ward &&
    c.city === location.city
  );
};

// Method to start a mission
vehicleSchema.methods.startMission = function(ticketId) {
  this.status = 'ON_MISSION';
  this.currentMission = {
    ticketId: ticketId,
    assignedAt: new Date()
  };
  return this.save();
};

// Method to complete a mission
vehicleSchema.methods.completeMission = function() {
  if (this.currentMission && this.currentMission.ticketId) {
    const duration = Date.now() - this.currentMission.assignedAt.getTime();
    
    this.missionHistory.push({
      ticketId: this.currentMission.ticketId,
      assignedAt: this.currentMission.assignedAt,
      completedAt: new Date(),
      duration: duration
    });
    
    this.currentMission = undefined;
  }
  
  this.status = 'AVAILABLE';
  return this.save();
};

// Static method to find available vehicles for a location and types
vehicleSchema.statics.findAvailableForLocation = async function(location, vehicleTypes) {
  if (!location || !location.ward) return [];
  
  const query = {
    type: { $in: vehicleTypes },
    status: 'AVAILABLE',
    'coverage': {
      $elemMatch: {
        ward: location.ward,
        city: location.city
      }
    }
  };
  
  return this.find(query);
};

module.exports = mongoose.model('Vehicle', vehicleSchema);
