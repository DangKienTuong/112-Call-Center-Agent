const Vehicle = require('../models/Vehicle');
const Ticket = require('../models/Ticket');
const vehicleService = require('../services/vehicleService');

/**
 * Vehicle Controller
 * Handles all vehicle management endpoints
 */

// Create new vehicle (Admin only)
exports.createVehicle = async (req, res) => {
  try {
    const vehicleData = req.body;

    // Add creator info if available
    if (req.user) {
      vehicleData.createdBy = req.user._id;
    }

    const vehicle = new Vehicle(vehicleData);
    await vehicle.save();

    console.log(`[VehicleController] Vehicle created: ${vehicle.vehicleId}`);

    res.status(201).json({
      success: true,
      data: vehicle,
      message: 'Vehicle created successfully'
    });
  } catch (error) {
    console.error('[VehicleController] Error creating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vehicle',
      error: error.message
    });
  }
};

// Get all vehicles with filters
exports.getVehicles = async (req, res) => {
  try {
    const {
      type,
      status,
      ward,
      district,
      city,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    
    // Filter by coverage
    if (ward || district || city) {
      query['coverage'] = {};
      if (ward) query['coverage'].ward = ward;
      if (district) query['coverage'].district = district;
      if (city) query['coverage'].city = city;
    }

    const vehicles = await Vehicle.find(query)
      .sort({ type: 1, vehicleId: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Vehicle.countDocuments(query);

    res.json({
      success: true,
      data: vehicles,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalVehicles: count
    });
  } catch (error) {
    console.error('[VehicleController] Error fetching vehicles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicles',
      error: error.message
    });
  }
};

// Get single vehicle by ID or vehicleId
exports.getVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    let vehicle;

    // Try by vehicleId first (e.g., CC-001)
    vehicle = await Vehicle.findOne({ vehicleId: id });
    
    // If not found, try by MongoDB _id
    if (!vehicle) {
      vehicle = await Vehicle.findById(id);
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    console.error('[VehicleController] Error fetching vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle',
      error: error.message
    });
  }
};

// Update vehicle (Admin only)
exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    let vehicle;

    // Try by vehicleId first
    vehicle = await Vehicle.findOneAndUpdate(
      { vehicleId: id },
      req.body,
      { new: true, runValidators: true }
    );

    // If not found, try by MongoDB _id
    if (!vehicle) {
      vehicle = await Vehicle.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      );
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    console.log(`[VehicleController] Vehicle updated: ${vehicle.vehicleId}`);

    res.json({
      success: true,
      data: vehicle,
      message: 'Vehicle updated successfully'
    });
  } catch (error) {
    console.error('[VehicleController] Error updating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle',
      error: error.message
    });
  }
};

// Delete vehicle (Admin only)
exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    let vehicle;

    // Try by vehicleId first
    vehicle = await Vehicle.findOneAndDelete({ vehicleId: id });

    // If not found, try by MongoDB _id
    if (!vehicle) {
      vehicle = await Vehicle.findByIdAndDelete(id);
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    console.log(`[VehicleController] Vehicle deleted: ${vehicle.vehicleId}`);

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('[VehicleController] Error deleting vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle',
      error: error.message
    });
  }
};

// Update vehicle status only
exports.updateVehicleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['AVAILABLE', 'ON_MISSION', 'MAINTENANCE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    let vehicle = await Vehicle.findOne({ vehicleId: id });
    if (!vehicle) {
      vehicle = await Vehicle.findById(id);
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // If changing to AVAILABLE, complete any current mission
    if (status === 'AVAILABLE' && vehicle.status === 'ON_MISSION') {
      await vehicle.completeMission();
    } else {
      vehicle.status = status;
      await vehicle.save();
    }

    console.log(`[VehicleController] Vehicle status updated: ${vehicle.vehicleId} -> ${status}`);

    res.json({
      success: true,
      data: vehicle,
      message: `Vehicle status updated to ${status}`
    });
  } catch (error) {
    console.error('[VehicleController] Error updating vehicle status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle status',
      error: error.message
    });
  }
};

