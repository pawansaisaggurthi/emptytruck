/**
 * Haversine formula to calculate distance between two coordinates
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
exports.haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => (value * Math.PI) / 180;

/**
 * Find matching trips for a customer search query
 * Matching algorithm:
 * 1. Driver's origin must be within deviationKm of customer's pickup
 * 2. Driver's destination must be within deviationKm of customer's drop
 * 3. Calculate total deviation distance
 * 4. Score and rank results
 */
exports.findMatchingTrips = (trips, customerPickup, customerDrop, deviationKm = 50) => {
  const results = [];
  
  const [pickupLng, pickupLat] = customerPickup.coordinates;
  const [dropLng, dropLat] = customerDrop.coordinates;
  
  for (const trip of trips) {
    const [originLng, originLat] = trip.origin.location.coordinates;
    const [destLng, destLat] = trip.destination.location.coordinates;
    
    // Distance from driver's origin to customer's pickup
    const originDeviation = exports.haversineDistance(originLat, originLng, pickupLat, pickupLng);
    
    // Distance from driver's destination to customer's drop
    const destDeviation = exports.haversineDistance(destLat, destLng, dropLat, dropLng);
    
    // Both must be within allowed deviation
    if (originDeviation <= deviationKm && destDeviation <= deviationKm) {
      const totalDeviation = originDeviation + destDeviation;
      
      // Estimated distance for this specific booking
      const bookingDistance = exports.haversineDistance(pickupLat, pickupLng, dropLat, dropLng);
      const estimatedCost = bookingDistance * trip.pricePerKm;
      
      // Scoring algorithm (lower is better)
      // Normalize: price (0-1), deviation (0-1), rating inverse (0-1)
      const maxPrice = 100; // Max expected price per km
      const priceScore = Math.min(trip.pricePerKm / maxPrice, 1);
      const deviationScore = totalDeviation / (2 * deviationKm);
      const ratingScore = trip.driver?.averageRating ? (5 - trip.driver.averageRating) / 5 : 0.5;
      
      // Weighted composite score
      const score = (priceScore * 0.4) + (deviationScore * 0.35) + (ratingScore * 0.25);
      
      results.push({
        ...trip.toObject(),
        matchMetrics: {
          originDeviation: Math.round(originDeviation * 10) / 10,
          destDeviation: Math.round(destDeviation * 10) / 10,
          totalDeviation: Math.round(totalDeviation * 10) / 10,
          bookingDistance: Math.round(bookingDistance * 10) / 10,
          estimatedCost: Math.round(estimatedCost),
          score
        }
      });
    }
  }
  
  // Sort by composite score (lower = better)
  return results.sort((a, b) => a.matchMetrics.score - b.matchMetrics.score);
};

/**
 * Sort matched trips by different criteria
 */
exports.sortTrips = (trips, sortBy = 'score') => {
  switch (sortBy) {
    case 'price_low':
      return [...trips].sort((a, b) => a.pricePerKm - b.pricePerKm);
    case 'price_high':
      return [...trips].sort((a, b) => b.pricePerKm - a.pricePerKm);
    case 'rating':
      return [...trips].sort((a, b) => (b.driver?.averageRating || 0) - (a.driver?.averageRating || 0));
    case 'nearest':
      return [...trips].sort((a, b) => a.matchMetrics?.originDeviation - b.matchMetrics?.originDeviation);
    case 'deviation':
      return [...trips].sort((a, b) => a.matchMetrics?.totalDeviation - b.matchMetrics?.totalDeviation);
    default: // 'score' or 'recommended'
      return [...trips].sort((a, b) => a.matchMetrics?.score - b.matchMetrics?.score);
  }
};

/**
 * Build MongoDB geospatial query for initial filtering
 * This is an optimization to reduce DB scan before Haversine
 */
exports.buildGeoQuery = (coordinates, radiusKm) => {
  return {
    type: 'Point',
    coordinates: coordinates
  };
};

/**
 * Calculate bounding box for rough geospatial filtering
 */
exports.getBoundingBox = (lat, lon, radiusKm) => {
  const latDelta = radiusKm / 111; // 1 degree lat ≈ 111 km
  const lonDelta = radiusKm / (111 * Math.cos(toRad(lat)));
  
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta
  };
};
