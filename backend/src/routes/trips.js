const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Trip = require('../models/Trip');
const DriverProfile = require('../models/DriverProfile');
const { protect, authorize } = require('../middleware/auth');
const { findMatchingTrips, sortTrips, haversineDistance } = require('../utils/geo');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// @route   GET /api/trips/search
// @desc    Search for matching trips (customer)
// @access  Private (customer)
router.get('/search', protect, authorize('customer', 'admin'), async (req, res) => {
  try {
    const {
      pickupLat, pickupLng, pickupAddress,
      dropLat, dropLng, dropAddress,
      date, truckType, deviation = 50,
      sortBy = 'score', page = 1, limit = 20
    } = req.query;

    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      return res.status(400).json({ success: false, message: 'Pickup and drop coordinates are required' });
    }

    const deviationKm = Math.min(parseInt(deviation), parseInt(process.env.MAX_DEVIATION_KM || 100));
    const searchDate = date ? new Date(date) : new Date();
    const endDate = new Date(searchDate);
    endDate.setDate(endDate.getDate() + 1);

    // Build query - get active trips around the pickup location
    const tripQuery = {
      status: 'active',
      availableDate: { $gte: searchDate, $lt: endDate }
    };
    
    if (truckType) tripQuery.truckType = truckType;

    // Initial broad geo filter using MongoDB $geoNear or $box
    const pickupCoords = [parseFloat(pickupLng), parseFloat(pickupLat)];
    const dropCoords = [parseFloat(dropLng), parseFloat(dropLat)];

    // Rough filter: trips where origin is within large radius of pickup
    const trips = await Trip.find({
      ...tripQuery,
      'origin.location': {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: pickupCoords },
          $maxDistance: (deviationKm + 50) * 1000 // Convert to meters, add buffer
        }
      }
    })
    .populate('driver', 'name avatar averageRating totalRatings isOnline')
    .populate('driverProfile', 'truckType truckNumber truckCapacity documents isOnline totalTrips')
    .limit(200) // Get candidates for in-memory filtering
    .lean();

    // Apply precise Haversine matching
    const matchedTrips = findMatchingTrips(
      trips,
      { coordinates: pickupCoords },
      { coordinates: dropCoords },
      deviationKm
    );

    // Sort results
    const sortedTrips = sortTrips(matchedTrips, sortBy);

    // Pagination
    const total = sortedTrips.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedTrips = sortedTrips.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      count: paginatedTrips.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      deviationKm,
      trips: paginatedTrips
    });
  } catch (err) {
    console.error('Trip search error:', err);
    res.status(500).json({ success: false, message: 'Search failed', error: err.message });
  }
});

// @route   POST /api/trips
// @desc    Post a new trip (driver)
// @access  Private (driver)
router.post('/', protect, authorize('driver'), [
  body('origin.address').notEmpty().withMessage('Origin address required'),
  body('origin.location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Origin coordinates required'),
  body('destination.address').notEmpty().withMessage('Destination address required'),
  body('destination.location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Destination coordinates required'),
  body('availableDate').isISO8601().withMessage('Valid date required'),
  body('pricePerKm').isNumeric().isFloat({ min: 0 }).withMessage('Valid price required'),
  body('truckType').notEmpty().withMessage('Truck type required'),
  body('capacity').isNumeric().isFloat({ min: 0 }).withMessage('Valid capacity required')
], validate, async (req, res) => {
  try {
    // Verify driver is approved
    const driverProfile = await DriverProfile.findOne({ user: req.user._id });
    if (!driverProfile) {
      return res.status(400).json({ success: false, message: 'Driver profile not found. Complete your profile first.' });
    }
    if (driverProfile.approvalStatus !== 'approved') {
      return res.status(403).json({ 
        success: false, 
        message: `Your account is ${driverProfile.approvalStatus}. You need approval before posting trips.` 
      });
    }

    const {
      origin, destination, availableDate, availableUntil,
      pricePerKm, minimumCharge, truckType, capacity, notes,
      acceptedGoods, rejectedGoods
    } = req.body;

    // Calculate total distance
    const [originLng, originLat] = origin.location.coordinates;
    const [destLng, destLat] = destination.location.coordinates;
    const totalDistanceKm = haversineDistance(originLat, originLng, destLat, destLng);
    const estimatedPrice = totalDistanceKm * pricePerKm;

    const trip = await Trip.create({
      driver: req.user._id,
      driverProfile: driverProfile._id,
      origin,
      destination,
      availableDate,
      availableUntil,
      pricePerKm,
      minimumCharge,
      truckType,
      capacity,
      totalDistanceKm: Math.round(totalDistanceKm),
      estimatedPrice: Math.round(estimatedPrice),
      notes,
      acceptedGoods,
      rejectedGoods
    });

    await trip.populate('driver', 'name avatar averageRating');
    await trip.populate('driverProfile', 'truckType truckNumber truckCapacity');

    res.status(201).json({ success: true, message: 'Trip posted successfully', trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create trip' });
  }
});

// @route   GET /api/trips/my-trips
// @desc    Get driver's own trips
// @access  Private (driver)
router.get('/my-trips', protect, authorize('driver'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { driver: req.user._id };
    if (status) query.status = status;

    const trips = await Trip.find(query)
      .populate('bookingRequests')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Trip.countDocuments(query);

    res.json({ success: true, count: trips.length, total, trips });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch trips' });
  }
});

// @route   GET /api/trips/:id
// @desc    Get single trip
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('driver', 'name avatar averageRating totalRatings phone email isOnline')
      .populate('driverProfile', 'truckType truckNumber truckCapacity documents totalTrips');
    
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    // Increment views
    trip.views += 1;
    await trip.save();
    
    res.json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch trip' });
  }
});

// @route   PUT /api/trips/:id
// @desc    Update trip
// @access  Private (driver - own trips only)
router.put('/:id', protect, authorize('driver'), async (req, res) => {
  try {
    let trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    if (trip.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this trip' });
    }

    if (trip.status === 'booked' || trip.status === 'in_progress') {
      return res.status(400).json({ success: false, message: 'Cannot edit a booked or in-progress trip' });
    }

    const allowedFields = ['pricePerKm', 'availableDate', 'availableUntil', 'notes', 
                           'capacity', 'minimumCharge', 'acceptedGoods', 'rejectedGoods'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) trip[field] = req.body[field];
    });

    await trip.save();
    res.json({ success: true, message: 'Trip updated', trip });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update trip' });
  }
});

// @route   DELETE /api/trips/:id
// @desc    Delete trip
// @access  Private (driver - own trips only)
router.delete('/:id', protect, authorize('driver'), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    if (trip.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (trip.status === 'in_progress') {
      return res.status(400).json({ success: false, message: 'Cannot delete an in-progress trip' });
    }

    trip.status = 'cancelled';
    await trip.save();
    
    res.json({ success: true, message: 'Trip cancelled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete trip' });
  }
});

module.exports = router;
