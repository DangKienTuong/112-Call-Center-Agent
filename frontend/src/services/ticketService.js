import api from './api';

const ticketService = {
  createTicket: (data) => {
    return api.post('/tickets', data);
  },

  getTickets: (params) => {
    return api.get('/tickets', { params });
  },

  getTicket: (id) => {
    return api.get(`/tickets/${id}`);
  },

  updateTicket: (id, data) => {
    return api.put(`/tickets/${id}`, data);
  },

  addMessage: (ticketId, data) => {
    return api.post(`/tickets/${ticketId}/messages`, data);
  },

  downloadPDF: (ticketId) => {
    return api.get(`/tickets/${ticketId}/pdf`, {
      responseType: 'blob'
    });
  },

  getStatistics: () => {
    return api.get('/tickets/stats/overview');
  },

  createTicketFromChat: (data) => {
    return api.post('/chat/create-ticket', data);
  }
};

export default ticketService;