const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middleware/auth');
const { isAdmin, isAdminOrStaff } = require('../middleware/authorize');

/**
 * Vehicle Routes
 * All routes require authentication
 * Most routes require admin privileges
 */

// Get vehicle statistics (Staff/Admin)
router.get('/statistics', 
  auth, 
  isAdminOrStaff, 
  vehicleController.getStatistics
);

// Get available vehicles (Staff/Admin)
router.get('/available', 
  auth, 
  isAdminOrStaff, 
  vehicleController.getAvailableVehicles
);

// Get all vehicles with filters (Staff/Admin)
router.get('/', 
  auth, 
  isAdminOrStaff, 
  vehicleController.getVehicles
);

// Get vehicle history (Staff/Admin)
router.get('/:id/history', 
  auth, 
  isAdminOrStaff, 
  vehicleController.getVehicleHistory
);

// Get single vehicle (Staff/Admin)
router.get('/:id', 
  auth, 
  isAdminOrStaff, 
  vehicleController.getVehicle
);

// Create new vehicle (Admin only)
router.post('/', 
  auth, 
  isAdmin, 
  vehicleController.createVehicle
);

// Update vehicle status (Staff/Admin)
router.patch('/:id/status', 
  auth, 
  isAdminOrStaff, 
  vehicleController.updateVehicleStatus
);

// Update vehicle (Admin only)
router.put('/:id', 
  auth, 
  isAdmin, 
  vehicleController.updateVehicle
);

// Delete vehicle (Admin only)
router.delete('/:id', 
  auth, 
  isAdmin, 
  vehicleController.deleteVehicle
);

// Manually assign vehicle to ticket (Staff/Admin)
router.post('/assign', 
  auth, 
  isAdminOrStaff, 
  vehicleController.assignVehicle
);

// Release vehicle from mission (Staff/Admin)
router.post('/release', 
  auth, 
  isAdminOrStaff, 
  vehicleController.releaseVehicle
);

module.exports = router;