// Get vehicle mission history
exports.getVehicleHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    let vehicle = await Vehicle.findOne({ vehicleId: id });
    if (!vehicle) {
      vehicle = await Vehicle.findById(id);
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Get mission history (sorted by most recent)
    const history = vehicle.missionHistory
      .slice(-limit)
      .reverse();

    // Fetch ticket details for each mission
    const ticketIds = history.map(h => h.ticketId).filter(Boolean);
    const tickets = await Ticket.find({ ticketId: { $in: ticketIds } })
      .select('ticketId emergencyType location status')
      .lean();

    // Merge ticket details into history
    const enrichedHistory = history.map(mission => {
      const ticket = tickets.find(t => t.ticketId === mission.ticketId);
      return {
        ...mission.toObject(),
        ticket: ticket || null
      };
    });

    res.json({
      success: true,
      data: {
        vehicle: {
          vehicleId: vehicle.vehicleId,
          type: vehicle.type,
          licensePlate: vehicle.licensePlate
        },
        history: enrichedHistory,
        total: vehicle.missionHistory.length
      }
    });
  } catch (error) {
    console.error('[VehicleController] Error fetching vehicle history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle history',
      error: error.message
    });
  }
};

// Get available vehicles (for manual dispatch)
exports.getAvailableVehicles = async (req, res) => {
  try {
    const { type, ward, district, city } = req.query;

    const query = { status: 'AVAILABLE' };

    if (type) {
      query.type = type;
    }

    let vehicles = await Vehicle.find(query).sort({ type: 1, vehicleId: 1 });

    // Filter by location if provided
    if (ward && district && city) {
      vehicles = vehicles.filter(v => 
        v.canServeLocation({ ward, district, city })
      );
    }

    res.json({
      success: true,
      data: vehicles,
      total: vehicles.length
    });
  } catch (error) {
    console.error('[VehicleController] Error fetching available vehicles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available vehicles',
      error: error.message
    });
  }
};

// Manually assign vehicle to ticket
exports.assignVehicle = async (req, res) => {
  try {
    const { ticketId, vehicleId } = req.body;

    if (!ticketId || !vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'ticketId and vehicleId are required'
      });
    }

    // Find vehicle
    const vehicle = await Vehicle.findOne({ vehicleId: vehicleId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    if (vehicle.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: `Vehicle is not available (current status: ${vehicle.status})`
      });
    }

    // Find ticket
    const ticket = await Ticket.findOne({ ticketId: ticketId });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Assign vehicle
    await vehicleService.assignVehiclesToTicket(ticketId, [vehicle]);

    console.log(`[VehicleController] Manually assigned vehicle ${vehicleId} to ticket ${ticketId}`);

    res.json({
      success: true,
      message: 'Vehicle assigned successfully',
      data: {
        ticketId,
        vehicleId,
        licensePlate: vehicle.licensePlate
      }
    });
  } catch (error) {
    console.error('[VehicleController] Error assigning vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign vehicle',
      error: error.message
    });
  }
};

// Release vehicle from ticket (complete mission)
exports.releaseVehicle = async (req, res) => {
  try {
    const { ticketId, vehicleId } = req.body;

    if (!ticketId && !vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'Either ticketId or vehicleId is required'
      });
    }

    let releasedCount = 0;

    if (ticketId) {
      // Release all vehicles from this ticket
      releasedCount = await vehicleService.releaseVehicles(ticketId);
    } else if (vehicleId) {
      // Release specific vehicle
      const vehicle = await Vehicle.findOne({ vehicleId: vehicleId });
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      if (vehicle.status === 'ON_MISSION') {
        await vehicle.completeMission();
        releasedCount = 1;
      }
    }

    console.log(`[VehicleController] Released ${releasedCount} vehicle(s)`);

    res.json({
      success: true,
      message: `Released ${releasedCount} vehicle(s)`,
      data: { releasedCount }
    });
  } catch (error) {
    console.error('[VehicleController] Error releasing vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release vehicle',
      error: error.message
    });
  }
};

// Get vehicle statistics
exports.getStatistics = async (req, res) => {
  try {
    const stats = await vehicleService.getVehicleStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[VehicleController] Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

