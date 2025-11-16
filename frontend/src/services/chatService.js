import api from './api';

const chatService = {
  processMessage: (data) => {
    return api.post('/chat/message', data);
  },

  createTicketFromChat: (data) => {
    return api.post('/chat/create-ticket', data);
  }
};

export default chatService;