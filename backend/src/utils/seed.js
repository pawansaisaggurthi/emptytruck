const mongoose = require('mongoose');
const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emptytruck');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await DriverProfile.deleteMany({});
    console.log('Cleared existing data');

    // Create Admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@emptytruck.com',
      phone: '+919000000000',
      password: 'Admin@123',
      role: 'admin',
      isEmailVerified: true,
      isPhoneVerified: true
    });
    console.log('Admin created:', admin.email);

    // Create sample drivers
    const driver1 = await User.create({
      name: 'Rajesh Kumar',
      email: 'rajesh@driver.com',
      phone: '+919111111111',
      password: 'Password@123',
      role: 'driver',
      isEmailVerified: true,
      isPhoneVerified: true,
      averageRating: 4.5,
      totalRatings: 23
    });

    await DriverProfile.create({
      user: driver1._id,
      truckType: 'lorry',
      truckNumber: 'MH12AB1234',
      licenseNumber: 'MH1420190012345',
      truckCapacity: 15,
      approvalStatus: 'approved',
      approvedAt: new Date(),
      totalTrips: 23,
      totalEarnings: 145000,
      documents: {
        governmentId: { url: 'https://via.placeholder.com/400x300?text=Govt+ID', publicId: 'dummy', verified: true },
        vehicleRC: { url: 'https://via.placeholder.com/400x300?text=Vehicle+RC', publicId: 'dummy', verified: true },
        insurance: { url: 'https://via.placeholder.com/400x300?text=Insurance', publicId: 'dummy', verified: true },
        profilePhoto: { url: 'https://randomuser.me/api/portraits/men/1.jpg', publicId: 'dummy' }
      }
    });

    const driver2 = await User.create({
      name: 'Suresh Patel',
      email: 'suresh@driver.com',
      phone: '+919222222222',
      password: 'Password@123',
      role: 'driver',
      isEmailVerified: true,
      averageRating: 4.2,
      totalRatings: 15
    });

    await DriverProfile.create({
      user: driver2._id,
      truckType: 'trailer',
      truckNumber: 'GJ01CD5678',
      licenseNumber: 'GJ0120200023456',
      truckCapacity: 25,
      approvalStatus: 'pending',
      documents: {
        governmentId: { url: 'https://via.placeholder.com/400x300?text=Govt+ID', publicId: 'dummy', verified: false },
        vehicleRC: { url: 'https://via.placeholder.com/400x300?text=Vehicle+RC', publicId: 'dummy', verified: false },
        insurance: { url: 'https://via.placeholder.com/400x300?text=Insurance', publicId: 'dummy', verified: false }
      }
    });

    // Create sample customers
    const customer1 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@customer.com',
      phone: '+919333333333',
      password: 'Password@123',
      role: 'customer',
      companyName: 'Sharma Exports Ltd',
      isEmailVerified: true
    });

    const customer2 = await User.create({
      name: 'Amit Gupta',
      email: 'amit@customer.com',
      phone: '+919444444444',
      password: 'Password@123',
      role: 'customer',
      isEmailVerified: true
    });

    console.log('✅ Seed data created successfully');
    console.log('\n📋 Test Credentials:');
    console.log('Admin:     admin@emptytruck.com / Admin@123');
    console.log('Driver 1:  rajesh@driver.com / Password@123 (Approved)');
    console.log('Driver 2:  suresh@driver.com / Password@123 (Pending)');
    console.log('Customer 1: priya@customer.com / Password@123');
    console.log('Customer 2: amit@customer.com / Password@123');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedDatabase();
