# 112 Emergency Call Center Application

A comprehensive web-based emergency response system for Vietnam's national emergency hotline 112. This application enables efficient emergency call handling, ticket management, and resource dispatch through an AI-powered chat interface.

## Features

### Core Features
- **AI-Powered Chat Interface**: LangGraph-based emergency operator chatbot that collects information systematically
- **RAG System**: Retrieval-Augmented Generation with MongoDB for evidence-based first aid guidance
- **Real-time Communication**: Socket.io integration for live updates and emergency notifications
- **Ticket Management System**: Complete CRUD operations for emergency tickets
- **PDF Generation**: Export emergency tickets as PDF documents
- **Multi-language Support**: Vietnamese and English language options
- **Responsive Design**: Fully responsive UI for desktop, tablet, and mobile devices
- **Dashboard Analytics**: Real-time statistics and visualizations
- **User Authentication**: Secure login system with role-based access control

### Emergency Response Capabilities
- **Emergency Classification**: Automatic categorization (Security, Fire, Medical, Rescue)
- **Priority Management**: Critical, High, Medium, Low priority levels
- **Support Team Dispatch**: Police, Ambulance, Fire Department, Rescue Team coordination
- **Location Tracking**: Detailed address collection and mapping capabilities
- **Affected People Tracking**: Monitor casualties and victim status

## Technology Stack

### Backend
- **Node.js & Express.js**: Server framework
- **MongoDB & Mongoose**: Database and ODM
- **Socket.io**: Real-time bidirectional communication
- **JWT**: Authentication and authorization
- **LangGraph**: AI workflow orchestration
- **LangChain**: RAG pipeline and document processing
- **OpenAI API**: Embeddings and LLM (GPT-4)
- **PDFKit**: PDF document generation
- **Bcrypt**: Password encryption
- **Helmet & CORS**: Security middleware
- **Winston**: Logging system

### Frontend
- **React 18**: UI framework
- **Material-UI (MUI)**: Component library
- **React Router v6**: Navigation
- **Axios**: HTTP client
- **Socket.io-client**: Real-time client
- **i18next**: Internationalization
- **Recharts**: Data visualization
- **React Toastify**: Notifications
- **Date-fns**: Date utilities

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- OpenAI API Key (for AI chatbot functionality)

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/112-call-center.git
cd 112-call-center
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Create `.env` file in backend directory:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/emergency_112
JWT_SECRET=your_secure_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
CORS_ORIGIN=http://localhost:3000
```

5. Start MongoDB service:
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

6. Index PDF documents for RAG (first time only):
```bash
npm run rag:index
```

7. Run the backend server:
```bash
npm run dev
```

### Frontend Setup

1. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

2. Create `.env` file in frontend directory (optional):
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

3. Start the React development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Usage

### Public Emergency Reporting
1. Navigate to the chat interface (no login required)
2. Describe your emergency situation
3. Provide exact location information
4. Answer the operator's questions
5. Receive confirmation when ticket is created
6. Download PDF ticket for reference

### Operator Dashboard (Login Required)
1. Login with operator credentials
2. Access dashboard for real-time statistics
3. View and manage emergency tickets
4. Monitor incoming emergency calls
5. Update ticket status and dispatch teams
6. Generate reports and analytics

### Admin Features
- User management
- System configuration
- Advanced analytics
- Audit logs
- Performance monitoring

## API Documentation

### Authentication Endpoints
```
POST /api/auth/register - Register new user
POST /api/auth/login - User login
GET /api/auth/me - Get current user
PUT /api/auth/profile - Update profile
POST /api/auth/change-password - Change password
```

### Ticket Endpoints
```
GET /api/tickets - Get all tickets (with filters)
GET /api/tickets/:id - Get single ticket
POST /api/tickets - Create new ticket
PUT /api/tickets/:id - Update ticket
POST /api/tickets/:id/messages - Add chat message
GET /api/tickets/:id/pdf - Generate PDF
GET /api/tickets/stats/overview - Get statistics
```

### Chat Endpoints
```
POST /api/chat/message - Process chat message
POST /api/chat/create-ticket - Create ticket from chat
```

## Project Structure

```
112-call-center/
├── backend/
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Custom middleware
│   ├── models/          # Database schemas
│   │   ├── User.js
│   │   ├── Ticket.js
│   │   └── DocumentEmbedding.js  # RAG embeddings
│   ├── routes/          # API routes
│   ├── scripts/         # Utility scripts
│   │   ├── indexDocuments.js    # RAG indexing
│   │   ├── testRag.js           # RAG testing
│   │   └── seedUsers.js
│   ├── services/        # Business logic
│   │   └── langgraph/   # LangGraph AI workflow
│   │       ├── index.js          # Graph definition
│   │       ├── retriever.js      # RAG retriever
│   │       ├── state.js          # State management
│   │       ├── nodes/            # Graph nodes
│   │       └── RAG_README.md     # RAG docs
│   ├── server.js        # Entry point
│   └── package.json     # Dependencies
│
├── frontend/
│   ├── public/          # Static files
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── contexts/    # React contexts
│   │   ├── locales/     # i18n translations
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── utils/       # Helper functions
│   │   ├── App.js       # Main app component
│   │   └── index.js     # Entry point
│   └── package.json     # Dependencies
│
├── reference_document/  # PDF documents for RAG
│   ├── Cam-nang-PCCC-trong-gia-dinh.pdf
│   └── tai-lieu-so-cap-cuu.pdf
│
└── README.md           # Documentation
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Encryption**: Bcrypt hashing for passwords
- **Rate Limiting**: API request throttling
- **CORS Protection**: Cross-origin resource sharing configuration
- **Helmet.js**: Security headers
- **Input Validation**: Server-side validation
- **Account Lockout**: Failed login attempt protection
- **Session Management**: Secure session handling

