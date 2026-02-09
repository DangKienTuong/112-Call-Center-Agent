import api from './api';

const vehicleService = {
  // Get all vehicles with filters
  getVehicles: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.ward) params.append('ward', filters.ward);
    if (filters.district) params.append('district', filters.district);
    if (filters.city) params.append('city', filters.city);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await api.get(`/vehicles?${params.toString()}`);
    return response.data;
  },

  // Get single vehicle
  getVehicle: async (id) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  // Create new vehicle
  createVehicle: async (vehicleData) => {
    const response = await api.post('/vehicles', vehicleData);
    return response.data;
  },

  // Update vehicle
  updateVehicle: async (id, vehicleData) => {
    const response = await api.put(`/vehicles/${id}`, vehicleData);
    return response.data;
  },

  // Delete vehicle
  deleteVehicle: async (id) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
  },

  // Update vehicle status
  updateVehicleStatus: async (id, status) => {
    const response = await api.patch(`/vehicles/${id}/status`, { status });
    return response.data;
  },

  // Get vehicle history
  getVehicleHistory: async (id) => {
    const response = await api.get(`/vehicles/${id}/history`);
    return response.data;
  },

  // Get available vehicles
  getAvailableVehicles: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.ward) params.append('ward', filters.ward);
    if (filters.district) params.append('district', filters.district);
    if (filters.city) params.append('city', filters.city);
    
    const response = await api.get(`/vehicles/available?${params.toString()}`);
    return response.data;
  },

  // Manually assign vehicle to ticket
  assignVehicle: async (ticketId, vehicleId) => {
    const response = await api.post('/vehicles/assign', { ticketId, vehicleId });
    return response.data;
  },

  // Release vehicle from mission
  releaseVehicle: async (ticketId, vehicleId = null) => {
    const response = await api.post('/vehicles/release', { 
      ticketId, 
      ...(vehicleId && { vehicleId }) 
    });
    return response.data;
  },

  // Get vehicle statistics
  getStatistics: async () => {
    const response = await api.get('/vehicles/statistics');
    return response.data;
  }
};

export default vehicleService;

