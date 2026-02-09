# Hệ thống Tổng đài Khẩn cấp 112 - Tài liệu Mô tả Chi tiết

## Mục lục

- [1. Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
- [2. Kiến trúc tổng thể](#2-kiến-trúc-tổng-thể)
- [3. Công nghệ sử dụng](#3-công-nghệ-sử-dụng)
- [4. Backend](#4-backend)
  - [4.1. Cấu trúc thư mục](#41-cấu-trúc-thư-mục)
  - [4.2. API Endpoints](#42-api-endpoints)
  - [4.3. Models (Cơ sở dữ liệu)](#43-models-cơ-sở-dữ-liệu)
  - [4.4. Services](#44-services)
  - [4.5. Middleware](#45-middleware)
  - [4.6. LangGraph - AI Chat Orchestration](#46-langgraph---ai-chat-orchestration)
- [5. Frontend](#5-frontend)
  - [5.1. Cấu trúc thư mục](#51-cấu-trúc-thư-mục)
  - [5.2. Các trang (Pages)](#52-các-trang-pages)
  - [5.3. Các thành phần (Components)](#53-các-thành-phần-components)
  - [5.4. Custom Hooks](#54-custom-hooks)
  - [5.5. Services (API Integration)](#55-services-api-integration)
  - [5.6. Quản lý trạng thái](#56-quản-lý-trạng-thái)
  - [5.7. Định tuyến (Routing)](#57-định-tuyến-routing)
  - [5.8. Responsive & Mobile Support](#58-responsive--mobile-support)
- [6. Luồng hoạt động chính](#6-luồng-hoạt-động-chính)
  - [6.1. Luồng trò chuyện với Chatbot](#61-luồng-trò-chuyện-với-chatbot)
  - [6.2. Luồng tạo phiếu tiếp nhận](#62-luồng-tạo-phiếu-tiếp-nhận)
  - [6.3. Luồng điều phối phương tiện](#63-luồng-điều-phối-phương-tiện)
  - [6.4. Luồng hướng dẫn sơ cứu (RAG)](#64-luồng-hướng-dẫn-sơ-cứu-rag)
- [7. Bảo mật & Phân quyền RBAC](#7-bảo-mật--phân-quyền-rbac)
  - [7.1. Tổng quan bảo mật](#71-tổng-quan-bảo-mật)
  - [7.2. Luồng xác thực JWT](#72-luồng-xác-thực-jwt)
  - [7.3. Các vai trò (Roles)](#73-các-vai-trò-roles)
  - [7.4. Ma trận quyền hạn chi tiết](#74-ma-trận-quyền-hạn-chi-tiết)
  - [7.5. Bảo vệ API Endpoints theo Role](#75-bảo-vệ-api-endpoints-theo-role)
  - [7.6. Bảo vệ Route Frontend](#76-bảo-vệ-route-frontend)
  - [7.7. Logic quyền đặc biệt](#77-logic-quyền-đặc-biệt)
- [8. Hệ thống kiểm thử](#8-hệ-thống-kiểm-thử)
- [9. Biến môi trường](#9-biến-môi-trường)
- [10. Hướng dẫn triển khai](#10-hướng-dẫn-triển-khai)

---

## 1. Tổng quan hệ thống

**Tên hệ thống:** Hệ thống Tổng đài Khẩn cấp 112 (112 Call Center)

**Mục đích:** Xây dựng ứng dụng tổng đài khẩn cấp thông minh cho Việt Nam, sử dụng chatbot AI để tiếp nhận và xử lý các cuộc gọi/tin nhắn khẩn cấp liên quan đến cháy nổ, y tế và an ninh.

**Các tính năng chính:**

| Tính năng | Mô tả |
|-----------|-------|
| Chatbot AI thông minh | Sử dụng LangGraph + OpenAI để trò chuyện, thu thập thông tin khẩn cấp |
| Nhận diện giọng nói | Chuyển giọng nói thành văn bản (STT) và ngược lại (TTS) |
| Quản lý phiếu tiếp nhận | Tạo, theo dõi, cập nhật trạng thái phiếu khẩn cấp |
| Điều phối phương tiện | Tự động phân bổ xe cứu thương, xe cảnh sát, xe cứu hỏa |
| Hướng dẫn sơ cứu (RAG) | Tra cứu tài liệu PDF để hướng dẫn sơ cứu theo tình huống |
| Quản lý người dùng | Phân quyền Admin, Staff, Reporter, Guest |
| Dashboard thống kê | Bảng điều khiển tổng quan với biểu đồ thống kê |
| Xuất PDF | Xuất phiếu tiếp nhận dưới dạng PDF |
| Đa ngôn ngữ | Hỗ trợ tiếng Việt (chính) |

---

## 2. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ ChatPage │ │ Dashboard│ │ Tickets  │ │ Users/Vehicles   │   │
│  │ + Voice  │ │          │ │          │ │ Management       │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘   │
│       │             │            │                 │             │
│  ┌────┴─────────────┴────────────┴─────────────────┴──────┐     │
│  │              Axios HTTP Client + Socket.IO              │     │
│  └─────────────────────────┬──────────────────────────────┘     │
└────────────────────────────┼────────────────────────────────────┘
                             │ REST API + WebSocket
┌────────────────────────────┼────────────────────────────────────┐
│                     BACKEND (Node.js/Express)                    │
│  ┌─────────────────────────┴──────────────────────────────┐     │
│  │           Express Server + Socket.IO Server             │     │
│  └──────┬──────────┬──────────┬──────────┬────────────────┘     │
│         │          │          │          │                       │
│  ┌──────┴───┐ ┌────┴────┐ ┌──┴───┐ ┌───┴──────┐               │
│  │Middleware│ │ Routes  │ │ Auth │ │Controllers│               │
│  └──────────┘ └────┬────┘ └──────┘ └───┬──────┘               │
│                    │                    │                       │
│  ┌─────────────────┴────────────────────┴──────────────────┐   │
│  │                      Services                            │   │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │LangGraph │ │ElevenLabs │ │ Vehicle  │ │  OpenAI  │  │   │
│  │  │ Service  │ │  Service  │ │ Service  │ │ Service  │  │   │
│  │  └────┬─────┘ └───────────┘ └──────────┘ └──────────┘  │   │
│  │       │                                                  │   │
│  │  ┌────┴─────────────────────────────────────────────┐   │   │
│  │  │           LangGraph Workflow                      │   │   │
│  │  │  ┌────────┐ ┌──────┐ ┌───────┐ ┌───────────┐    │   │   │
│  │  │  │Extract │→│Router│→│Collect│→│  Confirm  │    │   │   │
│  │  │  │ Info   │ │      │ │ Info  │ │& Create   │    │   │   │
│  │  │  └────────┘ └──┬───┘ └───────┘ └───────────┘    │   │   │
│  │  │                │                                  │   │   │
│  │  │           ┌────┴────┐  ┌──────────┐              │   │   │
│  │  │           │First Aid│  │ Memory   │              │   │   │
│  │  │           │  RAG    │  │Retrieval │              │   │   │
│  │  │           └─────────┘  └──────────┘              │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │                    MongoDB (Mongoose)                     │   │
│  │  ┌─────┐ ┌──────┐ ┌───────┐ ┌────────────┐ ┌────────┐  │   │
│  │  │User │ │Ticket│ │Vehicle│ │ChatSession │ │UserMem │  │   │
│  │  └─────┘ └──────┘ └───────┘ └────────────┘ └────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ OpenAI API   │  │ ElevenLabs   │  │ Web Speech API        │  │
│  │ (GPT-4)      │  │ (TTS)        │  │ (Browser STT)         │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Công nghệ sử dụng

### Backend

| Công nghệ | Phiên bản | Mục đích |
|------------|-----------|----------|
| Node.js | - | Runtime JavaScript |
| Express | - | Web framework |
| MongoDB | - | Cơ sở dữ liệu NoSQL |
| Mongoose | - | ODM cho MongoDB |
| Socket.IO | ^4.x | Giao tiếp thời gian thực |
| JSON Web Token | - | Xác thực người dùng |
| bcryptjs | - | Mã hóa mật khẩu |
| OpenAI API | - | Xử lý ngôn ngữ tự nhiên (GPT-4) |
| LangGraph | - | Orchestration workflow AI |
| LangChain | - | Framework AI (RAG, Embeddings) |
| ElevenLabs API | - | Text-to-Speech tiếng Việt |
| Helmet | - | Bảo mật HTTP headers |
| Winston | - | Logging |
| PDFKit | - | Tạo file PDF |
| Zod | - | Validation schema |

### Frontend

| Công nghệ | Phiên bản | Mục đích |
|------------|-----------|----------|
| React | ^18.2.0 | UI Library |
| React Router | ^6.20.1 | Điều hướng SPA |
| Material-UI (MUI) | ^5.15.0 | UI Component Library |
| Axios | ^1.6.2 | HTTP Client |
| Socket.IO Client | ^4.6.1 | WebSocket Client |
| Recharts | ^2.10.3 | Biểu đồ thống kê |
| react-i18next | ^13.5.0 | Đa ngôn ngữ |
| react-toastify | ^9.1.3 | Thông báo |
| Web Speech API | Native | Nhận diện giọng nói (STT) |
| date-fns | ^2.30.0 | Xử lý ngày tháng |

---

## 4. Backend

### 4.1. Cấu trúc thư mục

```
backend/
├── server.js                 # Entry point - khởi tạo Express server
├── package.json              # Dependencies và scripts
├── .env                      # Biến môi trường
│
├── controllers/              # Xử lý request/response
│   ├── authController.js     # Xác thực & đăng ký
│   ├── chatController.js     # Xử lý tin nhắn chat
│   ├── ticketController.js   # Quản lý phiếu tiếp nhận
│   ├── userController.js     # Quản lý người dùng
│   ├── vehicleController.js  # Quản lý phương tiện
│   └── voiceController.js    # Xử lý giọng nói
│
├── routes/                   # Định nghĩa API routes
│   ├── auth.js
│   ├── chat.js
│   ├── tickets.js
│   ├── users.js
│   ├── vehicles.js
│   └── voice.js
│
├── models/                   # MongoDB schemas
│   ├── User.js               # Người dùng
│   ├── Ticket.js             # Phiếu tiếp nhận
│   ├── Vehicle.js            # Phương tiện
│   ├── ChatSession.js        # Phiên trò chuyện
│   ├── UserMemory.js         # Bộ nhớ người dùng
│   └── DocumentEmbedding.js  # Embeddings cho RAG
│
├── services/                 # Business logic
│   ├── elevenLabsService.js  # Text-to-Speech
│   ├── openaiService.js      # OpenAI (legacy/fallback)
│   ├── firstAidService.js    # Sơ cứu (deprecated)
│   ├── vehicleService.js     # Điều phối phương tiện
│   └── langgraph/            # AI Chat Workflow
│       ├── index.js          # Main workflow
│       ├── state.js          # State schema
│       ├── retriever.js      # RAG retriever
│       ├── checkpointer.js   # MongoDB state persistence
│       └── nodes/            # Workflow nodes
│           ├── extractInfo.js
│           ├── router.js
│           ├── collectInfo.js
│           ├── confirm.js
│           ├── firstAidRag.js
│           └── memoryRetrieval.js
│
├── middleware/               # Express middleware
│   ├── auth.js               # JWT authentication
│   ├── optionalAuth.js       # Optional auth (guest support)
│   ├── authorize.js          # Role-based authorization
│   ├── errorHandler.js       # Global error handler
│   └── validate.js           # Input validation
│
├── utils/                    # Tiện ích
├── scripts/                  # Scripts tiện ích (seeding, RAG indexing)
├── tests/                    # Kiểm thử
└── docs/                     # Tài liệu
```

### 4.2. API Endpoints

#### 4.2.1. Authentication (`/api/auth`)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|--------|-------|
| POST | `/api/auth/register` | Đăng ký tài khoản staff/admin | Public |
| POST | `/api/auth/login` | Đăng nhập staff/admin | Public |
| POST | `/api/auth/register-reporter` | Đăng ký người báo tin | Public |
| POST | `/api/auth/login-reporter` | Đăng nhập người báo tin (SĐT/email) | Public |
| GET | `/api/auth/me` | Lấy thông tin người dùng hiện tại | Authenticated |
| PUT | `/api/auth/profile` | Cập nhật hồ sơ | Authenticated |
| POST | `/api/auth/change-password` | Đổi mật khẩu | Authenticated |

#### 4.2.2. Chat (`/api/chat`)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|--------|-------|
| POST | `/api/chat/message` | Gửi tin nhắn cho chatbot | Guest/Auth |
| POST | `/api/chat/create-ticket` | Tạo phiếu từ cuộc trò chuyện | Guest/Auth |
| GET | `/api/chat/session/:sessionId` | Lấy lịch sử phiên chat | Guest/Auth |
| GET | `/api/chat/session/:sessionId/details` | Lấy chi tiết phiên chat | Guest/Auth |
| DELETE | `/api/chat/session/:sessionId` | Xóa phiên chat | Guest/Auth |
| GET | `/api/chat/health` | Kiểm tra sức khỏe service | Public |
| GET | `/api/chat/history` | Lấy lịch sử chat của user | Authenticated |
| GET | `/api/chat/tickets` | Lấy lịch sử phiếu của user | Authenticated |
| GET | `/api/chat/saved-info` | Lấy thông tin đã lưu của user | Authenticated |

#### 4.2.3. Tickets (`/api/tickets`)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|--------|-------|
| POST | `/api/tickets/public` | Tạo phiếu (từ chatbot) | Public |
| GET | `/api/tickets` | Lấy danh sách phiếu | Staff/Admin |
| POST | `/api/tickets` | Tạo phiếu thủ công | Staff/Admin |
| GET | `/api/tickets/stats/overview` | Thống kê tổng quan | Staff/Admin |
| GET | `/api/tickets/:id` | Xem chi tiết phiếu | Authenticated |
| GET | `/api/tickets/:id/pdf` | Xuất PDF phiếu | Authenticated |
| PATCH | `/api/tickets/:id/status` | Cập nhật trạng thái | Staff/Admin |
| PUT | `/api/tickets/:id` | Cập nhật toàn bộ phiếu | Admin |
| POST | `/api/tickets/:id/messages` | Thêm tin nhắn vào phiếu | Authenticated |

#### 4.2.4. Users (`/api/users`)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|--------|-------|
| GET | `/api/users` | Danh sách người dùng | Admin |
| GET | `/api/users/:id` | Chi tiết người dùng | Admin |
| POST | `/api/users` | Tạo người dùng | Admin |
| PUT | `/api/users/:id` | Cập nhật người dùng | Admin |
| DELETE | `/api/users/:id` | Xóa người dùng | Admin |
| POST | `/api/users/:id/reset-password` | Reset mật khẩu | Admin |
| PATCH | `/api/users/:id/toggle-status` | Bật/tắt trạng thái | Admin |

#### 4.2.5. Vehicles (`/api/vehicles`)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|--------|-------|
| GET | `/api/vehicles` | Danh sách phương tiện | Staff/Admin |
| GET | `/api/vehicles/available` | Phương tiện khả dụng | Staff/Admin |
| GET | `/api/vehicles/statistics` | Thống kê phương tiện | Staff/Admin |
| GET | `/api/vehicles/:id` | Chi tiết phương tiện | Staff/Admin |
| GET | `/api/vehicles/:id/history` | Lịch sử nhiệm vụ | Staff/Admin |
| POST | `/api/vehicles` | Thêm phương tiện | Admin |
| PUT | `/api/vehicles/:id` | Cập nhật phương tiện | Admin |
| DELETE | `/api/vehicles/:id` | Xóa phương tiện | Admin |
| PATCH | `/api/vehicles/:id/status` | Cập nhật trạng thái | Staff/Admin |
| POST | `/api/vehicles/assign` | Phân bổ phương tiện thủ công | Staff/Admin |
| POST | `/api/vehicles/release` | Giải phóng phương tiện | Staff/Admin |

#### 4.2.6. Voice (`/api/voice`)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|--------|-------|
| POST | `/api/voice/tts` | Chuyển văn bản thành giọng nói | Guest/Auth |
| POST | `/api/voice/tts/stream` | Stream TTS | Guest/Auth |
| GET | `/api/voice/voices` | Danh sách giọng đọc | Public |
| GET | `/api/voice/health` | Kiểm tra sức khỏe service | Public |

### 4.3. Models (Cơ sở dữ liệu)

#### 4.3.1. User (Người dùng)

```
User {
  username:       String (unique, required)
  email:          String (unique, required)
  password:       String (hashed với bcrypt)
  role:           Enum ['admin', 'staff', 'reporter']
  profile: {
    fullName:     String
    phone:        String
    department:   String
  }
  status:         Enum ['active', 'inactive']
  loginAttempts:  Number (tối đa 5 lần)
  lockUntil:      Date (khóa 2 giờ sau 5 lần thất bại)
}
```

**Tính năng bảo mật:** Tự động khóa tài khoản sau 5 lần đăng nhập thất bại trong vòng 2 giờ.

#### 4.3.2. Ticket (Phiếu tiếp nhận)

```
Ticket {
  ticketId:        String (auto: TD-YYYYMMDD-HHMMSS-RANDOM)
  status:          Enum ['URGENT', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED']
  reporter: {
    name:          String
    phone:         String (required)
    address:       String
  }
  location: {
    address:       String
    ward:          String
    district:      String
    city:          String
  }
  emergencyTypes:  Array (nhiều loại khẩn cấp)
  emergencyType:   Enum ['FIRE', 'MEDICAL', 'SECURITY', 'OTHER']
  description:     String
  affectedPeople:  Number
  supportRequired: Array ['AMBULANCE', 'POLICE', 'FIRE_TRUCK']
  assignedVehicles: Array [{ vehicleId, type, licensePlate, station }]
  chatHistory:     Array [{ role, content, timestamp }]
  assignedOperator: ObjectId (ref: User)
}
```

#### 4.3.3. Vehicle (Phương tiện)

```
Vehicle {
  vehicleId:      String (unique, required)
  type:           Enum ['AMBULANCE', 'POLICE', 'FIRE_TRUCK']
  licensePlate:   String (unique)
  station: {
    name:         String
    address:      String
    district:     String
  }
  coverage:       Array [{ ward, district }]
  status:         Enum ['AVAILABLE', 'ON_MISSION', 'MAINTENANCE']
  currentMission: { ticketId, startTime, location }
  missionHistory: Array [{ ticketId, startTime, endTime, location, status }]
}
```

**Tính năng:** Kiểm tra khả năng phục vụ theo khu vực (`canServeLocation()`), bắt đầu/kết thúc nhiệm vụ, tìm xe khả dụng theo vị trí.

#### 4.3.4. ChatSession (Phiên trò chuyện)

```
ChatSession {
  sessionId:      String (unique)
  userId:         ObjectId (optional - hỗ trợ guest)
  messages:       Array [{ role, content, timestamp, metadata }]
  ticketId:       String
  status:         Enum ['active', 'completed', 'expired']
  langgraphState: Mixed (trạng thái LangGraph)
  checkpoint:     Mixed (checkpoint dữ liệu)
}
```

**TTL:** Phiên guest tự động hết hạn sau 30 ngày.

#### 4.3.5. UserMemory (Bộ nhớ người dùng)

```
UserMemory {
  userId:              ObjectId (ref: User)
  savedInfo: {
    phone:             String
    name:              String
    commonLocations:   Array [{ address, ward, district, usageCount }]
  }
  ticketHistory:       Array [{ ticketId, date, emergencyType, status }]
  conversationSummary: String
  stats: {
    totalTickets:      Number
    lastInteraction:   Date
  }
  preferences: {
    language:          String
    autoFill:          Boolean
  }
}
```

**Mục đích:** Lưu trữ thông tin người dùng đã xác thực để tự động điền form, gợi ý địa chỉ thường dùng.

#### 4.3.6. DocumentEmbedding (Embedding tài liệu RAG)

```
DocumentEmbedding {
  content:    String (nội dung chunk)
  embedding:  Array [Number] (vector 1536 chiều)
  metadata: {
    source:     String (nguồn tài liệu)
    type:       Enum ['FIRE_RESCUE', 'MEDICAL', 'SECURITY']
    page:       Number
    chunkIndex: Number
  }
  documentHash: String
}
```

### 4.4. Services

#### 4.4.1. LangGraph Service (AI Chat Orchestration)

Dịch vụ cốt lõi của hệ thống, sử dụng LangGraph để quản lý luồng hội thoại AI. Bao gồm các node:

| Node | Chức năng |
|------|-----------|
| `extractInfo` | Trích xuất thông tin từ tin nhắn (SĐT, địa chỉ, loại khẩn cấp, số nạn nhân) |
| `router` | Định tuyến tin nhắn đến node tiếp theo |
| `collectInfo` | Thu thập thông tin còn thiếu từ người dùng |
| `confirm` | Xác nhận thông tin và tạo phiếu tiếp nhận |
| `firstAidRag` | Hướng dẫn sơ cứu qua RAG (truy vấn tài liệu PDF) |
| `memoryRetrieval` | Truy xuất bộ nhớ người dùng đã xác thực |

#### 4.4.2. ElevenLabs Service (Text-to-Speech)

- Chuyển văn bản thành giọng nói tiếng Việt
- Model: `eleven_turbo_v2_5`
- Voice ID mặc định: `onwK4e9ZLuTAKqWW03F9`
- Hỗ trợ streaming audio
- Tự động làm sạch văn bản (loại bỏ markdown, emoji)

#### 4.4.3. Vehicle Service (Điều phối phương tiện)

- Ánh xạ loại khẩn cấp → loại phương tiện cần thiết
- Tìm xe khả dụng theo khu vực (phường/quận)
- Tự động phân bổ xe khi tạo phiếu
- Giải phóng xe khi hoàn thành nhiệm vụ
- Thống kê tình trạng phương tiện

#### 4.4.4. OpenAI Service (Legacy/Fallback)

- Xử lý chat cơ bản (dự phòng khi LangGraph gặp lỗi)
- Trích xuất thông tin cơ bản từ tin nhắn

### 4.5. Middleware

| Middleware | Chức năng |
|------------|-----------|
| `auth` | Xác thực JWT token từ header `Authorization: Bearer <token>` |
| `optionalAuth` | Xác thực tùy chọn (hỗ trợ guest không cần đăng nhập) |
| `authorize` | Phân quyền theo role (Admin, Staff, Reporter) |
| `errorHandler` | Xử lý lỗi toàn cục (OpenAI, MongoDB, JWT, validation) |
| `validate` | Kiểm tra kết quả validation từ express-validator |
| `helmet` | Bảo mật HTTP headers |
| `cors` | Cross-Origin Resource Sharing |
| `express-rate-limit` | Giới hạn số request (chống tấn công DDoS) |

### 4.6. LangGraph - AI Chat Orchestration

LangGraph là thành phần cốt lõi điều phối luồng hội thoại AI. Workflow được thiết kế dạng đồ thị có hướng (directed graph):

```
                    ┌──────────────────┐
                    │  Memory Retrieval│ (nếu user đã đăng nhập)
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
     User Input ──→ │  Extract Info    │
                    │  (trích xuất SĐT,│
                    │  địa chỉ, loại   │
                    │  khẩn cấp...)     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │     Router       │
                    │  (định tuyến)    │
                    └──┬─────┬─────┬──┘
                       │     │     │
              ┌────────┘     │     └────────┐
              │              │              │
    ┌─────────▼──┐  ┌───────▼──────┐  ┌────▼──────────┐
    │ Collect    │  │ First Aid   │  │   Confirm     │
    │ Info       │  │ RAG         │  │ & Create      │
    │ (hỏi thêm │  │ (hướng dẫn  │  │   Ticket      │
    │ thông tin) │  │ sơ cứu)     │  │               │
    └────────────┘  └─────────────┘  └───────────────┘
```

**State Schema:** Quản lý trạng thái hội thoại bao gồm:
- Thông tin liên lạc (SĐT, tên)
- Địa chỉ sự cố (phường, quận, thành phố)
- Loại khẩn cấp (cháy nổ, y tế, an ninh)
- Số người bị ảnh hưởng
- Mô tả tình huống
- Trạng thái thu thập thông tin

**Checkpointer:** Lưu trạng thái hội thoại vào MongoDB để có thể tiếp tục phiên chat khi bị gián đoạn.

**RAG Retriever:** Sử dụng OpenAI Embeddings để tìm kiếm nội dung liên quan trong các tài liệu PDF sơ cứu/PCCC đã được index.

---

## 5. Frontend

### 5.1. Cấu trúc thư mục

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── App.js                    # Component chính + routing
│   ├── index.js                  # Entry point
│   ├── index.css                 # Global styles
│   ├── i18n.js                   # Cấu hình đa ngôn ngữ
│   │
│   ├── components/               # Components tái sử dụng
│   │   ├── Layout.js             # Layout chính (sidebar + header)
│   │   ├── PrivateRoute.js       # Route bảo vệ (yêu cầu đăng nhập)
│   │   ├── AdminRoute.js         # Route phân quyền (role-based)
│   │   ├── AuthModal.js          # Modal đăng nhập/đăng ký
│   │   ├── MessageBubble.js      # Bong bóng tin nhắn chat
│   │   ├── TicketSummary.js      # Tóm tắt phiếu tiếp nhận
│   │   ├── ChatHistory.js        # Lịch sử chat
│   │   ├── MyTickets.js          # Danh sách phiếu của user
│   │   ├── VoiceChat.js          # Giao diện chat giọng nói
│   │   ├── VehicleForm.js        # Form thêm/sửa phương tiện
│   │   └── PhoneInput.js         # Input số điện thoại VN
│   │
│   ├── contexts/                 # React Context
│   │   ├── AuthContext.js        # Quản lý xác thực
│   │   └── SocketContext.js      # Quản lý WebSocket
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useVoiceChat.js       # Hook chat giọng nói
│   │   └── usePhoneValidation.js # Hook validate SĐT VN
│   │
│   ├── pages/                    # Các trang
│   │   ├── ChatPage.js           # Trang chat chính
│   │   ├── LoginPage.js          # Trang đăng nhập
│   │   ├── DashboardPage.js      # Bảng điều khiển
│   │   ├── TicketsPage.js        # Danh sách phiếu
│   │   ├── TicketDetailPage.js   # Chi tiết phiếu
│   │   ├── CreateTicketPage.js   # Tạo phiếu thủ công
│   │   ├── UsersPage.js          # Quản lý người dùng
│   │   ├── VehiclesPage.js       # Quản lý phương tiện
│   │   └── VehicleDetailPage.js  # Chi tiết phương tiện
│   │
│   ├── services/                 # API integration
│   │   ├── api.js                # Axios instance + interceptors
│   │   ├── chatService.js        # API chat
│   │   ├── ticketService.js      # API phiếu
│   │   ├── userService.js        # API người dùng
│   │   ├── vehicleService.js     # API phương tiện
│   │   └── voiceService.js       # API giọng nói
│   │
│   ├── styles/                   # CSS styles
│   ├── utils/                    # Tiện ích
│   └── locales/                  # File ngôn ngữ (vi, en)
│
└── package.json
```

### 5.2. Các trang (Pages)

#### 5.2.1. ChatPage (`/chat`) - Trang chính

Giao diện trò chuyện với chatbot AI, là trang trung tâm của hệ thống:

- **Khu vực chat:** Hiển thị tin nhắn dạng bong bóng (operator/reporter/system)
- **Voice Chat:** Nút ghi âm giọng nói, tự động chuyển thành text và gửi
- **TTS:** Tự động đọc phản hồi của chatbot bằng giọng Việt (ElevenLabs)
- **Sidebar:** Lịch sử chat, danh sách phiếu (nếu đã đăng nhập)
- **AuthModal:** Cho phép đăng nhập/đăng ký ngay trong trang chat
- **TicketSummary:** Hiển thị tóm tắt phiếu khi tạo xong

#### 5.2.2. LoginPage (`/login`)

- Đăng nhập cho Staff/Admin
- Link chuyển đến trang chat công cộng

#### 5.2.3. DashboardPage (`/dashboard`) - Admin

- Thống kê tổng quan (số phiếu, trạng thái, loại khẩn cấp)
- Biểu đồ tròn (Recharts)
- Bảng phiếu gần đây

#### 5.2.4. TicketsPage (`/tickets`)

- Danh sách phiếu với bộ lọc (trạng thái, loại, mức ưu tiên)
- Phân trang
- Tải PDF
- Nút tạo phiếu thủ công (Admin/Staff)

#### 5.2.5. TicketDetailPage (`/tickets/:id`)

- Thông tin chi tiết phiếu
- Cập nhật trạng thái
- Danh sách phương tiện được phân bổ
- Lịch sử chat
- Timeline tiến trình

#### 5.2.6. CreateTicketPage (`/tickets/create`)

- Form tạo phiếu thủ công
- Chọn loại khẩn cấp
- Nhập thông tin người báo, địa chỉ, số nạn nhân

#### 5.2.7. UsersPage (`/users`) - Admin

- Quản lý CRUD người dùng
- Phân quyền (Admin/Staff/Reporter)
- Reset mật khẩu
- Bật/tắt tài khoản

#### 5.2.8. VehiclesPage (`/vehicles`)

- Danh sách phương tiện với bộ lọc
- Thẻ thống kê (tổng, khả dụng, đang làm nhiệm vụ, bảo trì)
- Thêm/sửa/xóa phương tiện
- Quản lý trạng thái

#### 5.2.9. VehicleDetailPage (`/vehicles/:id`)

- Thông tin chi tiết phương tiện
- Lịch sử nhiệm vụ
- Trạng thái nhiệm vụ hiện tại
- Khu vực phục vụ

### 5.3. Các thành phần (Components)

| Component | Mô tả |
|-----------|--------|
| `Layout` | Layout chính với sidebar điều hướng responsive, AppBar, menu theo role |
| `PrivateRoute` | Bảo vệ route - chuyển hướng về `/login` nếu chưa đăng nhập |
| `AdminRoute` | Kiểm tra quyền theo role, hỗ trợ prop `allowedRoles` |
| `AuthModal` | Modal đăng nhập/đăng ký dạng tab, hỗ trợ Reporter |
| `MessageBubble` | Hiển thị tin nhắn chat với style theo role, hỗ trợ HTML |
| `TicketSummary` | Card thông tin phiếu, nút tải PDF |
| `ChatHistory` | Danh sách phiên chat gần đây |
| `MyTickets` | Widget phiếu của user (compact/expanded) |
| `VoiceChat` | Điều khiển ghi âm STT + phát TTS |
| `VehicleForm` | Form modal thêm/sửa phương tiện, chọn khu vực phục vụ |
| `PhoneInput` | Input SĐT Việt Nam với validation và auto-format |

### 5.4. Custom Hooks

#### `useVoiceChat`

```javascript
const {
  isRecording,      // Đang ghi âm?
  isPlaying,        // Đang phát TTS?
  isTTSEnabled,     // TTS bật/tắt
  transcript,       // Văn bản từ STT
  startRecording,   // Bắt đầu ghi âm
  stopRecording,    // Dừng ghi âm
  speakText,        // Phát TTS
  toggleTTS,        // Bật/tắt TTS
  isSupported,      // Trình duyệt hỗ trợ?
} = useVoiceChat();
```

- **STT:** Web Speech API (trình duyệt)
- **TTS:** ElevenLabs API (qua backend)
- Quản lý hàng đợi audio
- Tự động phát phản hồi chatbot

#### `usePhoneValidation`

```javascript
const {
  isValid,     // SĐT hợp lệ?
  error,       // Thông báo lỗi
  normalized,  // SĐT chuẩn hóa
  validate,    // Hàm validate
} = usePhoneValidation();
```

- Validate SĐT Việt Nam (10 số, đầu 0)
- Hỗ trợ các đầu số: 03x, 05x, 07x, 08x, 09x
- Auto-format và chuẩn hóa

### 5.5. Services (API Integration)

**Base API (`services/api.js`):**
- Tạo Axios instance với `baseURL` từ biến môi trường
- Request interceptor: tự động thêm JWT token vào header
- Response interceptor: xử lý lỗi 401 (hết phiên → logout)

| Service | Các phương thức chính |
|---------|----------------------|
| `chatService` | `processMessage()`, `createTicketFromChat()`, `getChatHistory()`, `getTicketHistory()` |
| `ticketService` | `createTicket()`, `getTickets()`, `getTicket()`, `updateTicketStatus()`, `downloadPDF()`, `getStatistics()` |
| `userService` | `getUsers()`, `createUser()`, `updateUser()`, `deleteUser()`, `resetPassword()`, `toggleStatus()` |
| `vehicleService` | `getVehicles()`, `createVehicle()`, `updateVehicle()`, `deleteVehicle()`, `updateVehicleStatus()`, `getStatistics()` |
| `voiceService` | `textToSpeech()`, `createSpeechRecognition()`, `requestMicrophoneAccess()` |

### 5.6. Quản lý trạng thái

Sử dụng **React Context API** (không dùng Redux/Zustand):

| Context | Chức năng |
|---------|-----------|
| `AuthContext` | Quản lý trạng thái đăng nhập, token JWT, thông tin user, đăng nhập/đăng xuất |
| `SocketContext` | Quản lý kết nối WebSocket (Socket.IO), trạng thái kết nối |

Các component sử dụng `useState` cho state cục bộ.

### 5.7. Định tuyến (Routing)

```
/login                → LoginPage (Public)
/                     → Redirect → /chat
/chat                 → ChatPage (Public - hỗ trợ guest)
/dashboard            → DashboardPage (Admin only)
/tickets              → TicketsPage (Authenticated)
/tickets/create       → CreateTicketPage (Admin/Staff)
/tickets/:id          → TicketDetailPage (Authenticated)
/users                → UsersPage (Admin only)
/vehicles             → VehiclesPage (Admin/Staff)
/vehicles/:id         → VehicleDetailPage (Admin/Staff)
```

### 5.8. Responsive & Mobile Support

Frontend được thiết kế theo hướng **responsive-first**, sử dụng hệ thống breakpoints của Material-UI kết hợp CSS Grid/Media queries để hỗ trợ đa thiết bị.

#### 5.8.1. Hệ thống Breakpoints

Sử dụng breakpoints mặc định của MUI v5:

| Breakpoint | Kích thước | Thiết bị |
|------------|-----------|----------|
| `xs` | 0px+ | Điện thoại nhỏ |
| `sm` | 600px+ | Điện thoại lớn / Tablet dọc |
| `md` | 900px+ | Tablet ngang |
| `lg` | 1200px+ | Desktop |
| `xl` | 1536px+ | Màn hình lớn |

#### 5.8.2. Layout chính (Sidebar + AppBar)

Component `Layout.js` sử dụng `useMediaQuery` để phát hiện mobile:

```javascript
const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 600px
```

| Thành phần | Mobile (< 600px) | Desktop (>= 600px) |
|------------|-------------------|---------------------|
| **Sidebar (Drawer)** | Drawer tạm thời (temporary) - ẩn mặc định, mở bằng nút hamburger | Drawer cố định (permanent) - luôn hiển thị, rộng 240px |
| **Nút Hamburger** | Hiển thị trên AppBar | Ẩn |
| **AppBar** | Toàn chiều rộng | `width: calc(100% - 240px)`, margin-left: 240px |
| **Nội dung chính** | Toàn chiều rộng | `width: calc(100% - 240px)` |

```
Mobile (< 600px):                    Desktop (≥ 600px):
┌──────────────────┐                 ┌────────┬──────────────┐
│ [☰] AppBar       │                 │Sidebar │   AppBar     │
├──────────────────┤                 │ 240px  ├──────────────┤
│                  │                 │        │              │
│   Main Content   │                 │ Menu   │ Main Content │
│   (100% width)   │                 │ items  │              │
│                  │                 │        │              │
└──────────────────┘                 └────────┴──────────────┘
```

#### 5.8.3. Responsive theo từng trang

**ChatPage (`/chat`):**

```javascript
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
```

| Vùng | Mobile (xs) | Desktop (md+) |
|------|-------------|---------------|
| Khu vực chat | `xs={12}` - toàn chiều rộng | `md={8}` - 66.7% chiều rộng |
| Panel thông tin | `xs={12}` - toàn chiều rộng (xếp dưới) | `md={4}` - 33.3% chiều rộng (bên phải) |
| Nút hamburger | Hiển thị (mở sidebar) | Ẩn |

```
Mobile:                    Desktop:
┌──────────────┐          ┌──────────┬───────┐
│  Chat Area   │          │          │ Info  │
│  (100%)      │          │  Chat    │ Panel │
├──────────────┤          │  Area    │ (33%) │
│  Info Panel  │          │  (67%)   │       │
│  (100%)      │          │          │       │
└──────────────┘          └──────────┴───────┘
```

**DashboardPage (`/dashboard`):**

| Thành phần | Mobile (xs) | Tablet (sm) | Desktop (md+) |
|------------|-------------|-------------|----------------|
| Thẻ thống kê | `xs={12}` - 1 cột | `sm={6}` - 2 cột | `md={3}` - 4 cột |

```
Mobile:           Tablet:           Desktop:
┌──────────┐     ┌─────┬─────┐     ┌───┬───┬───┬───┐
│  Card 1  │     │  1  │  2  │     │ 1 │ 2 │ 3 │ 4 │
├──────────┤     ├─────┼─────┤     └───┴───┴───┴───┘
│  Card 2  │     │  3  │  4  │
├──────────┤     └─────┴─────┘
│  Card 3  │
├──────────┤
│  Card 4  │
└──────────┘
```

**TicketsPage (`/tickets`):**

| Thành phần | Mobile (xs) | Tablet (sm+) |
|------------|-------------|--------------|
| Bộ lọc (3 filters) | `xs={12}` - xếp dọc | `sm={4}` - 3 cột ngang |

**TicketDetailPage (`/tickets/:id`):**

| Thành phần | Mobile (xs) | Desktop (md+) |
|------------|-------------|---------------|
| Nội dung chính | `xs={12}` - toàn chiều rộng | `md={8}` - 66.7% |
| Sidebar phụ | `xs={12}` - toàn chiều rộng | `md={4}` - 33.3% |

**UsersPage (`/users`):**

| Thành phần | Mobile (xs) | Tablet (sm+) |
|------------|-------------|--------------|
| Form fields | `xs={12}` - 1 cột | `sm={6}` - 2 cột |

**VehiclesPage (`/vehicles`):**

| Thành phần | Responsive |
|------------|-----------|
| Thẻ thống kê | CSS Grid `auto-fit, minmax(200px, 1fr)` - tự động điều chỉnh |

**LoginPage (`/login`):**

- Container `maxWidth="sm"` (tối đa 600px) - căn giữa trên mọi kích thước màn hình

#### 5.8.4. Kỹ thuật Responsive được sử dụng

| Kỹ thuật | Vị trí sử dụng | Mô tả |
|----------|-----------------|--------|
| `useMediaQuery` hook | Layout.js, ChatPage.js | Phát hiện breakpoint, trả về boolean |
| MUI Grid system | Hầu hết các trang | Hệ thống lưới 12 cột với props responsive (`xs`, `sm`, `md`) |
| MUI `sx` prop responsive | Layout.js (AppBar, Drawer) | Object syntax: `{ xs: value, sm: value }` |
| Conditional rendering | Layout.js, ChatPage.js | `isMobile && <Component>` - render theo thiết bị |
| CSS Grid `auto-fit` | VehiclesPage, VehicleDetail | `repeat(auto-fit, minmax(Xpx, 1fr))` - tự co giãn |
| CSS Media queries | PhoneInput.css | `@media (max-width: 576px)` - chống zoom iOS |
| MUI Container | Nhiều trang | `maxWidth` prop giới hạn chiều rộng tối đa |

#### 5.8.5. Tối ưu Mobile

| Tối ưu | Chi tiết |
|--------|----------|
| **Chống zoom iOS** | PhoneInput.css set `font-size: 16px` ở mobile để tránh auto-zoom |
| **Drawer tự đóng** | Sidebar tự đóng khi chuyển trang trên mobile |
| **Touch-friendly** | MUI components có kích thước touch target phù hợp (>= 44px) |
| **Stack layout** | Grid items tự xếp dọc trên mobile (`xs={12}`) |
| **Dark mode** | Hỗ trợ `prefers-color-scheme: dark` trong PhoneInput |

---

## 6. Luồng hoạt động chính

### 6.1. Luồng trò chuyện với Chatbot

```
1. Người dùng mở /chat (guest hoặc đã đăng nhập)
2. Nhập tin nhắn hoặc nói bằng giọng nói
   │
   ├─ [Giọng nói] → Web Speech API (STT) → Chuyển thành text
   │
3. Frontend gửi POST /api/chat/message
   {
     message: "Nhà tôi bị cháy ở quận 1",
     sessionId: "abc123",
     userId: "..." (optional)
   }
   │
4. Backend → chatController.processMessage()
   │
5. LangGraph Workflow:
   │
   ├─ [memoryRetrieval] → Nếu user đã đăng nhập, lấy thông tin đã lưu
   │
   ├─ [extractInfo] → Trích xuất:
   │     - Loại khẩn cấp: FIRE (cháy)
   │     - Địa chỉ: Quận 1
   │     - SĐT, tên, số nạn nhân: chưa có
   │
   ├─ [router] → Quyết định: cần thu thập thêm thông tin
   │
   ├─ [collectInfo] → "Anh/chị cho em xin số điện thoại liên lạc..."
   │
   │  ... (nhiều lượt hỏi đáp) ...
   │
   ├─ [router] → Đã đủ thông tin → chuyển sang confirm
   │
   └─ [confirm] → Hiển thị xác nhận + Tạo phiếu
         │
6. Phản hồi trả về Frontend
   │
7. [TTS] → ElevenLabs API → Phát giọng nói phản hồi
```

### 6.2. Luồng tạo phiếu tiếp nhận

```
1. Chatbot đã thu thập đủ thông tin
   │
2. Node [confirm] → Hiển thị tóm tắt cho người dùng xác nhận
   │
3. Người dùng xác nhận → POST /api/tickets/public
   │
4. Backend:
   ├─ Validate dữ liệu (SĐT bắt buộc)
   ├─ Tạo ticketId: TD-20260209-143052-A1B2
   ├─ Lưu Ticket vào MongoDB
   ├─ Gọi vehicleService.assignVehicles()
   ├─ Cập nhật UserMemory (nếu đã đăng nhập)
   └─ Trả về thông tin phiếu
   │
5. Frontend hiển thị TicketSummary
   │
6. Staff/Admin có thể xem, cập nhật trạng thái trên /tickets
```

### 6.3. Luồng điều phối phương tiện

```
1. Phiếu được tạo với emergencyType và location
   │
2. vehicleService.assignVehicles():
   │
   ├─ Ánh xạ loại khẩn cấp → loại xe:
   │     FIRE → FIRE_TRUCK + AMBULANCE
   │     MEDICAL → AMBULANCE
   │     SECURITY → POLICE
   │
   ├─ Tìm xe khả dụng theo khu vực:
   │     Vehicle.findAvailableForLocation(ward, district)
   │     → Lọc status = 'AVAILABLE'
   │     → Lọc coverage chứa ward/district
   │
   ├─ Phân bổ xe:
   │     vehicle.startMission(ticketId, location)
   │     → status = 'ON_MISSION'
   │     → Ghi currentMission
   │
   └─ Cập nhật ticket.assignedVehicles
   │
3. Khi hoàn thành:
   └─ vehicle.completeMission()
       → status = 'AVAILABLE'
       → Ghi vào missionHistory
```

### 6.4. Luồng hướng dẫn sơ cứu (RAG)

```
1. Người dùng hỏi về sơ cứu: "Bị bỏng phải làm sao?"
   │
2. [router] → Phát hiện câu hỏi sơ cứu → chuyển đến [firstAidRag]
   │
3. [firstAidRag]:
   │
   ├─ Tạo embedding cho câu hỏi (OpenAI Embeddings)
   │
   ├─ Tìm kiếm tương tự trong DocumentEmbedding
   │   → Cosine similarity trên vector 1536 chiều
   │   → Lấy top-k chunks liên quan
   │
   ├─ Sử dụng chunks làm context cho GPT-4
   │   → Prompt: "Dựa trên tài liệu sau, hướng dẫn sơ cứu..."
   │
   └─ Trả về hướng dẫn sơ cứu có nguồn trích dẫn
   │
4. Tài liệu nguồn:
   ├─ Cam-nang-PCCC-trong-gia-dinh.pdf (Cẩm nang PCCC)
   └─ tai-lieu-so-cap-cuu.pdf (Tài liệu sơ cấp cứu)
```

---

## 7. Bảo mật & Phân quyền RBAC

### 7.1. Tổng quan bảo mật

| Lớp bảo mật | Chi tiết |
|--------------|----------|
| **Mã hóa mật khẩu** | bcrypt với salt rounds = 10 |
| **Xác thực JWT** | Token có thời hạn, lưu trong localStorage |
| **Phân quyền RBAC** | 4 role: Admin, Staff, Reporter, Guest |
| **Khóa tài khoản** | Tự động khóa sau 5 lần đăng nhập thất bại (2 giờ) |
| **Rate Limiting** | Giới hạn 100 request / 15 phút (có thể cấu hình) |
| **HTTP Security Headers** | Helmet.js (X-Frame-Options, CSP, HSTS, ...) |
| **CORS** | Chỉ cho phép origin được cấu hình |
| **Input Validation** | express-validator + Zod schema validation |
| **Error Handling** | Không lộ stack trace ở production |
| **Kiểm tra trạng thái** | Chỉ user có `status = active` mới được xác thực |

### 7.2. Luồng xác thực JWT

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LUỒNG XÁC THỰC JWT                          │
│                                                                     │
│  1. ĐĂNG NHẬP                                                       │
│  ┌──────────┐    POST /api/auth/login     ┌──────────┐             │
│  │ Frontend │ ──────────────────────────→  │ Backend  │             │
│  │          │  { username, password }      │          │             │
│  │          │                              │ Validate │             │
│  │          │  ←──────────────────────────  │ → Hash   │             │
│  │          │  { token, user }             │ → JWT    │             │
│  └────┬─────┘                              └──────────┘             │
│       │                                                             │
│  2. LƯU TRỮ                                                        │
│       │ localStorage.setItem('token', token)                        │
│       │ localStorage.setItem('user', JSON.stringify(user))          │
│       │                                                             │
│  3. GỬI REQUEST                                                     │
│  ┌────▼─────┐    GET /api/tickets          ┌──────────┐            │
│  │ Axios    │ ──────────────────────────→   │ auth.js  │            │
│  │Interceptor│  Authorization:              │middleware│            │
│  │ tự động  │  Bearer <token>              │          │            │
│  │ thêm     │                              │ Verify   │            │
│  │ header   │  ←──────────────────────────  │ → User   │            │
│  └──────────┘  { data }                    │ → Active?│            │
│                                            │ → req.user│            │
│  4. HẾT PHIÊN                              └──────────┘            │
│  Response 401 → Axios interceptor → logout() → redirect /login      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Chi tiết middleware xác thực:**

| Middleware | File | Chức năng |
|------------|------|-----------|
| `auth` | `middleware/auth.js` | **Bắt buộc xác thực.** Trích xuất JWT từ header `Authorization: Bearer <token>`, verify token, load user từ DB (loại trừ password), kiểm tra `status === 'active'`. Gắn `req.user` và `req.token`. Trả 401 nếu thất bại. |
| `optionalAuth` | `middleware/optionalAuth.js` | **Xác thực tùy chọn.** Nếu có token hợp lệ: gắn `req.user`, set `req.isAuthenticated = true`. Nếu không có/invalid: set `req.user = null`, `req.isAuthenticated = false`, **vẫn cho đi tiếp** (hỗ trợ Guest). |
| `authorize.*` | `middleware/authorize.js` | **Phân quyền theo role.** Kiểm tra `req.user.role` sau khi đã xác thực. Cung cấp các hàm: `isAdmin`, `isAdminOrStaff`, `requireRole()`, `requirePermission()`. |

### 7.3. Các vai trò (Roles)

Hệ thống có **4 loại người dùng** với quyền hạn khác nhau:

```
┌────────────────────────────────────────────────────────────────┐
│                    PHÂN CẤP VAI TRÒ                            │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     ADMIN                                 │  │
│  │  • Toàn quyền quản trị hệ thống                          │  │
│  │  • Quản lý người dùng, phương tiện, phiếu                │  │
│  │  • Xem dashboard thống kê, xuất báo cáo                  │  │
│  │  ┌────────────────────────────────────────────────────┐   │  │
│  │  │                   STAFF                             │   │  │
│  │  │  • Xem và cập nhật trạng thái phiếu                │   │  │
│  │  │  • Xem và quản lý trạng thái phương tiện           │   │  │
│  │  │  • Phân bổ/giải phóng phương tiện                  │   │  │
│  │  │  ┌──────────────────────────────────────────────┐  │   │  │
│  │  │  │               REPORTER                       │  │   │  │
│  │  │  │  • Xem phiếu của chính mình                  │  │   │  │
│  │  │  │  • Tải PDF phiếu của mình                    │  │   │  │
│  │  │  │  • Chat với chatbot (có lưu memory)          │  │   │  │
│  │  │  │  ┌──────────────────────────────────────┐    │  │   │  │
│  │  │  │  │             GUEST                     │    │  │   │  │
│  │  │  │  │  • Chat với chatbot (không lưu)       │    │  │   │  │
│  │  │  │  │  • Tạo phiếu qua chatbot              │    │  │   │  │
│  │  │  │  │  • Không truy cập quản trị            │    │  │   │  │
│  │  │  │  └──────────────────────────────────────┘    │  │   │  │
│  │  │  └──────────────────────────────────────────────┘  │   │  │
│  │  └────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

| Vai trò | Mô tả | Đăng ký | Đăng nhập |
|---------|--------|---------|-----------|
| **Admin** | Quản trị viên hệ thống, toàn quyền | `POST /api/auth/register` | `POST /api/auth/login` |
| **Staff** | Nhân viên tiếp nhận cuộc gọi | `POST /api/auth/register` | `POST /api/auth/login` |
| **Reporter** | Người báo tin khẩn cấp (công dân) | `POST /api/auth/register-reporter` | `POST /api/auth/login-reporter` |
| **Guest** | Người dùng ẩn danh, không cần đăng nhập | Không cần | Không cần |

### 7.4. Ma trận quyền hạn chi tiết

#### 7.4.1. Quyền theo module

| Module / Hành động | Admin | Staff | Reporter | Guest |
|---------------------|:-----:|:-----:|:--------:|:-----:|
| **CHAT** | | | | |
| Gửi tin nhắn chatbot | ✅ | ✅ | ✅ | ✅ |
| Tạo phiếu từ chat | ✅ | ✅ | ✅ | ✅ |
| Xem phiên chat | ✅ | ✅ | ✅ | ✅ |
| Xem lịch sử chat | ✅ | ✅ | ✅ | ❌ |
| Xem lịch sử phiếu | ✅ | ✅ | ✅ | ❌ |
| Lưu thông tin cá nhân (memory) | ✅ | ✅ | ✅ | ❌ |
| **PHIẾU TIẾP NHẬN** | | | | |
| Xem tất cả phiếu | ✅ | ✅ | ❌ | ❌ |
| Xem phiếu của mình | ✅ | ✅ | ✅ | ❌ |
| Tạo phiếu thủ công | ✅ | ✅ | ❌ | ❌ |
| Cập nhật trạng thái phiếu | ✅ | ✅ | ❌ | ❌ |
| Cập nhật toàn bộ phiếu | ✅ | ❌ | ❌ | ❌ |
| Xuất PDF phiếu | ✅ | ✅ | ✅ (của mình) | ❌ |
| Thêm tin nhắn vào phiếu | ✅ | ✅ | ✅ | ❌ |
| **NGƯỜI DÙNG** | | | | |
| Xem danh sách người dùng | ✅ | ❌ | ❌ | ❌ |
| Tạo người dùng | ✅ | ❌ | ❌ | ❌ |
| Sửa người dùng | ✅ | ❌ | ❌ | ❌ |
| Xóa người dùng | ✅ | ❌ | ❌ | ❌ |
| Reset mật khẩu | ✅ | ❌ | ❌ | ❌ |
| Bật/tắt tài khoản | ✅ | ❌ | ❌ | ❌ |
| **PHƯƠNG TIỆN** | | | | |
| Xem danh sách phương tiện | ✅ | ✅ | ❌ | ❌ |
| Xem thống kê phương tiện | ✅ | ✅ | ❌ | ❌ |
| Thêm phương tiện | ✅ | ❌ | ❌ | ❌ |
| Sửa phương tiện | ✅ | ❌ | ❌ | ❌ |
| Xóa phương tiện | ✅ | ❌ | ❌ | ❌ |
| Cập nhật trạng thái xe | ✅ | ✅ | ❌ | ❌ |
| Phân bổ xe thủ công | ✅ | ✅ | ❌ | ❌ |
| Giải phóng xe | ✅ | ✅ | ❌ | ❌ |
| **DASHBOARD** | | | | |
| Xem bảng điều khiển | ✅ | ❌ | ❌ | ❌ |
| Xem thống kê | ✅ | ✅ | ❌ | ❌ |
| **GIỌNG NÓI** | | | | |
| Text-to-Speech | ✅ | ✅ | ✅ | ✅ |
| Speech-to-Text | ✅ | ✅ | ✅ | ✅ |

#### 7.4.2. Ma trận quyền Backend (authorize.js)

```javascript
const ROLE_PERMISSIONS = {
  admin: {
    tickets:   ['create', 'read', 'update', 'delete', 'updateStatus'],
    users:     ['create', 'read', 'update', 'delete'],
    dashboard: ['read'],
    reports:   ['read', 'export']
  },
  staff: {
    tickets:   ['read', 'updateStatus'],
    users:     [],
    dashboard: [],
    reports:   []
  },
  reporter: {
    // Không có quyền trong ma trận — xử lý bởi controller logic
  }
};
```

### 7.5. Bảo vệ API Endpoints theo Role

#### Authentication Routes (`/api/auth`)

| Endpoint | Middleware | Admin | Staff | Reporter | Guest |
|----------|-----------|:-----:|:-----:|:--------:|:-----:|
| `POST /register` | Không | ✅ | ✅ | ✅ | ✅ |
| `POST /login` | Không | ✅ | ✅ | ✅ | ✅ |
| `POST /register-reporter` | Không | ✅ | ✅ | ✅ | ✅ |
| `POST /login-reporter` | Không | ✅ | ✅ | ✅ | ✅ |
| `GET /me` | `auth` | ✅ | ✅ | ✅ | ❌ |
| `PUT /profile` | `auth` | ✅ | ✅ | ✅ | ❌ |
| `POST /change-password` | `auth` | ✅ | ✅ | ✅ | ❌ |

#### Chat Routes (`/api/chat`)

| Endpoint | Middleware | Admin | Staff | Reporter | Guest |
|----------|-----------|:-----:|:-----:|:--------:|:-----:|
| `POST /message` | `optionalAuth` | ✅ | ✅ | ✅ | ✅ |
| `POST /create-ticket` | `optionalAuth` | ✅ | ✅ | ✅ | ✅ |
| `GET /session/:id` | `optionalAuth` | ✅ | ✅ | ✅ | ✅ |
| `GET /session/:id/details` | `optionalAuth` | ✅ | ✅ | ✅* | ✅ |
| `DELETE /session/:id` | Không | ✅ | ✅ | ✅ | ✅ |
| `GET /health` | Không | ✅ | ✅ | ✅ | ✅ |
| `GET /history` | `auth` | ✅ | ✅ | ✅ | ❌ |
| `GET /tickets` | `auth` | ✅ | ✅ | ✅ | ❌ |
| `GET /saved-info` | `auth` | ✅ | ✅ | ✅ | ❌ |

> *`GET /session/:id/details`: Nếu đã đăng nhập, kiểm tra `session.userId === req.user._id` (403 nếu không khớp)

#### Ticket Routes (`/api/tickets`)

| Endpoint | Middleware | Admin | Staff | Reporter | Guest |
|----------|-----------|:-----:|:-----:|:--------:|:-----:|
| `POST /public` | Không | ✅ | ✅ | ✅ | ✅ |
| `GET /` | `auth` | ✅ (tất cả) | ✅ (tất cả) | ✅ (của mình)* | ❌ |
| `POST /` | `auth` + `isAdminOrStaff` | ✅ | ✅ | ❌ | ❌ |
| `GET /stats/overview` | `auth` | ✅ | ✅ | ✅ | ❌ |
| `GET /:id` | `auth` | ✅ | ✅ | ✅ (của mình)* | ❌ |
| `GET /:id/pdf` | `auth` | ✅ | ✅ | ✅ (của mình)* | ❌ |
| `PATCH /:id/status` | `auth` + `isAdminOrStaff` | ✅ | ✅ | ❌ | ❌ |
| `PUT /:id` | `auth` + `isAdmin` | ✅ | ❌ | ❌ | ❌ |
| `POST /:id/messages` | `auth` | ✅ | ✅ | ✅ | ❌ |

> *Reporter chỉ xem phiếu mà `ticket.reporter.phone === user.profile.phone`. Trả 403 nếu không phải phiếu của mình.

#### User Routes (`/api/users`) — Admin Only

| Endpoint | Middleware | Admin | Staff | Reporter | Guest |
|----------|-----------|:-----:|:-----:|:--------:|:-----:|
| `GET /` | `auth` + `isAdmin` | ✅ | ❌ | ❌ | ❌ |
| `GET /:id` | `auth` + `isAdmin` | ✅ | ❌ | ❌ | ❌ |
| `POST /` | `auth` + `isAdmin` | ✅ | ❌ | ❌ | ❌ |
| `PUT /:id` | `auth` + `isAdmin` | ✅ | ❌ | ❌ | ❌ |
| `DELETE /:id` | `auth` + `isAdmin` | ✅ | ❌ | ❌ | ❌ |
| `POST /:id/reset-password` | `auth` + `isAdmin` | ✅ | ❌ | ❌ | ❌ |
| `PATCH /:id/toggle-status` | `auth` + `isAdmin` | ✅ | ❌ | ❌ | ❌ |

#### Vehicle Routes (`/api/vehicles`)

| Endpoint | Middleware | Admin | Staff | Reporter | Guest |
|----------|-----------|:-----:|:-----:|:--------:|:-----:|
| `GET /` | `auth` + `isAdminOrStaff` | ✅ | ✅ | ❌ | ❌ |
| `GET /available` | `auth` + `isAdminOrStaff` | ✅ | ✅ | ❌ | ❌ |
| `GET /statistics` | `auth` + `isAdminOrStaff` | ✅ | ✅ | ❌ | ❌ |
| `GET /:id` | `auth` + `isAdminOrStaff` | ✅ | ✅ | ❌ | ❌ |
| `GET /:id/history` | `auth` + `isAdminOrStaff` | ✅ | ✅ | ❌ | ❌ |
| `POST /` | `auth` + `isAdmin` | ✅ | ❌ | ❌ | ❌ |
| `PUT /:id` | `auth` + `isAdmin` | ✅ | ❌ | ❌ | ❌ |
| `DELETE /:id` | `auth` + `isAdmin` | ✅ | ❌ | ❌ | ❌ |
| `PATCH /:id/status` | `auth` + `isAdminOrStaff` | ✅ | ✅ | ❌ | ❌ |
| `POST /assign` | `auth` + `isAdminOrStaff` | ✅ | ✅ | ❌ | ❌ |
| `POST /release` | `auth` + `isAdminOrStaff` | ✅ | ✅ | ❌ | ❌ |

#### Voice Routes (`/api/voice`) — Public

| Endpoint | Middleware | Admin | Staff | Reporter | Guest |
|----------|-----------|:-----:|:-----:|:--------:|:-----:|
| `POST /tts` | Không | ✅ | ✅ | ✅ | ✅ |
| `POST /tts/stream` | Không | ✅ | ✅ | ✅ | ✅ |
| `GET /voices` | Không | ✅ | ✅ | ✅ | ✅ |
| `GET /health` | Không | ✅ | ✅ | ✅ | ✅ |

### 7.6. Bảo vệ Route Frontend

Frontend sử dụng 2 component wrapper để bảo vệ route:

#### PrivateRoute — Yêu cầu đăng nhập

```javascript
// Component kiểm tra xác thực
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <CircularProgress />;   // Đang kiểm tra
  if (!user) return <Navigate to="/login" />; // Chưa đăng nhập → redirect
  return children;                             // Đã đăng nhập → render
};
```

#### AdminRoute — Kiểm tra role

```javascript
// Component kiểm tra role
const AdminRoute = ({ children, allowedRoles = ['admin'] }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <CircularProgress />;
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) {
    return <Alert severity="error">Không có quyền truy cập</Alert>;
  }
  return children;
};
```

#### Áp dụng trên Routes

| Route | Wrapper | Roles được phép |
|-------|---------|-----------------|
| `/chat` | Không | Tất cả (Guest + Auth) |
| `/login` | Không | Tất cả |
| `/dashboard` | `AdminRoute` | `['admin']` |
| `/tickets` | `PrivateRoute` | Authenticated (all roles) |
| `/tickets/create` | `AdminRoute` | `['admin', 'staff']` |
| `/tickets/:id` | `PrivateRoute` | Authenticated (all roles) |
| `/users` | `AdminRoute` | `['admin']` |
| `/vehicles` | `AdminRoute` | `['admin', 'staff']` |
| `/vehicles/:id` | `AdminRoute` | `['admin', 'staff']` |

### 7.7. Logic quyền đặc biệt

#### 7.7.1. Reporter chỉ xem phiếu của mình

Reporter được xác định qua **số điện thoại** (không phải userId):

```
Reporter request GET /api/tickets
    │
    ▼
Controller kiểm tra: req.user.role === 'reporter'?
    │
    ├─ Có → Lọc: ticket.reporter.phone === req.user.profile.phone
    │        → Chỉ trả về phiếu khớp SĐT
    │
    └─ Không → Trả về tất cả phiếu (Admin/Staff)
```

Tương tự cho `GET /tickets/:id` và `GET /tickets/:id/pdf`: trả 403 nếu phiếu không thuộc về Reporter.

#### 7.7.2. Chat Session Ownership

Khi user đã đăng nhập xem chi tiết phiên chat:

```
GET /api/chat/session/:sessionId/details
    │
    ▼
optionalAuth → req.isAuthenticated?
    │
    ├─ Có → Kiểm tra: session.userId === req.user._id
    │        ├─ Khớp → Trả dữ liệu
    │        └─ Không khớp → 403 Forbidden
    │
    └─ Không → Trả dữ liệu (Guest không kiểm tra ownership)
```

#### 7.7.3. Khóa tài khoản tự động

```
Đăng nhập thất bại
    │
    ▼
user.incLoginAttempts()
    │
    ├─ loginAttempts < 5 → Cho thử lại
    │
    └─ loginAttempts >= 5 → Khóa tài khoản
         │
         ▼
    lockUntil = Date.now() + 2 giờ
         │
    Các lần đăng nhập tiếp theo:
         │
         ├─ lockUntil > Date.now() → "Tài khoản bị khóa, thử lại sau"
         │
         └─ lockUntil <= Date.now() → Mở khóa, reset loginAttempts
              → user.resetLoginAttempts()
```

#### 7.7.4. Optional Auth cho Guest

Các endpoint chat sử dụng `optionalAuth` để hỗ trợ cả Guest và user đã đăng nhập:

| Trường hợp | `req.user` | `req.isAuthenticated` | Hành vi |
|-------------|------------|----------------------|---------|
| Không có token | `null` | `false` | Guest mode - chat không lưu memory |
| Token hợp lệ | `{...user}` | `true` | Auth mode - chat có lưu memory, lịch sử |
| Token không hợp lệ | `null` | `false` | Fallback sang Guest mode (không lỗi) |

---

## 8. Hệ thống kiểm thử

### 8.1. Unit Tests (JavaScript)

- `backend/tests/phoneValidator.test.js` — 49 test cases validate SĐT Việt Nam
- `backend/tests/chatbotPhoneValidation.test.js` — Test tích hợp validation SĐT trong luồng chatbot

### 8.2. DeepEval Framework (Python)

Framework đánh giá toàn diện chatbot AI với ~1000 test cases:

| Danh mục | Số lượng | Mô tả |
|----------|----------|--------|
| `emergency_type_detection` | ~180 | Phát hiện loại khẩn cấp (Cháy, Y tế, An ninh) |
| `location_extraction` | ~125 | Trích xuất địa chỉ Việt Nam |
| `phone_validation` | ~120 | Validate số điện thoại |
| `affected_people` | ~90 | Trích xuất số nạn nhân |
| `conversation_flow` | ~135 | Luồng hội thoại nhiều lượt |
| `confirmation` | ~60 | Xác nhận/sửa thông tin |
| `first_aid_guidance` | ~80 | Hướng dẫn sơ cứu (RAG) |
| `authenticated_user` | ~60 | Tính năng user đã đăng nhập |
| `edge_cases` | ~120 | Trường hợp biên và bảo mật |
| `language_variations` | ~100 | Biến thể ngôn ngữ/phương ngữ Việt |

**Metrics đánh giá:**

- **Định lượng:** Answer Relevancy, Faithfulness, Hallucination, Toxicity, Bias
- **Định tính:** G-Eval tùy chỉnh cho dịch vụ khẩn cấp Việt Nam

**Lệnh chạy:**

```bash
cd backend/tests/deepeval
pip install -r requirements.txt

# Chạy đầy đủ (~1000 cases)
python run_evaluation.py

# Chạy nhanh (10 cases)
python run_evaluation.py --quick

# Chạy theo danh mục
python run_evaluation.py --category emergency_type_detection

# Chạy multi-turn conversation
python run_evaluation.py --multi-turn
```

**Output:** Báo cáo HTML với biểu đồ tương tác, bảng kết quả chi tiết, lưu tại `backend/tests/deepeval/reports/`.

---

## 9. Biến môi trường

### Backend (`.env`)

| Biến | Bắt buộc | Mặc định | Mô tả |
|------|----------|----------|--------|
| `PORT` | Không | `5000` | Port server |
| `NODE_ENV` | Không | `development` | Môi trường |
| `MONGODB_URI` | Có | `mongodb://localhost:27017/emergency_112` | Chuỗi kết nối MongoDB |
| `JWT_SECRET` | Có | - | Khóa bí mật JWT |
| `OPENAI_API_KEY` | Có | - | API key OpenAI |
| `OPENAI_MODEL` | Không | `gpt-4-turbo-preview` | Model OpenAI |
| `ELEVENLABS_API_KEY` | Không | - | API key ElevenLabs (TTS) |
| `ELEVENLABS_VOICE_ID` | Không | `onwK4e9ZLuTAKqWW03F9` | Voice ID tiếng Việt |
| `ELEVENLABS_MODEL_ID` | Không | `eleven_turbo_v2_5` | Model TTS |
| `CORS_ORIGIN` | Không | `http://localhost:3000` | Origin cho CORS |
| `RATE_LIMIT_WINDOW_MS` | Không | `900000` (15 phút) | Cửa sổ rate limit |
| `RATE_LIMIT_MAX_REQUESTS` | Không | `100` | Số request tối đa |
| `USE_MONGODB_CHECKPOINTER` | Không | `true` | Dùng MongoDB lưu state LangGraph |

### Frontend (`.env`)

| Biến | Mô tả |
|------|--------|
| `REACT_APP_API_URL` | URL backend API (mặc định: `http://localhost:5000/api`) |
| `REACT_APP_SOCKET_URL` | URL WebSocket (mặc định: `http://localhost:5000`) |

### DeepEval (`.env`)

| Biến | Mô tả |
|------|--------|
| `OPENAI_API_KEY` | API key cho evaluation metrics |
| `DEEPEVAL_MODEL` | Model đánh giá (mặc định: `gpt-4o`) |

---

## 10. Hướng dẫn triển khai

### 10.1. Yêu cầu hệ thống

- **Node.js** >= 18.x
- **MongoDB** >= 6.x
- **Python** >= 3.9 (cho DeepEval)
- **npm** >= 9.x

### 10.2. Cài đặt

```bash
# Clone repository
git clone <repo-url>
cd Thesis

# Cài đặt tất cả dependencies
npm run install-all

# Hoặc cài riêng
cd backend && npm install
cd ../frontend && npm install
```

### 10.3. Cấu hình

```bash
# Tạo file .env cho backend
cp backend/.env.example backend/.env
# Chỉnh sửa các biến môi trường cần thiết

# Tạo file .env cho frontend
cp frontend/.env.example frontend/.env
```

### 10.4. Index tài liệu RAG

```bash
cd backend

# Index tài liệu PDF cho RAG
npm run rag:index

# Kiểm tra thống kê
npm run rag:stats
```

### 10.5. Seed dữ liệu

```bash
cd backend

# Thêm dữ liệu phương tiện mẫu
npm run seed:vehicles
```

### 10.6. Chạy ứng dụng

```bash
# Chạy cả backend và frontend
npm run dev

# Hoặc chạy riêng
npm run server   # Backend (port 5000)
npm run client   # Frontend (port 3000)
```

### 10.7. Scripts có sẵn

| Script | Mô tả |
|--------|--------|
| `npm run dev` | Chạy backend + frontend đồng thời |
| `npm run server` | Chỉ chạy backend |
| `npm run client` | Chỉ chạy frontend |
| `npm run install-all` | Cài đặt dependencies cho tất cả |
| `npm run rag:index` | Index tài liệu PDF cho RAG |
| `npm run rag:reindex` | Re-index tài liệu |
| `npm run rag:stats` | Thống kê embedding |
| `npm run rag:test` | Test RAG retrieval |
| `npm run seed:vehicles` | Seed dữ liệu phương tiện |

---

> **Ghi chú:** Tài liệu này được tạo tự động dựa trên phân tích mã nguồn của hệ thống. Cập nhật lần cuối: 09/02/2026.