## Deployment

### Production Build

1. Build frontend:
```bash
cd frontend
npm run build
```

2. Configure production environment variables
3. Use process manager (PM2) for backend:
```bash
npm install -g pm2
cd backend
pm2 start server.js --name emergency-112
```

### Docker Deployment (Optional)

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/emergency_112
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

## RAG System Management

The application includes a powerful RAG (Retrieval-Augmented Generation) system for providing evidence-based first aid guidance. See [`backend/services/langgraph/RAG_README.md`](backend/services/langgraph/RAG_README.md) for detailed documentation.

### Quick Start

```bash
cd backend

# Index PDF documents (first time)
npm run rag:index

# View statistics
npm run rag:stats

# Test RAG system
npm run rag:test

# Re-index all documents (after updating PDFs)
npm run rag:reindex

# Clear all embeddings
npm run rag:clear
```

### How It Works

1. PDF documents in `reference_document/` are chunked and embedded using OpenAI embeddings
2. Embeddings are stored persistently in MongoDB
3. When a user reports an emergency, the system retrieves relevant document chunks
4. LLM generates contextual first aid guidance based on retrieved documents
5. Response includes specific instructions from official medical/fire safety documents

## Testing

### RAG System Testing
```bash
cd backend
npm run rag:test
```

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@emergency112.vn or create an issue in the repository.

## Acknowledgments

- Vietnam National Emergency Response Team
- OpenAI for GPT integration
- Material-UI team for the component library
- Socket.io team for real-time capabilities

## Development Status

Current Version: 1.0.0
- ✅ Core functionality implemented
- ✅ AI chatbot integration
- ✅ Multi-language support
- ✅ Responsive design
- ✅ Security features
- 🚧 Advanced analytics (in progress)
- 🚧 Mobile app (planned)

## Contact

Project Maintainer: [Your Name]
Email: [your.email@example.com]
Project Link: [https://github.com/yourusername/112-call-center](https://github.com/yourusername/112-call-center)