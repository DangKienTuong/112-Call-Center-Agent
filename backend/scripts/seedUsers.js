/**
 * MongoDB Seed Script for Admin and Staff Users
 *
 * This script creates initial admin and staff users for the 112 Emergency Call Center system.
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
    enum: ['operator', 'supervisor', 'admin', 'staff'],
    default: 'operator'
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
  },
  {
    username: 'supervisor',
    email: 'supervisor@112.vn',
    password: 'supervisor123',
    role: 'supervisor',
    profile: {
      fullName: 'Team Supervisor',
      employeeId: 'SUP001',
      department: 'Operations',
      phone: '0111222333'
    },
    status: 'active'
  },
  {
    username: 'operator',
    email: 'operator@112.vn',
    password: 'operator123',
    role: 'operator',
    profile: {
      fullName: 'Call Operator',
      employeeId: 'OPR001',
      department: 'Call Center',
      phone: '0444555666'
    },
    status: 'active'
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

    console.log('\n--- Seed Complete ---\n');
    console.log('Default credentials:');
    console.log('------------------------------------------');
    console.log('| Role       | Username    | Password      |');
    console.log('------------------------------------------');
    console.log('| Admin      | admin       | admin123      |');
    console.log('| Staff      | staff       | staff123      |');
    console.log('| Supervisor | supervisor  | supervisor123 |');
    console.log('| Operator   | operator    | operator123   |');
    console.log('------------------------------------------');
    console.log('\nIMPORTANT: Please change these passwords in production!');

  } catch (error) {
    console.error('Error seeding users:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the seed function
seedUsers();
