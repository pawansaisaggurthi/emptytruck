// MongoDB initialization script
// Runs once on first container startup

db = db.getSiblingDB('emptytruck');

// Create app-level user (least-privilege)
db.createUser({
  user: 'emptytruck_app',
  pwd: process.env.MONGO_APP_PASSWORD || 'changeme_in_prod',
  roles: [{ role: 'readWrite', db: 'emptytruck' }]
});

// ── INDEXES ──────────────────────────────────────────────────────────────────

// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ createdAt: -1 });

// Driver Profiles
db.driverprofiles.createIndex({ userId: 1 }, { unique: true });
db.driverprofiles.createIndex({ isOnline: 1 });
db.driverprofiles.createIndex({ 'currentLocation': '2dsphere' });
db.driverprofiles.createIndex({ verificationStatus: 1 });
db.driverprofiles.createIndex({ averageRating: -1 });

// Trips
db.trips.createIndex({ driverId: 1 });
db.trips.createIndex({ status: 1 });
db.trips.createIndex({ availableDate: 1 });
db.trips.createIndex({ 'origin.coordinates': '2dsphere' });
db.trips.createIndex({ 'destination.coordinates': '2dsphere' });
db.trips.createIndex({ truckType: 1, status: 1 });
db.trips.createIndex({ pricePerKm: 1 });
db.trips.createIndex({
  'origin.coordinates': '2dsphere',
  status: 1,
  availableDate: 1
}); // Compound for geo search

// Bookings
db.bookings.createIndex({ customerId: 1 });
db.bookings.createIndex({ driverId: 1 });
db.bookings.createIndex({ tripId: 1 });
db.bookings.createIndex({ status: 1 });
db.bookings.createIndex({ createdAt: -1 });
db.bookings.createIndex({ customerId: 1, status: 1 });
db.bookings.createIndex({ driverId: 1, status: 1 });

// Ratings
db.ratings.createIndex({ driverId: 1 });
db.ratings.createIndex({ customerId: 1 });
db.ratings.createIndex({ bookingId: 1 }, { unique: true });
db.ratings.createIndex({ driverId: 1, rating: -1 });

// Chats
db.chats.createIndex({ bookingId: 1 }, { unique: true });
db.chats.createIndex({ participants: 1 });
db.chats.createIndex({ updatedAt: -1 });

// Notifications
db.notifications.createIndex({ userId: 1, read: 1 });
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 } // Auto-delete after 30 days
);

print('✅ EmptyTruck DB initialized with indexes');
