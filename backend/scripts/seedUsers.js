/**
 * MongoDB Seed Script for Users and Emergency Tickets
 *
 * This script creates initial admin/staff users and sample emergency tickets
 * for the 112 Emergency Call Center system.
 *
 * Roles:
 *   - Admin: Full access to all features (tickets, users, dashboard)
 *   - Staff: Can view tickets and update ticket status only (no dashboard access)
 *
 * Usage:
 *   1. Make sure MongoDB is running on localhost:27017
 *   2. Navigate to the backend directory: cd backend
 *   3. Run the script: node scripts/seedUsers.js
 *
 * Default credentials created:
 *   Admin:
 *     - Username: admin
 *     - Password: admin123
 *     - Email: admin@112.vn
 *
 *   Staff:
 *     - Username: staff
 *     - Password: staff123
 *     - Email: staff@112.vn
 *
 * IMPORTANT: Change these passwords in production!
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency_112';

// User Schema (same as in models/User.js)
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'staff'],
    default: 'staff'
  },
  profile: {
    fullName: String,
    employeeId: String,
    department: String,
    phone: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  preferences: {
    language: {
      type: String,
      enum: ['vi', 'en'],
      default: 'vi'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

// Ticket Schema
const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['URGENT', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
    default: 'URGENT'
  },
  reporter: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String
  },
  location: {
    address: { type: String, required: true },
    ward: String,
    district: String,
    city: String,
    coordinates: { lat: Number, lng: Number }
  },
  emergencyType: {
    type: String,
    enum: ['FIRE_RESCUE', 'MEDICAL', 'SECURITY'],
    required: true
  },
  description: { type: String, required: true },
  affectedPeople: {
    total: { type: Number, default: 0 },
    injured: { type: Number, default: 0 },
    critical: { type: Number, default: 0 },
    deceased: { type: Number, default: 0 }
  },
  supportRequired: {
    police: { type: Boolean, default: false },
    ambulance: { type: Boolean, default: false },
    fireDepartment: { type: Boolean, default: false },
    rescue: { type: Boolean, default: false }
  },
  additionalInfo: { notes: String },
  chatHistory: [{
    role: { type: String, enum: ['operator', 'reporter', 'system'] },
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'HIGH'
  },
  notes: [String],
  resolvedAt: Date
}, { timestamps: true });

const Ticket = mongoose.model('Ticket', ticketSchema);

// Default users to create
const defaultUsers = [
  {
    username: 'admin',
    email: 'admin@112.vn',
    password: 'admin123',
    role: 'admin',
    profile: {
      fullName: 'System Administrator',
      employeeId: 'ADM001',
      department: 'IT',
      phone: '0123456789'
    },
    status: 'active'
  },
  {
    username: 'staff',
    email: 'staff@112.vn',
    password: 'staff123',
    role: 'staff',
    profile: {
      fullName: 'Staff Member',
      employeeId: 'STF001',
      department: 'Operations',
      phone: '0987654321'
    },
    status: 'active'
  }
];

// Sample emergency tickets
const sampleTickets = [
  {
    ticketId: 'TD-20241201-100000-A1B2',
    status: 'URGENT',
    reporter: {
      name: 'Nguyễn Văn An',
      phone: '0901234567',
      email: 'nguyenvanan@gmail.com'
    },
    location: {
      address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
      ward: 'Bến Nghé',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh'
    },
    emergencyType: 'FIRE_RESCUE',
    description: 'Cháy tầng 5 tòa nhà văn phòng, khói đen bốc lên cao. Có khoảng 20 người còn kẹt bên trong.',
    affectedPeople: { total: 20, injured: 3, critical: 1, deceased: 0 },
    supportRequired: { police: true, ambulance: true, fireDepartment: true, rescue: true },
    priority: 'CRITICAL',
    chatHistory: [
      { role: 'reporter', message: 'Cháy lớn tại tòa nhà 123 Nguyễn Huệ!', timestamp: new Date() },
      { role: 'operator', message: 'Xin cho biết tầng nào đang cháy?', timestamp: new Date() },
      { role: 'reporter', message: 'Tầng 5, có nhiều người kẹt bên trong', timestamp: new Date() }
    ],
    notes: ['Đã điều động 3 xe cứu hỏa', 'Cảnh sát đã chặn đường']
  },
  {
    ticketId: 'TD-20241201-103000-C3D4',
    status: 'IN_PROGRESS',
    reporter: {
      name: 'Trần Thị Bình',
      phone: '0912345678'
    },
    location: {
      address: '456 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
      ward: 'Bến Thành',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh'
    },
    emergencyType: 'MEDICAL',
    description: 'Người đàn ông khoảng 60 tuổi đột ngột ngã quỵ trên vỉa hè, có dấu hiệu đột quỵ.',
    affectedPeople: { total: 1, injured: 0, critical: 1, deceased: 0 },
    supportRequired: { police: false, ambulance: true, fireDepartment: false, rescue: false },
    priority: 'CRITICAL',
    chatHistory: [
      { role: 'reporter', message: 'Có người ngã gục ở đường Lê Lợi!', timestamp: new Date() },
      { role: 'operator', message: 'Người đó có còn tỉnh táo không?', timestamp: new Date() },
      { role: 'reporter', message: 'Không, ông ấy bất tỉnh rồi', timestamp: new Date() }
    ],
    notes: ['Xe cấp cứu 115 đang trên đường đến']
  },
  {
    ticketId: 'TD-20241201-110000-E5F6',
    status: 'RESOLVED',
    reporter: {
      name: 'Lê Văn Cường',
      phone: '0923456789'
    },
    location: {
      address: '789 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP.HCM',
      ward: 'Đa Kao',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh'
    },
    emergencyType: 'SECURITY',
    description: 'Có nhóm người gây rối trật tự công cộng trước cửa hàng, đang xô xát với nhân viên bảo vệ.',
    affectedPeople: { total: 5, injured: 1, critical: 0, deceased: 0 },
    supportRequired: { police: true, ambulance: true, fireDepartment: false, rescue: false },
    priority: 'HIGH',
    chatHistory: [
      { role: 'reporter', message: 'Có đánh nhau trước cửa hàng!', timestamp: new Date() },
      { role: 'operator', message: 'Có bao nhiêu người liên quan?', timestamp: new Date() },
      { role: 'reporter', message: 'Khoảng 5-6 người', timestamp: new Date() }
    ],
    notes: ['Công an phường đã đến xử lý', 'Đã giải tán đám đông'],
    resolvedAt: new Date()
  },
  {
    ticketId: 'TD-20241130-140000-G7H8',
    status: 'RESOLVED',
    reporter: {
      name: 'Phạm Thị Dung',
      phone: '0934567890'
    },
    location: {
      address: '321 Võ Văn Tần, Phường 5, Quận 3, TP.HCM',
      ward: 'Phường 5',
      district: 'Quận 3',
      city: 'TP. Hồ Chí Minh'
    },
    emergencyType: 'FIRE_RESCUE',
    description: 'Chập điện gây cháy nhỏ trong căn hộ, cần hỗ trợ dập lửa.',
    affectedPeople: { total: 2, injured: 0, critical: 0, deceased: 0 },
    supportRequired: { police: false, ambulance: false, fireDepartment: true, rescue: false },
    priority: 'MEDIUM',
    chatHistory: [
      { role: 'reporter', message: 'Nhà tôi bị cháy do chập điện', timestamp: new Date() },
      { role: 'operator', message: 'Mọi người đã ra ngoài chưa?', timestamp: new Date() },
      { role: 'reporter', message: 'Rồi ạ, 2 người đã ra ngoài an toàn', timestamp: new Date() }
    ],
    notes: ['Đã dập tắt đám cháy', 'Không có thương vong'],
    resolvedAt: new Date()
  },
  {
    ticketId: 'TD-20241130-160000-I9J0',
    status: 'URGENT',
    reporter: {
      name: 'Hoàng Văn Em',
      phone: '0945678901'
    },
    location: {
      address: '567 Điện Biên Phủ, Phường 1, Quận 3, TP.HCM',
      ward: 'Phường 1',
      district: 'Quận 3',
      city: 'TP. Hồ Chí Minh'
    },
    emergencyType: 'MEDICAL',
    description: 'Tai nạn giao thông giữa xe máy và ô tô, có 2 người bị thương nặng.',
    affectedPeople: { total: 3, injured: 2, critical: 1, deceased: 0 },
    supportRequired: { police: true, ambulance: true, fireDepartment: false, rescue: true },
    priority: 'CRITICAL',
    chatHistory: [
      { role: 'reporter', message: 'Tai nạn giao thông trên Điện Biên Phủ!', timestamp: new Date() },
      { role: 'operator', message: 'Có bao nhiêu người bị thương?', timestamp: new Date() },
      { role: 'reporter', message: '2 người bị thương nặng, 1 người nhẹ', timestamp: new Date() }
    ],
    notes: []
  }
];

async function seedUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully!');

    console.log('\n--- Creating Users ---\n');

    for (const userData of defaultUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: userData.email }, { username: userData.username }]
      });

      if (existingUser) {
        console.log(`User '${userData.username}' already exists. Skipping...`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = new User({
        ...userData,
        password: hashedPassword
      });

      await user.save();
      console.log(`Created user: ${userData.username} (${userData.role})`);
    }

    console.log('\n--- Creating Sample Tickets ---\n');

    for (const ticketData of sampleTickets) {
      // Check if ticket already exists
      const existingTicket = await Ticket.findOne({ ticketId: ticketData.ticketId });

      if (existingTicket) {
        console.log(`Ticket '${ticketData.ticketId}' already exists. Skipping...`);
        continue;
      }

      const ticket = new Ticket(ticketData);
      await ticket.save();
      console.log(`Created ticket: ${ticketData.ticketId} (${ticketData.emergencyType} - ${ticketData.status})`);
    }

    console.log('\n--- Seed Complete ---\n');
    console.log('Default credentials:');
    console.log('----------------------------------');
    console.log('| Role   | Username | Password  |');
    console.log('----------------------------------');
    console.log('| Admin  | admin    | admin123  |');
    console.log('| Staff  | staff    | staff123  |');
    console.log('----------------------------------');
    console.log('\nSample tickets created:');
    console.log('- 2 FIRE_RESCUE tickets');
    console.log('- 2 MEDICAL tickets');
    console.log('- 1 SECURITY ticket');
    console.log('\nIMPORTANT: Please change these passwords in production!');

  } catch (error) {
    console.error('Error seeding data:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the seed function
seedUsers();
