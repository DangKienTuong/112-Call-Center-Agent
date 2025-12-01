import api from './api';

const userService = {
  getUsers: (params) => {
    return api.get('/users', { params });
  },

  getUser: (id) => {
    return api.get(`/users/${id}`);
  },

  createUser: (data) => {
    return api.post('/users', data);
  },

  updateUser: (id, data) => {
    return api.put(`/users/${id}`, data);
  },

  deleteUser: (id) => {
    return api.delete(`/users/${id}`);
  },

  resetPassword: (id, newPassword) => {
    return api.post(`/users/${id}/reset-password`, { newPassword });
  },

  toggleStatus: (id) => {
    return api.patch(`/users/${id}/toggle-status`);
  }
};

export default userService;
