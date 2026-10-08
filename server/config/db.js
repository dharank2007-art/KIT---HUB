const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const os = require('os');
const path = require('path');
const User = require('../models/User');
const Department = require('../models/Department');
const ValidStudent = require('../models/ValidStudent');

const backfillExistingUserStatus = async () => {
  await User.updateMany({ status: { $exists: false } }, { $set: { status: 'approved' } });
};

const ensureDevelopmentData = async () => {
  const department = await Department.findOneAndUpdate({ code: 'CSE' }, {
    $setOnInsert: { code: 'CSE', name: 'Computer Science & Engineering', description: 'Development sample department' }
  }, { new: true, upsert: true });
  const ensureUser = async (attributes) => {
    let user = await User.findOne({ email: attributes.email });
    if (!user) {
      user = new User(attributes);
      await user.save();
    } else if (!user.isPasswordChanged) {
      user.isPasswordChanged = true;
      await user.save();
    }
    return user;
  };

  const superAdmin = await ensureUser({
    name: 'Development Super Admin', email: 'superadmin@kit.edu', password: 'Admin@123',
    role: 'super_admin', isPasswordChanged: true
  });
  const hod = await ensureUser({
    name: 'Dr. R. Sharma', email: 'hod.cse@kit.edu', password: 'Faculty@123',
    role: 'admin', department: department._id, employeeId: 'EMP0101', isPasswordChanged: true
  });
  const faculty = await ensureUser({
    name: 'Prof. Anita V', email: 'faculty.anita@kit.edu', password: 'Faculty@123',
    role: 'staff', department: department._id, employeeId: 'EMP0102', isPasswordChanged: true
  });
  const student = await ensureUser({
    name: 'Arun Kumar', email: 'student1@kit.edu', password: 'Student@123', role: 'student',
    department: department._id, registerNumber: '21CS001', className: 'III-A', bloodGroup: 'O+',
    linkedin: 'https://www.linkedin.com/in/arun-kumar', assignedMentor: faculty._id,
    status: 'approved', isPasswordChanged: true
  });
  if (student.status !== 'approved') {
    student.status = 'approved';
    await student.save();
  }
  department.hod = hod._id;
  await department.save();
  await ValidStudent.updateOne(
    { registerNumber: '21CS042' },
    { $setOnInsert: { registerNumber: '21CS042', department: department._id, className: 'III-A' } },
    { upsert: true }
  );
  await ValidStudent.updateOne(
    { registerNumber: '21CS043' },
    { $setOnInsert: { registerNumber: '21CS043', department: department._id, className: 'III-A' } },
    { upsert: true }
  );
  return { superAdmin, student };
};

let mongoMemoryServer;
const developmentDbPath = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share'),
  'KITCollegeApp',
  'mongodb'
);

const connectDB = async () => {
  const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kit_college_db';
  try {
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 3000
    });
    await backfillExistingUserStatus();
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`MongoDB Connection Warning: ${error.message}`);
    const isLocalDatabase = /localhost|127\.0\.0\.1/.test(connStr);
    if (process.env.NODE_ENV === 'production' || !isLocalDatabase) {
      throw error;
    }

    fs.mkdirSync(developmentDbPath, { recursive: true });
    mongoMemoryServer = await MongoMemoryServer.create({
      instance: { dbPath: developmentDbPath, storageEngine: 'wiredTiger' }
    });
    const conn = await mongoose.connect(mongoMemoryServer.getUri(), {
      serverSelectionTimeoutMS: 5000
    });
    await backfillExistingUserStatus();
    await ensureDevelopmentData();
    console.warn(`Using persistent local MongoDB for development at ${developmentDbPath}.`);
    console.log('Development logins: superadmin@kit.edu / Admin@123, hod.cse@kit.edu / Faculty@123, faculty.anita@kit.edu / Faculty@123, student1@kit.edu / Student@123');
    return conn;
  }
};

module.exports = connectDB;
