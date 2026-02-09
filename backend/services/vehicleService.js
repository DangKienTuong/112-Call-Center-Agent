const Vehicle = require('../models/Vehicle');
const Ticket = require('../models/Ticket');

/**
 * Vehicle Service
 * Handles vehicle assignment logic for emergency tickets
 */

/**
 * Map emergency types to required vehicle types
 * @param {Array<string>} emergencyTypes - Array of emergency types (FIRE_RESCUE, MEDICAL, SECURITY)
 * @returns {Array<string>} Array of vehicle types needed
 */
function mapEmergencyToVehicleTypes(emergencyTypes) {
  const vehicleTypes = new Set();
  
  if (!emergencyTypes || emergencyTypes.length === 0) {
    return [];
  }
  
  emergencyTypes.forEach(type => {
    switch (type) {
      case 'FIRE_RESCUE':
        vehicleTypes.add('FIRE_TRUCK');
        vehicleTypes.add('AMBULANCE'); // Fire incidents often need medical support
        break;
      case 'MEDICAL':
        vehicleTypes.add('AMBULANCE');
        break;
      case 'SECURITY':
        vehicleTypes.add('POLICE');
        break;
    }
  });
  
  return Array.from(vehicleTypes);
}

/**
 * Shuffle array and take n elements (random selection)
 * @param {Array} array - Array to shuffle
 * @param {number} count - Number of elements to take
 * @returns {Array} Shuffled subset of array
 */
function shuffleAndTake(array, count) {
  if (!array || array.length === 0) return [];
  if (count >= array.length) return array;
  
  // Fisher-Yates shuffle
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
}

/**
 * Find available vehicles for a location
 * @param {Object} location - Location object with ward, district, city
 * @param {Array<string>} emergencyTypes - Emergency types
 * @param {Object} requirements - Vehicle requirements { ambulances, policeCars, fireTrucks }
 * @returns {Promise<Array>} Array of available vehicles
 */
async function findAvailableVehicles(location, emergencyTypes, requirements = {}) {
  try {
    console.log('[VehicleService] ===== FINDING VEHICLES =====');
    console.log('[VehicleService] Location:', JSON.stringify(location));
    console.log('[VehicleService] Emergency types:', emergencyTypes);
    console.log('[VehicleService] Requirements:', requirements);
    
    if (!location || !location.ward) {
      console.log('[VehicleService] ❌ Invalid location, no ward specified');
      return [];
    }
    
    console.log(`[VehicleService] ✓ Looking for vehicles covering ward: "${location.ward}"`);
    
    // Determine vehicle types needed
    const vehicleTypes = mapEmergencyToVehicleTypes(emergencyTypes);
    console.log('[VehicleService] Vehicle types needed:', vehicleTypes);
    
    if (vehicleTypes.length === 0) {
      console.log('[VehicleService] No vehicle types determined');
      return [];
    }
    
    const selectedVehicles = [];
    
    // For each vehicle type, find and select required count
    for (const vehicleType of vehicleTypes) {
      let requiredCount = 1; // Default to 1
      
      // Use specific requirements if provided
      if (vehicleType === 'AMBULANCE' && requirements.ambulances) {
        requiredCount = requirements.ambulances;
      } else if (vehicleType === 'POLICE' && requirements.policeCars) {
        requiredCount = requirements.policeCars;
      } else if (vehicleType === 'FIRE_TRUCK' && requirements.fireTrucks) {
        requiredCount = requirements.fireTrucks;
      }
      
      console.log(`[VehicleService] Looking for ${requiredCount} ${vehicleType} vehicles`);
      
      // Find available vehicles of this type for the location
      const matchingVehicles = await Vehicle.findAvailableForLocation(
        location,
        [vehicleType]
      );
      
      console.log(`[VehicleService] Found ${matchingVehicles.length} available ${vehicleType} vehicles`);
      if (matchingVehicles.length > 0) {
        console.log(`[VehicleService] → Vehicles: ${matchingVehicles.map(v => v.vehicleId).join(', ')}`);
      }
      
      // Randomly select required count
      const selected = shuffleAndTake(matchingVehicles, requiredCount);
      selectedVehicles.push(...selected);
      
      console.log(`[VehicleService] Selected ${selected.length} ${vehicleType} vehicles`);
    }
    
    console.log(`[VehicleService] Total vehicles selected: ${selectedVehicles.length}`);
    return selectedVehicles;
    
  } catch (error) {
    console.error('[VehicleService] Error finding vehicles:', error);
    return [];
  }
}

/**
 * Assign vehicles to a ticket
 * @param {string} ticketId - Ticket ID
 * @param {Array} vehicles - Array of vehicle objects to assign
 * @returns {Promise<Array>} Array of assigned vehicle info
 */
