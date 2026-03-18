# 🚨 Hệ thống Tổng đài Khẩn cấp 112 — Tài liệu Onboarding cho Dev mới

> **Mục đích**: Hướng dẫn toàn diện cho developer mới tham gia dự án.
> Cập nhật lần cuối: 18/03/2026

---

## Mục lục

- [1. Tổng quan dự án](#1-tổng-quan-dự-án)
- [2. Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
- [3. Cài đặt & Chạy dự án](#3-cài-đặt--chạy-dự-án)
- [4. Biến môi trường](#4-biến-môi-trường)
- [5. Backend chi tiết](#5-backend-chi-tiết)
  - [5.1. Cấu trúc thư mục](#51-cấu-trúc-thư-mục)
  - [5.2. API Endpoints](#52-api-endpoints)
  - [5.3. Database Models](#53-database-models)
  - [5.4. Middleware & Bảo mật](#54-middleware--bảo-mật)
  - [5.5. Services](#55-services)
- [6. LangGraph AI Workflow](#6-langgraph-ai-workflow)
  - [6.1. Tổng quan](#61-tổng-quan)
  - [6.2. State Schema](#62-state-schema)
  - [6.3. Node Graph & Luồng xử lý](#63-node-graph--luồng-xử-lý)
  - [6.4. Các Node chi tiết](#64-các-node-chi-tiết)
  - [6.5. RAG Pipeline](#65-rag-pipeline)
- [7. Frontend chi tiết](#7-frontend-chi-tiết)
  - [7.1. Cấu trúc thư mục](#71-cấu-trúc-thư-mục)
  - [7.2. Routes & Pages](#72-routes--pages)
  - [7.3. Components](#73-components)
  - [7.4. Hooks & Services](#74-hooks--services)
  - [7.5. State Management](#75-state-management)
- [8. Luồng hoạt động chính](#8-luồng-hoạt-động-chính)
- [9. Testing](#9-testing)
- [10. Scripts tiện ích](#10-scripts-tiện-ích)
- [11. Tài khoản mặc định](#11-tài-khoản-mặc-định)
- [12. Các lưu ý quan trọng](#12-các-lưu-ý-quan-trọng)

---

## 1. Tổng quan dự án

**Tên hệ thống**: Hệ thống Tổng đài Khẩn cấp 112 (112 Call Center)

**Mục đích**: Ứng dụng tổng đài khẩn cấp thông minh cho Việt Nam, sử dụng AI chatbot để tiếp nhận và xử lý các cuộc gọi/tin nhắn khẩn cấp (cháy nổ, y tế, an ninh).

### Tính năng chính

| Tính năng | Mô tả | Công nghệ |
|-----------|-------|-----------|
| Chatbot AI thông minh | Thu thập thông tin khẩn cấp qua hội thoại | LangGraph + OpenAI GPT-4 |
| Nhận diện giọng nói | STT (Speech-to-Text) và TTS (Text-to-Speech) | Web Speech API + ElevenLabs |
| Hướng dẫn sơ cứu (RAG) | Tra cứu tài liệu PDF → hướng dẫn xử lý ban đầu | OpenAI Embeddings + MongoDB |
| Quản lý phiếu tiếp nhận | Tạo, theo dõi, cập nhật trạng thái phiếu khẩn cấp | MongoDB + REST API |
| Điều phối phương tiện | Tự động phân bổ xe cứu thương, cảnh sát, cứu hỏa | Rule-based matching |
| RBAC phân quyền | Admin, Staff, Reporter, Guest | JWT + Middleware |
| Dashboard thống kê | Biểu đồ tổng quan | Recharts |
| Xuất PDF | Phiếu tiếp nhận dạng PDF (hỗ trợ tiếng Việt) | PDFKit + Roboto font |
| Đa ngôn ngữ | Tiếng Việt (chính) + English | i18next |

---

## 2. Kiến trúc hệ thống

```
┌────────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React 18)                          │
│  ChatPage │ Dashboard │ Tickets │ Users │ Vehicles │ VoiceChat    │
│                                                                    │
│  Axios HTTP ──── REST API ──── Backend                             │
│  Socket.io ──── WebSocket ──── Backend                             │
└────────────────────────┬───────────────────────────────────────────┘
                         │
┌────────────────────────┼───────────────────────────────────────────┐
│                  BACKEND (Node.js + Express)                       │
│                                                                    │
│  Routes ──► Controllers ──► Services                               │
│              │                  │                                   │
│              │    ┌─────────────┼──────────────────────┐           │
│              │    │  LangGraph Workflow                 │           │
│              │    │  extractInfo → router → collect*    │           │
│              │    │  → confirm → createTicket           │           │
│              │    │  → firstAidRag (RAG)                │           │
│              │    └─────────────┬──────────────────────┘           │
│              │                  │                                   │
│  Middleware  │    ElevenLabs  VehicleService  OpenAI               │
│  (Auth, RBAC,│                                                     │
│   Validate)  │                                                     │
└──────────────┼─────────────────────────────────────────────────────┘
               │
┌──────────────┼──────────────────────────────┐
│          MongoDB                             │
│  Users │ Tickets │ Vehicles │ ChatSessions  │
│  UserMemory │ DocumentEmbeddings             │
└──────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React 18, Material-UI 5, Axios, Socket.io-client, React Router 6, Recharts, react-hook-form |
| Backend | Node.js, Express 4, Socket.io, Winston (logging), Helmet (security) |
| AI/ML | LangGraph, LangChain, OpenAI GPT-4, OpenAI Embeddings (`text-embedding-3-small`) |
| Database | MongoDB (Mongoose 8) |
| Voice | Web Speech API (STT), ElevenLabs API (TTS) |
| Testing | DeepEval (Python), Jest (Unit tests) |
| PDF | PDFKit + Roboto font (Vietnamese) |

---

## 3. Cài đặt & Chạy dự án

### Yêu cầu

- **Node.js** >= 18.x
- **MongoDB** (chạy local hoặc Atlas)
- **Python** >= 3.8 (cho testing và OCR)
- **OpenAI API Key** (bắt buộc cho chatbot)
- **ElevenLabs API Key** (tùy chọn, cho voice TTS)

### Bước 1: Clone & cài đặt dependencies

```bash
# Cài tất cả dependencies (root + backend + frontend)
npm run install-all
```

Hoặc cài riêng:

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### Bước 2: Cấu hình môi trường

Tạo file `backend/.env`:

```env
# === BẮT BUỘC ===
OPENAI_API_KEY=sk-your-openai-api-key
JWT_SECRET=your-jwt-secret-key
MONGODB_URI=mongodb://localhost:27017/emergency_112

# === TÙY CHỌN ===
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
OPENAI_MODEL=gpt-4-turbo-preview

# Voice (TTS) - Tùy chọn
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_VOICE_ID=onwK4e9ZLuTAKqWW03F9
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Bước 3: Khởi tạo dữ liệu

```bash
cd backend

# Tải font Roboto cho PDF (tiếng Việt)
npm run font:download

# Seed users và sample tickets
node scripts/seedUsers.js

# Seed 100 phương tiện (xe cứu thương, cảnh sát, cứu hỏa)
node scripts/seedVehicles.js

# Index tài liệu tham khảo cho RAG
npm run rag:index
```

### Bước 4: Chạy dự án

```bash
# Chạy cả backend + frontend (từ thư mục gốc)
npm run dev

# Hoặc chạy riêng:
npm run server    # Backend tại http://localhost:5000
npm run client    # Frontend tại http://localhost:3000
```

### Bước 5: Truy cập

| URL | Mô tả |
|-----|-------|
| `http://localhost:3000/chat` | Giao diện chat khẩn cấp (public) |
| `http://localhost:3000/login` | Đăng nhập Staff/Admin |
| `http://localhost:3000/dashboard` | Dashboard (admin) |
| `http://localhost:5000/api/health` | Health check API |

---

## 4. Biến môi trường

### Backend (`backend/.env`)

| Biến | Bắt buộc | Mặc định | Mô tả |
|------|----------|----------|-------|
| `OPENAI_API_KEY` | ✅ | - | OpenAI API key cho chatbot + embeddings |
| `JWT_SECRET` | ✅ | - | Secret key cho JWT token |
| `MONGODB_URI` | ❌ | `mongodb://localhost:27017/emergency_112` | MongoDB connection string |
| `PORT` | ❌ | `5000` | Port backend server |
| `NODE_ENV` | ❌ | `development` | `development` / `production` |
| `CORS_ORIGIN` | ❌ | `http://localhost:3000` | Frontend URL cho CORS |
| `OPENAI_MODEL` | ❌ | `gpt-4-turbo-preview` | Model AI sử dụng |
| `ELEVENLABS_API_KEY` | ❌ | - | ElevenLabs API key cho TTS |
| `ELEVENLABS_VOICE_ID` | ❌ | `onwK4e9ZLuTAKqWW03F9` | Voice ID (Daniel) |
| `ELEVENLABS_MODEL_ID` | ❌ | `eleven_turbo_v2_5` | TTS model |
| `RATE_LIMIT_WINDOW_MS` | ❌ | `900000` (15 phút) | Rate limit time window |
| `RATE_LIMIT_MAX_REQUESTS` | ❌ | `100` | Max requests per window |

### Frontend (`frontend/.env`)

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `REACT_APP_API_URL` | `http://localhost:5000/api` | Backend API URL |
| `REACT_APP_SOCKET_URL` | `http://localhost:5000` | WebSocket URL |

---

## 5. Backend chi tiết

### 5.1. Cấu trúc thư mục

```
backend/
├── server.js                 # Entry point: Express + Socket.io + MongoDB
├── package.json
├── .env                      # Environment variables (tạo thủ công)
├── controllers/              # Business logic cho mỗi route
│   ├── authController.js     # Đăng ký, đăng nhập, profile
│   ├── chatController.js     # Xử lý chat (LangGraph integration)
│   ├── ticketController.js   # CRUD phiếu + export PDF
│   ├── userController.js     # Quản lý users (admin)
│   ├── vehicleController.js  # Quản lý phương tiện
│   └── voiceController.js    # TTS/STT via ElevenLabs
├── routes/                   # Định nghĩa API endpoints
│   ├── auth.js, chat.js, tickets.js, users.js, vehicles.js, voice.js
├── middleware/               # Xác thực & phân quyền
│   ├── auth.js               # JWT verification (bắt buộc)
│   ├── optionalAuth.js       # JWT verification (tùy chọn, cho guest)
│   ├── authorize.js          # RBAC role checking
│   ├── validate.js           # Request validation (express-validator)
│   └── errorHandler.js       # Global error handling
├── models/                   # Mongoose schemas
│   ├── User.js               # Users (admin, staff, reporter)
│   ├── Ticket.js             # Phiếu khẩn cấp
│   ├── Vehicle.js            # Phương tiện cứu hộ
│   ├── ChatSession.js        # Lịch sử chat + LangGraph state
│   ├── UserMemory.js         # Bộ nhớ user (lịch sử, preferences)
│   └── DocumentEmbedding.js  # RAG embeddings (1536 dims)
├── services/                 # Business logic & integrations
│   ├── openaiService.js      # OpenAI fallback (legacy)
│   ├── elevenLabsService.js  # Text-to-Speech
│   ├── vehicleService.js     # Tìm & điều phối phương tiện
│   ├── firstAidService.js    # DEPRECATED (replaced by RAG)
│   └── langgraph/            # ★ AI Workflow Engine
│       ├── index.js          # Graph definition & processMessage()
│       ├── state.js          # State schema (Zod + Annotation)
│       ├── checkpointer.js   # MongoDB state persistence
│       ├── retriever.js      # RAG document retrieval
│       ├── nodes/            # Graph nodes (xem mục 6)
│       └── tools/            # Extraction schemas (Zod)
├── scripts/                  # Utility scripts
│   ├── seedUsers.js          # Tạo admin/staff + sample tickets
│   ├── seedVehicles.js       # Tạo 100 phương tiện
│   ├── indexDocuments.js     # Index PDF cho RAG
│   ├── downloadFont.js       # Tải Roboto cho PDF
│   ├── ocr_pdf.py            # OCR tiếng Việt (EasyOCR)
│   └── testRag.js            # Test RAG retrieval
├── tests/                    # Testing
│   ├── phoneValidator.test.js
│   ├── chatbotPhoneValidation.test.js
│   └── deepeval/             # Python DeepEval suite (~1000 test cases)
├── fonts/                    # Roboto font cho PDF
└── utils/
    └── phoneValidator.js     # Vietnamese phone validation
```

### 5.2. API Endpoints

#### Authentication (`/api/auth`)

| Method | Route | Auth | Mô tả |
|--------|-------|------|-------|
| POST | `/register` | ❌ | Đăng ký staff/admin |
| POST | `/login` | ❌ | Đăng nhập staff/admin |
| POST | `/register-reporter` | ❌ | Đăng ký reporter (public) |
| POST | `/login-reporter` | ❌ | Đăng nhập reporter |
| GET | `/me` | ✅ | Lấy profile hiện tại |
| PUT | `/profile` | ✅ | Cập nhật profile |
| POST | `/change-password` | ✅ | Đổi mật khẩu |

#### Chat (`/api/chat`)

| Method | Route | Auth | Mô tả |
|--------|-------|------|-------|
| POST | `/message` | Optional | Gửi tin nhắn cho chatbot (LangGraph) |
| POST | `/create-ticket` | Optional | Tạo phiếu từ chat session |
| GET | `/session/:sessionId` | Optional | Lấy state session (debug) |
| GET | `/session/:sessionId/details` | Optional | Chi tiết session |
| DELETE | `/session/:sessionId` | ❌ | Xóa/reset conversation |
| GET | `/history` | ✅ | Lịch sử chat của user |
| GET | `/tickets` | ✅ | Danh sách phiếu user đã tạo |
| GET | `/saved-info` | ✅ | Thông tin đã lưu (pre-fill form) |
| GET | `/health` | ❌ | Health check |

#### Tickets (`/api/tickets`)

| Method | Route | Auth | Role | Mô tả |
|--------|-------|------|------|-------|
| POST | `/public` | ❌ | - | Tạo phiếu (từ chatbot) |
| GET | `/stats/overview` | ✅ | - | Thống kê tổng quan |
| GET | `/` | ✅ | - | Danh sách phiếu (reporter chỉ thấy của mình) |
| POST | `/` | ✅ | Admin/Staff | Tạo phiếu thủ công |
| GET | `/:id/pdf` | ✅ | - | Xuất PDF |
| PATCH | `/:id/status` | ✅ | Admin/Staff | Cập nhật trạng thái |
| POST | `/:id/messages` | ✅ | - | Thêm tin nhắn vào phiếu |
| GET | `/:id` | ✅ | - | Chi tiết phiếu |
| PUT | `/:id` | ✅ | Admin | Cập nhật toàn bộ phiếu |

#### Users (`/api/users`) — Admin only

| Method | Route | Mô tả |
|--------|-------|-------|
| GET | `/` | Danh sách users (phân trang, search, filter) |
| GET | `/:id` | Chi tiết user |
| POST | `/` | Tạo user |
| PUT | `/:id` | Cập nhật user |
| DELETE | `/:id` | Xóa user |
| POST | `/:id/reset-password` | Reset mật khẩu |
| PATCH | `/:id/toggle-status` | Bật/tắt trạng thái |

#### Vehicles (`/api/vehicles`)

| Method | Route | Role | Mô tả |
|--------|-------|------|-------|
| GET | `/statistics` | Admin/Staff | Thống kê phương tiện |
| GET | `/available` | Admin/Staff | Phương tiện khả dụng |
| GET | `/` | Admin/Staff | Danh sách (filter: type, status, ward) |
| GET | `/:id` | Admin/Staff | Chi tiết |
| GET | `/:id/history` | Admin/Staff | Lịch sử nhiệm vụ |
| POST | `/` | Admin | Tạo phương tiện |
| PUT | `/:id` | Admin | Cập nhật |
| DELETE | `/:id` | Admin | Xóa |
| PATCH | `/:id/status` | Admin/Staff | Cập nhật trạng thái |
| POST | `/assign` | Admin/Staff | Điều động thủ công |
| POST | `/release` | Admin/Staff | Trả phương tiện |

#### Voice (`/api/voice`) — Public

| Method | Route | Mô tả |
|--------|-------|-------|
| POST | `/tts` | Text-to-Speech (ElevenLabs, max 5000 ký tự) |
| POST | `/tts/stream` | Stream audio |
| GET | `/voices` | Danh sách voices |
| GET | `/health` | Health check |

### 5.3. Database Models

#### User

```
username, email, password(hashed), role(admin|staff|reporter),
profile: {fullName, employeeId, department, phone},
status(active|inactive|suspended),
loginAttempts, lockUntil (khóa sau 5 lần sai → 2 giờ),
preferences: {language(vi|en), notifications}
```

#### Ticket

```
ticketId: "TD-YYYYMMDD-HHMMSS-XXXX" (auto-generated)
status: URGENT | IN_PROGRESS | RESOLVED | CANCELLED
reporter: {name, phone, email}
location: {address, street, ward, district, city, coordinates}
emergencyTypes: [FIRE_RESCUE, MEDICAL, SECURITY]
description, priority(LOW|MEDIUM|HIGH|CRITICAL)
affectedPeople: {total, injured, critical, deceased}
supportRequired: {police, ambulance, fireDepartment, rescue}
chatHistory: [{role, message, timestamp}]
assignedVehicles: [{vehicleId, type, licensePlate, assignedAt, arrivedAt}]
```

#### Vehicle

```
vehicleId, type(AMBULANCE|POLICE|FIRE_TRUCK), licensePlate
station: {name, address}
coverage: [{ward, city}]
status: AVAILABLE | ON_MISSION | MAINTENANCE
currentMission: {ticketId, assignedAt}
missionHistory: [{ticketId, assignedAt, completedAt, duration}]
specifications: {capacity, equipment[]}
```

#### ChatSession

```
sessionId, userId?(ref: User), messages[], status(active|completed)
langgraphState(serialized), checkpoint(LangGraph checkpoint)
ticketId?(ref: Ticket), metadata: {userAgent, ipAddress, language}
TTL: Guest sessions expire after 30 days
```

#### UserMemory

```
userId(ref: User), savedInfo: {phone, fullName, commonLocations[]}
ticketHistory(last 50), conversationSummary
stats: {totalTickets, resolvedTickets, lastEmergencyType}
preferences: {language, quickMode}
```

#### DocumentEmbedding (RAG)

```
content(text chunk), embedding([1536] numbers)
metadata: {source, type(FIRE_RESCUE|MEDICAL|SECURITY), page, chunkIndex}
documentHash(SHA-256 of source file)
```

### 5.4. Middleware & Bảo mật

| Middleware | File | Mô tả |
|-----------|------|-------|
| `auth` | `middleware/auth.js` | JWT verification bắt buộc. 401 nếu không có/sai token |
| `optionalAuth` | `middleware/optionalAuth.js` | JWT tùy chọn (cho chat endpoints, hỗ trợ guest) |
| `authorize` | `middleware/authorize.js` | RBAC: `isAdmin()`, `isAdminOrStaff()`, `requireRole(...roles)`, `requirePermission(resource, action)` |
| `validate` | `middleware/validate.js` | express-validator result checker |
| `errorHandler` | `middleware/errorHandler.js` | Xử lý lỗi tập trung: OpenAI, MongoDB, JWT, Rate Limit |

**Bảo mật:**
- Helmet.js (HTTP security headers)
- Rate Limiting: 100 requests / 15 phút trên `/api/`
- Password hashing: bcryptjs (salt 10)
- Account lockout: 5 lần đăng nhập sai → khóa 2 giờ
- JWT token: 7 ngày hết hạn

### 5.5. Services

| Service | Mô tả |
|---------|-------|
| `langgraph/` | ★ AI Workflow Engine — xem [mục 6](#6-langgraph-ai-workflow) |
| `elevenLabsService.js` | TTS (Vietnamese) qua ElevenLabs API. Model: `eleven_turbo_v2_5`, Voice: Daniel |
| `vehicleService.js` | Tìm phương tiện theo location & emergency type, điều động, trả phương tiện |
| `openaiService.js` | Fallback nếu LangGraph không hoạt động (regex extraction + OpenAI chat) |
| `firstAidService.js` | **DEPRECATED** — đã thay bằng LangGraph RAG |

---

## 6. LangGraph AI Workflow

### 6.1. Tổng quan

Hệ thống chatbot sử dụng **LangGraph** (state machine + LLM) để orchestrate conversation flow. Mỗi lượt hội thoại đi qua một đồ thị (graph) các node, mỗi node xử lý một nhiệm vụ cụ thể.

**Entry point:** `services/langgraph/index.js` → export `processMessage(message, sessionId, context, options)`

### 6.2. State Schema

State được định nghĩa trong `state.js` bằng Zod + LangGraph Annotation:

| Nhóm | Fields | Mô tả |
|------|--------|-------|
| Metadata | `sessionId`, `isAuthenticated`, `userMemory` | Session tracking |
| Thu thập (4 thông tin bắt buộc) | `location`, `emergencyTypes`, `phone`, `affectedPeople` | Thông tin khẩn cấp |
| Messages | `messages`, `currentMessage`, `response` | Lịch sử hội thoại |
| Control flow | `currentStep`, `confirmationShown`, `userConfirmed`, `firstAidShown` | Điều khiển luồng |
| Output | `shouldCreateTicket`, `ticketInfo`, `firstAidGuidance` | Kết quả |

**4 thông tin BẮT BUỘC phải thu thập:**
1. **Loại tình huống** (`emergencyTypes`): FIRE_RESCUE, MEDICAL, SECURITY (có thể nhiều loại)
2. **Địa chỉ** (`location`): address + ward + city (tối thiểu)
3. **Số điện thoại** (`phone`): Số Việt Nam hợp lệ (10 số, prefix hợp lệ)
4. **Số người bị ảnh hưởng** (`affectedPeople`): total > 0

### 6.3. Node Graph & Luồng xử lý

```
User Message
    │
    ▼
┌──────────────┐
│ extractInfo  │  ← LLM structured extraction (Zod schema)
│              │    Trích xuất thông tin từ tin nhắn
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────────┐
│   router     │────►│ collectEmergency │ → END (chờ tin nhắn tiếp)
│              │     ├──────────────────┤
│  Quyết định  │────►│ showFirstAid     │ → END
│  bước tiếp   │     ├──────────────────┤
│  theo thông  │────►│ collectLocation  │ → END
│  tin còn     │     ├──────────────────┤
│  thiếu       │────►│ collectPhone     │ → END
│              │     ├──────────────────┤
│              │────►│ collectPeople    │ → END
│              │     ├──────────────────┤
│              │────►│ showConfirmation │ → END
│              │     ├──────────────────┤
│              │────►│ createTicket ────────► firstAidRag │ → END
│              │     ├──────────────────┤
│              │────►│ memoryRetrieval  │ → END
└──────────────┘     └──────────────────┘
```

**Luồng ưu tiên (Priority Order) của Router:**

```
1. Là câu hỏi về phiếu cũ?       → memoryRetrieval
2. Đang ở bước xác nhận?
   - User xác nhận?               → createTicket → firstAidRag
   - User sửa thông tin?          → showConfirmation (reset)
3. Đã đủ thông tin, chưa xác nhận? → showConfirmation
4. Thiếu thông tin?               → determineNextStep():
   a. Chưa có loại tình huống?    → collectEmergency
   b. Có loại, chưa show sơ cứu? → showFirstAidGuidance
   c. Thiếu địa chỉ?             → collectLocation
   d. Thiếu/sai SĐT?             → collectPhone
   e. Thiếu số người?             → collectPeople
   f. Đã đủ tất cả               → showConfirmation
```

### 6.4. Các Node chi tiết

| Node | File | Mô tả |
|------|------|-------|
| `extractInfo` | `nodes/extractInfo.js` | Dùng LLM + Zod schema trích xuất: location, emergencyTypes, phone, affectedPeople. Có fallback regex. Validate SĐT Việt Nam |
| `router` | `nodes/router.js` | Phân tích state → quyết định next node. Dùng LLM + keyword để detect confirmation vs correction |
| `collectEmergency` | `nodes/collectInfo.js` | Hỏi "Bạn đang gặp tình huống gì?" |
| `showFirstAidGuidance` | `nodes/collectInfo.js` | RAG retrieval → LLM sinh hướng dẫn sơ cứu ban đầu (max 5 bước, chỉ từ tài liệu) |
| `collectLocation` | `nodes/collectInfo.js` | Hỏi từng phần thiếu (address, ward, city) |
| `collectPhone` | `nodes/collectInfo.js` | Hỏi SĐT, hiển thị lỗi nếu format sai |
| `collectPeople` | `nodes/collectInfo.js` | Hỏi số người bị ảnh hưởng, phù hợp theo loại tình huống |
| `showConfirmation` | `nodes/confirm.js` | Tóm tắt thông tin + hỏi xác nhận |
| `createTicket` | `nodes/confirm.js` | Build ticketInfo, set `shouldCreateTicket: true` |
| `firstAidRag` | `nodes/firstAidRag.js` | RAG retrieval + LLM → hướng dẫn sơ cứu sau khi tạo phiếu |
| `memoryRetrieval` | `nodes/memoryRetrieval.js` | Truy vấn phiếu cũ cho authenticated users |

### 6.5. RAG Pipeline

**Tài liệu tham khảo** nằm trong thư mục `reference_document/`:

| File PDF | Emergency Type | Nội dung |
|----------|---------------|----------|
| `Cam-nang-PCCC-trong-gia-dinh.pdf` | FIRE_RESCUE | Cẩm nang PCCC trong gia đình |
| `tai-lieu-so-cap-cuu.pdf` | MEDICAL | Tài liệu sơ cấp cứu |

**Pipeline:**

```
PDF files → (OCR nếu scan) → Text chunks (1000 chars, 200 overlap)
         → OpenAI Embeddings (text-embedding-3-small, 1536 dims)
         → MongoDB (documentembeddings collection)
         → Load vào MemoryVectorStore khi server khởi động
         → Cosine similarity search (top-3) khi query
```

**Các lệnh RAG:**

```bash
npm run rag:index      # Index PDF mới/thay đổi
npm run rag:reindex    # Re-index toàn bộ (xóa cũ)
npm run rag:stats      # Xem thống kê embeddings
npm run rag:clear      # Xóa tất cả embeddings
npm run rag:test       # Test retrieval
npm run rag:ocr        # OCR tiếng Việt (cần Python + EasyOCR)
```

---

## 7. Frontend chi tiết

### 7.1. Cấu trúc thư mục

```
frontend/src/
├── App.js                # Routes, Theme (MUI red #d32f2f), Context Providers
├── index.js              # Entry point
├── i18n.js               # i18next setup (Vietnamese)
├── index.css             # Global styles
├── contexts/
│   ├── AuthContext.js     # Auth state: login/logout/register + localStorage
│   └── SocketContext.js   # Socket.io connection management
├── pages/                # 9 pages
│   ├── ChatPage.js        # ★ Trang chat chính (public entry point)
│   ├── LoginPage.js       #   Đăng nhập staff/admin
│   ├── DashboardPage.js   #   Dashboard thống kê (admin)
│   ├── TicketsPage.js     #   Danh sách phiếu
│   ├── TicketDetailPage.js#   Chi tiết phiếu
│   ├── CreateTicketPage.js#   Tạo phiếu thủ công (admin/staff)
│   ├── UsersPage.js       #   Quản lý users (admin)
│   ├── VehiclesPage.js    #   Quản lý phương tiện
│   └── VehicleDetailPage.js# Chi tiết phương tiện
├── components/           # 11 components
│   ├── Layout.js          # Main layout (drawer + appbar)
│   ├── AuthModal.js       # Login/Register modal cho reporter
│   ├── ChatHistory.js     # Sidebar lịch sử chat
│   ├── MessageBubble.js   # Tin nhắn (operator/reporter/system)
│   ├── MyTickets.js       # Sidebar phiếu của tôi
│   ├── PhoneInput.js      # Input SĐT với validation
│   ├── TicketSummary.js   # Card tóm tắt phiếu
│   ├── VehicleForm.js     # Form tạo/sửa phương tiện
│   ├── VoiceChat.js       # Controls microphone + speaker
│   ├── PrivateRoute.js    # Route guard: đã đăng nhập?
│   └── AdminRoute.js      # Route guard: đúng role?
├── hooks/
│   ├── usePhoneValidation.js # Hook validate SĐT Việt Nam
│   └── useVoiceChat.js      # Hook STT + TTS
├── services/             # API wrappers (Axios)
│   ├── api.js             # Axios instance + interceptors
│   ├── chatService.js     # /chat endpoints
│   ├── ticketService.js   # /tickets endpoints
│   ├── userService.js     # /users endpoints
│   ├── vehicleService.js  # /vehicles endpoints
│   └── voiceService.js    # /voice endpoints + Web Speech API
├── locales/
│   ├── vi.json            # Tiếng Việt translations
│   └── en.json            # English translations
└── utils/
    └── phoneValidator.js  # validateVietnamesePhone()
```

### 7.2. Routes & Pages

| Route | Page | Auth | Role | Mô tả |
|-------|------|------|------|-------|
| `/chat` | ChatPage | Public | - | ★ Trang chat chính, entry point |
| `/login` | LoginPage | Public | - | Đăng nhập staff/admin |
| `/dashboard` | DashboardPage | ✅ | Admin | Dashboard thống kê + biểu đồ |
| `/tickets` | TicketsPage | ✅ | All | Danh sách phiếu (reporter thấy của mình) |
| `/tickets/create` | CreateTicketPage | ✅ | Admin/Staff | Tạo phiếu thủ công |
| `/tickets/:id` | TicketDetailPage | ✅ | All | Chi tiết + quản lý phiếu |
| `/users` | UsersPage | ✅ | Admin | Quản lý người dùng |
| `/vehicles` | VehiclesPage | ✅ | Admin/Staff | Quản lý phương tiện |
| `/vehicles/:id` | VehicleDetailPage | ✅ | Admin/Staff | Chi tiết phương tiện |

### 7.3. Components

| Component | Dùng ở | Mô tả |
|-----------|--------|-------|
| `Layout` | Trang authenticated | Drawer sidebar + AppBar + Navigation |
| `ChatPage` | `/chat` | Chat interface: messages, input, voice, sidebar history |
| `AuthModal` | ChatPage | Modal đăng nhập/đăng ký cho reporter |
| `MessageBubble` | ChatPage | Hiển thị tin nhắn (reporter: xanh phải, operator: xám trái, system: cam) |
| `ChatHistory` | ChatPage sidebar | Danh sách sessions gần đây |
| `MyTickets` | ChatPage sidebar | Phiếu đã tạo (compact mode) |
| `TicketSummary` | ChatPage | Card tóm tắt sau khi tạo phiếu |
| `VoiceChat` | ChatPage | Microphone (STT) + Speaker (TTS) controls |
| `PhoneInput` | CreateTicketPage | Input SĐT với auto-format + validation |
| `VehicleForm` | VehiclesPage | Form tạo/sửa phương tiện (districts/wards HCM) |
| `PrivateRoute` | App.js | Route guard: redirect → `/login` nếu chưa đăng nhập |
| `AdminRoute` | App.js | Route guard: kiểm tra role, hiển thị "Access Denied" nếu sai |

### 7.4. Hooks & Services

**Custom Hooks:**

| Hook | Mô tả |
|------|-------|
| `usePhoneValidation(initialValue, validateOnChange)` | Returns: `{value, error, isValid, onChange, onBlur, validate, getNormalizedValue}` |
| `useVoiceChat(language)` | Returns: `{isRecording, transcript, startRecording, stopRecording, speak, isPlaying, isTTSLoading, isSupported}` |

**API Services** (tất cả sử dụng Axios instance từ `api.js`):

| Service | Base Path | Mô tả |
|---------|-----------|-------|
| `chatService` | `/chat` | processMessage, createTicket, getChatHistory, getTicketHistory |
| `ticketService` | `/tickets` | CRUD, PDF download, statistics |
| `userService` | `/users` | CRUD (admin), resetPassword, toggleStatus |
| `vehicleService` | `/vehicles` | CRUD, assign/release, statistics, history |
| `voiceService` | `/voice` | TTS, Speech Recognition helpers, microphone permissions |

### 7.5. State Management

| Context | Provider | Mô tả |
|---------|----------|-------|
| `AuthContext` | `AuthProvider` | `user`, `login()`, `logout()`, `register()`, `registerReporter()`, `loginReporter()`, `updateProfile()`. Lưu token + user vào localStorage |
| `SocketContext` | `SocketProvider` | Socket.io connection, `joinSession()`, `sendEmergencyMessage()`, auto-reconnect |

---

## 8. Luồng hoạt động chính

### Luồng Chat Khẩn cấp (End-to-End)

```
1. User mở /chat → ChatPage render
2. User gõ tin nhắn (VD: "Cháy nhà ở 123 Nguyễn Huệ")
3. Frontend gọi POST /api/chat/message {message, sessionId}
4. Backend → chatController.processMessage()
   │
   ├─ LangGraph processMessage():
   │   ├─ extractInfo: LLM trích xuất emergencyTypes, location
   │   ├─ router: thiếu ward/city → collectLocation
   │   └─ collectLocation: "Thuộc phường nào, thành phố nào?"
   │
5. Response trả về → MessageBubble hiển thị
6. User trả lời: "Phường Bến Nghé, TP HCM"
7. Lặp lại → extractInfo → router → collectPhone → "SĐT?"
8. User: "0912345678" → validate OK → collectPeople → "Bao nhiêu người?"
9. User: "3 người" → showConfirmation → hiển thị tóm tắt
10. User: "Đúng" → createTicket + firstAidRag
    │
    ├─ Tạo Ticket trong MongoDB
    ├─ Tự động điều phối vehicles (vehicleService)
    ├─ RAG: truy xuất tài liệu → hướng dẫn sơ cứu
    │
11. Response: TicketSummary + hướng dẫn sơ cứu
12. (Optional) User tải PDF phiếu
```

### Luồng Voice Chat

```
1. User bật Voice Mode (toggle switch)
2. Nhấn Microphone → Web Speech API bắt đầu ghi
3. User nói → transcript hiển thị real-time
4. Dừng nói → auto-send transcript như text message
5. Bot response → ElevenLabs TTS → play audio
6. Audio xong → auto resume recording (nếu enabled)
```

### Luồng Điều phối phương tiện

```
Emergency Types → Vehicle Types mapping:
  FIRE_RESCUE → [FIRE_TRUCK, AMBULANCE]
  MEDICAL     → [AMBULANCE]
  SECURITY    → [POLICE]

1. Ticket tạo xong → vehicleService.findAndAssignVehicles()
2. Query: AVAILABLE + matching type + covers ticket ward
3. Random selection để phân bố tải
4. Vehicle.startMission(ticketId) → ON_MISSION
5. Khi xử lý xong → Vehicle.completeMission() → AVAILABLE
```

---

## 9. Testing

### Unit Tests (JavaScript)

```bash
cd backend

# Chạy test SĐT
node tests/phoneValidator.test.js

# Chạy test chatbot phone validation
node tests/chatbotPhoneValidation.test.js
```

### DeepEval Suite (Python) — ~1000+ test cases

```bash
cd backend/tests/deepeval

# Cài dependencies Python
pip install -r requirements.txt

# Tạo .env (cần OPENAI_API_KEY)
cp .env.example .env
# Sửa OPENAI_API_KEY=sk-your-key

# Chạy evaluation (cần backend đang chạy ở localhost:5000)
python run_evaluation.py                     # Full (~1000 test cases)
python run_evaluation.py --quick             # Quick (10 cases)
python run_evaluation.py --multi-turn        # Multi-turn conversations
python run_evaluation.py --all               # Single + Multi-turn
python run_evaluation.py --category emergency_type_detection  # Chỉ 1 category
python run_evaluation.py --max-cases 100     # Giới hạn số cases
```

**DeepEval Metrics:**

| Metric | Threshold | Mô tả |
|--------|-----------|-------|
| Answer Relevancy | ≥ 0.7 | Câu trả lời có liên quan? |
| Faithfulness | ≥ 0.7 | Trung thực với context? |
| Hallucination | ≤ 0.3 | Bịa đặt thông tin? |
| Toxicity | ≤ 0.1 | Nội dung độc hại? |
| Bias | ≤ 0.1 | Thiên vị? |

**Custom G-Eval Metrics:**
- Emergency Type Accuracy
- Location Extraction
- Phone Validation
- Conversation Flow
- First Aid Guidance Quality
- Confirmation Handling
- Vietnamese Language Quality
- Safety (prompt injection resistance)

**Test Categories (15):**
emergency_type_detection, location_extraction, phone_validation, affected_people, conversation_flow, confirmation, user_correction, first_aid_guidance, authenticated_user, ticket_query, edge_cases, multi_turn, language_variations, urgency_detection, error_handling

**Reports:** HTML reports generated in `backend/tests/deepeval/reports/`

---

## 10. Scripts tiện ích

### Root Level

| Script | Lệnh | Mô tả |
|--------|-------|-------|
| `dev` | `npm run dev` | Chạy cả backend + frontend (concurrently) |
| `server` | `npm run server` | Chỉ backend (nodemon) |
| `client` | `npm run client` | Chỉ frontend |
| `install-all` | `npm run install-all` | Cài dependencies tất cả |

### Backend Level (`cd backend`)

| Script | Lệnh | Mô tả |
|--------|-------|-------|
| `start` | `npm start` | Chạy production |
| `dev` | `npm run dev` | Chạy với nodemon |
| `rag:index` | `npm run rag:index` | Index PDF cho RAG |
| `rag:reindex` | `npm run rag:reindex` | Re-index toàn bộ |
| `rag:stats` | `npm run rag:stats` | Xem thống kê embeddings |
| `rag:clear` | `npm run rag:clear` | Xóa embeddings |
| `rag:test` | `npm run rag:test` | Test RAG retrieval |
| `rag:ocr` | `npm run rag:ocr` | OCR tiếng Việt cho PDF |
| `font:download` | `npm run font:download` | Tải Roboto font |
| `seed:vehicles` | `npm run seed:vehicles` | Seed 100 phương tiện |

### Seed Scripts

```bash
node scripts/seedUsers.js      # Tạo admin + staff + sample tickets
node scripts/seedVehicles.js   # Tạo 100 phương tiện (40 ambulance, 35 police, 25 fire)
```

---

## 11. Tài khoản mặc định

Sau khi chạy `node scripts/seedUsers.js`:

| Role | Username | Email | Password | Ghi chú |
|------|----------|-------|----------|---------|
| Admin | `admin` | `admin@112.vn` | `admin123` | Full access, Department: IT |
| Staff | `staff` | `staff@112.vn` | `staff123` | Tickets + Vehicles, Department: Operations |

**Phân quyền (RBAC):**

| Tính năng | Admin | Staff | Reporter | Guest |
|-----------|-------|-------|----------|-------|
| Chat | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ❌ | ❌ | ❌ |
| Xem phiếu | ✅ Tất cả | ✅ Tất cả | ✅ Của mình | ❌ |
| Tạo phiếu (thủ công) | ✅ | ✅ | ❌ | ❌ |
| Cập nhật trạng thái phiếu | ✅ | ✅ | ❌ | ❌ |
| Cập nhật toàn bộ phiếu | ✅ | ❌ | ❌ | ❌ |
| Quản lý users | ✅ | ❌ | ❌ | ❌ |
| Quản lý phương tiện | ✅ | ✅ (xem + dispatch) | ❌ | ❌ |
| Tạo/xóa phương tiện | ✅ | ❌ | ❌ | ❌ |
| Voice chat | ✅ | ✅ | ✅ | ✅ |
| Xuất PDF | ✅ | ✅ | ✅ | ❌ |

---

## 12. Các lưu ý quan trọng

### Cho dev mới

1. **OpenAI API Key là bắt buộc** — không có thì chatbot không hoạt động. Hệ thống có fallback regex nhưng rất cơ bản.

2. **MongoDB phải chạy trước** — backend sẽ retry connect nhưng seed scripts cần DB sẵn sàng.

3. **RAG cần index trước khi dùng** — chạy `npm run rag:index` sau khi cài đặt. Lần đầu mất ~30-60 giây (generate embeddings). Lần sau chỉ load từ MongoDB (~2-3 giây).

4. **ElevenLabs là tùy chọn** — không có thì voice TTS không hoạt động, nhưng STT (ghi âm → text) vẫn dùng được qua Web Speech API.

5. **Font Roboto cho PDF** — chạy `npm run font:download` nếu cần xuất PDF tiếng Việt. Không có font thì PDF hiển thị sai ký tự.

6. **Seed data** — `seedVehicles.js` tạo 100 phương tiện cho khu vực TP.HCM. Coverage areas là các phường/xã thực tế.

7. **LangGraph state persistent** — conversation state lưu trong MongoDB (ChatSessions). Restart server không mất state.

8. **OCR cho PDF scan** — nếu PDF là ảnh scan (không copy được text), chạy `npm run rag:ocr` trước khi index. Cần Python + EasyOCR + PyMuPDF.

### Conventions

- **Ngôn ngữ chatbot**: Tiếng Việt (luôn luôn)
- **Ticket ID format**: `TD-YYYYMMDD-HHMMSS-XXXX`
- **Vehicle ID prefix**: CC (Ambulance), CN (Police), CH (Fire Truck)
- **Phone format**: 10 số bắt đầu bằng 0 (hoặc +84 + 9 số)
- **Emergency types**: `FIRE_RESCUE`, `MEDICAL`, `SECURITY`
- **Vehicle types**: `AMBULANCE`, `POLICE`, `FIRE_TRUCK`
- **Ticket statuses**: `URGENT`, `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
- **Vehicle statuses**: `AVAILABLE`, `ON_MISSION`, `MAINTENANCE`

### Cấu trúc project

```
112-Call-Center-Agent/
├── package.json              # Root: scripts dev, server, client, install-all
├── prompt.txt                # System prompt cho chatbot (tiếng Việt)
├── SYSTEM_DOCUMENTATION.md   # Tài liệu hệ thống chi tiết (tiếng Việt)
├── ONBOARDING.md             # ★ File này
├── backend/                  # Node.js + Express + LangGraph
├── frontend/                 # React 18 + MUI
├── reference_document/       # PDF tài liệu cho RAG
│   ├── Cam-nang-PCCC-trong-gia-dinh.pdf
│   └── tai-lieu-so-cap-cuu.pdf
└── reports/                  # DeepEval test reports
```
