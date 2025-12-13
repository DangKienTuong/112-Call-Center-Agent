import api from './api';

const chatService = {
  // Process chat message (works for both guests and authenticated users)
  processMessage: (data) => {
    return api.post('/chat/message', data);
  },

  // Create ticket from chat
  createTicketFromChat: (data) => {
    return api.post('/chat/create-ticket', data);
  },

  // Get user's chat history (requires authentication)
  getChatHistory: (limit = 10) => {
    return api.get('/chat/history', { params: { limit } });
  },

  // Get user's ticket history (requires authentication)
  getTicketHistory: () => {
    return api.get('/chat/tickets');
  },

  // Get user's saved info for pre-filling (requires authentication)
  getSavedInfo: () => {
    return api.get('/chat/saved-info');
  },

  // Get session details
  getSessionDetails: (sessionId) => {
    return api.get(`/chat/session/${sessionId}/details`);
  },

  // Clear session
  clearSession: (sessionId) => {
    return api.delete(`/chat/session/${sessionId}`);
  },

  // Health check
  healthCheck: () => {
    return api.get('/chat/health');
  }
};

export default chatService;