async function assignVehiclesToTicket(ticketId, vehicles) {
  try {
    console.log(`[VehicleService] Assigning ${vehicles.length} vehicles to ticket ${ticketId}`);
    
    if (!vehicles || vehicles.length === 0) {
      console.log('[VehicleService] No vehicles to assign');
      return [];
    }
    
    const assignedVehicles = [];
    
    // Update each vehicle's status
    for (const vehicle of vehicles) {
      await vehicle.startMission(ticketId);
      
      assignedVehicles.push({
        vehicleId: vehicle.vehicleId,
        type: vehicle.type,
        licensePlate: vehicle.licensePlate,
        assignedAt: new Date(),
        status: 'DISPATCHED'
      });
      
      console.log(`[VehicleService] Assigned vehicle ${vehicle.vehicleId} (${vehicle.licensePlate})`);
    }
    
    // Update ticket with assigned vehicles
    await Ticket.findOneAndUpdate(
      { ticketId: ticketId },
      { $set: { assignedVehicles: assignedVehicles } }
    );
    
    console.log(`[VehicleService] Updated ticket ${ticketId} with ${assignedVehicles.length} vehicles`);
    
    return assignedVehicles;
    
  } catch (error) {
    console.error('[VehicleService] Error assigning vehicles:', error);
    throw error;
  }
}

/**
 * Find and assign vehicles in one operation
 * @param {string} ticketId - Ticket ID
 * @param {Object} location - Location object
 * @param {Array<string>} emergencyTypes - Emergency types
 * @param {Object} requirements - Vehicle requirements
 * @returns {Promise<Array>} Array of assigned vehicles
 */
async function findAndAssignVehicles(ticketId, location, emergencyTypes, requirements = {}) {
  try {
    console.log(`[VehicleService] Finding and assigning vehicles for ticket ${ticketId}`);
    
    const availableVehicles = await findAvailableVehicles(location, emergencyTypes, requirements);
    
    if (availableVehicles.length === 0) {
      console.log('[VehicleService] No available vehicles found');
      return [];
    }
    
    const assignedVehicles = await assignVehiclesToTicket(ticketId, availableVehicles);
    
    return assignedVehicles;
    
  } catch (error) {
    console.error('[VehicleService] Error in findAndAssignVehicles:', error);
    throw error;
  }
}

/**
 * Release vehicles from a ticket (mark mission as completed)
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<number>} Number of vehicles released
 */
async function releaseVehicles(ticketId) {
  try {
    console.log(`[VehicleService] Releasing vehicles from ticket ${ticketId}`);
    
    // Find all vehicles on this mission
    const vehicles = await Vehicle.find({
      'currentMission.ticketId': ticketId,
      status: 'ON_MISSION'
    });
    
    console.log(`[VehicleService] Found ${vehicles.length} vehicles to release`);
    
    // Complete mission for each vehicle
    for (const vehicle of vehicles) {
      await vehicle.completeMission();
      console.log(`[VehicleService] Released vehicle ${vehicle.vehicleId}`);
    }
    
    // Update ticket vehicle statuses to COMPLETED
    await Ticket.findOneAndUpdate(
      { ticketId: ticketId },
      { 
        $set: { 
          'assignedVehicles.$[].status': 'COMPLETED',
          'assignedVehicles.$[].completedAt': new Date()
        }
      }
    );
    
    return vehicles.length;
    
  } catch (error) {
    console.error('[VehicleService] Error releasing vehicles:', error);
    throw error;
  }
}

/**
 * Update vehicle status for a specific ticket
 * @param {string} ticketId - Ticket ID
 * @param {string} vehicleId - Vehicle ID
 * @param {string} status - New status (EN_ROUTE, ON_SCENE, COMPLETED)
 * @returns {Promise<boolean>} Success status
 */
async function updateVehicleStatus(ticketId, vehicleId, status) {
  try {
    console.log(`[VehicleService] Updating vehicle ${vehicleId} status to ${status} for ticket ${ticketId}`);
    
    const updateData = { status };
    
    if (status === 'ON_SCENE') {
      updateData.arrivedAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }
    
    // Update in ticket
    const result = await Ticket.findOneAndUpdate(
      { 
        ticketId: ticketId,
        'assignedVehicles.vehicleId': vehicleId
      },
      { 
        $set: { 'assignedVehicles.$': updateData }
      }
    );
    
    return result !== null;
    
  } catch (error) {
    console.error('[VehicleService] Error updating vehicle status:', error);
    throw error;
  }
}

/**
 * Get vehicle statistics
 * @returns {Promise<Object>} Vehicle statistics
 */
async function getVehicleStatistics() {
  try {
    const total = await Vehicle.countDocuments();
    const available = await Vehicle.countDocuments({ status: 'AVAILABLE' });
    const onMission = await Vehicle.countDocuments({ status: 'ON_MISSION' });
    const maintenance = await Vehicle.countDocuments({ status: 'MAINTENANCE' });
    
    const byType = await Vehicle.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] }
          },
          onMission: {
            $sum: { $cond: [{ $eq: ['$status', 'ON_MISSION'] }, 1, 0] }
          }
        }
      }
    ]);
    
    return {
      total,
      available,
      onMission,
      maintenance,
      byType
    };
    
  } catch (error) {
    console.error('[VehicleService] Error getting statistics:', error);
    throw error;
  }
}

module.exports = {
  mapEmergencyToVehicleTypes,
  findAvailableVehicles,
  assignVehiclesToTicket,
  findAndAssignVehicles,
  releaseVehicles,
  updateVehicleStatus,
  getVehicleStatistics
};

