// MongoDB initialization script
// Runs once when container is first created

db = db.getSiblingDB('emptytruck');

// ── Create app user (limited permissions) ─────────────────────────────────────
db.createUser({
  user: 'emptytruck_app',
  pwd: process.env.MONGO_APP_PASSWORD || 'apppassword',
  roles: [
    { role: 'readWrite', db: 'emptytruck' }
  ]
});

print('✅ App user created');

// ── Collections & Indexes ─────────────────────────────────────────────────────

// Users
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ 'pushTokens.token': 1 }, { sparse: true });
print('✅ Users indexes created');

// Driver Profiles
db.createCollection('driverprofiles');
db.driverprofiles.createIndex({ user: 1 }, { unique: true });
db.driverprofiles.createIndex({ isOnline: 1 });
db.driverprofiles.createIndex({ verificationStatus: 1 });
db.driverprofiles.createIndex({ 'currentLocation': '2dsphere' });
print('✅ DriverProfiles indexes created');

// Trips
db.createCollection('trips');
db.trips.createIndex({ driver: 1 });
db.trips.createIndex({ status: 1 });
db.trips.createIndex({ availableDate: 1 });
db.trips.createIndex({ 'origin.coordinates': '2dsphere' });
db.trips.createIndex({ 'destination.coordinates': '2dsphere' });
db.trips.createIndex({ truckType: 1, status: 1, availableDate: 1 });
db.trips.createIndex({ createdAt: -1 });
print('✅ Trips indexes created');

// Bookings
db.createCollection('bookings');
db.bookings.createIndex({ customer: 1, createdAt: -1 });
db.bookings.createIndex({ driver: 1, createdAt: -1 });
db.bookings.createIndex({ trip: 1 });
db.bookings.createIndex({ status: 1 });
db.bookings.createIndex({ bookingNumber: 1 }, { unique: true });
db.bookings.createIndex({ createdAt: -1 });
print('✅ Bookings indexes created');

// Ratings
db.createCollection('ratings');
db.ratings.createIndex({ booking: 1 }, { unique: true });
db.ratings.createIndex({ reviewee: 1, createdAt: -1 });
db.ratings.createIndex({ reviewer: 1 });
db.ratings.createIndex({ rating: 1 });
print('✅ Ratings indexes created');

// Chat
db.createCollection('chats');
db.chats.createIndex({ participants: 1 });
db.chats.createIndex({ booking: 1 }, { unique: true, sparse: true });
db.chats.createIndex({ updatedAt: -1 });

db.createCollection('messages');
db.messages.createIndex({ chat: 1, createdAt: -1 });
db.messages.createIndex({ sender: 1 });
print('✅ Chat indexes created');

// Notifications
db.createCollection('notifications');
db.notifications.createIndex({ user: 1, read: 1, createdAt: -1 });
db.notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // TTL: 30 days
print('✅ Notifications indexes created');

// Payments / Transactions
db.createCollection('transactions');
db.transactions.createIndex({ user: 1, createdAt: -1 });
db.transactions.createIndex({ booking: 1 });
db.transactions.createIndex({ type: 1, status: 1 });
db.transactions.createIndex({ 'payment.razorpayOrderId': 1 }, { sparse: true });
print('✅ Transactions indexes created');

print('\n🚛 EmptyTruck MongoDB initialization complete!');
