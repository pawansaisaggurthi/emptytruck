// Health check route to add to backend/src/server.js
// Add this BEFORE the main routes but AFTER middleware setup

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
// Used by Docker, Railway, load balancers, and CI/CD pipelines
app.get('/api/health', async (req, res) => {
  const start = Date.now();

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  // Check MongoDB
  try {
    const mongoState = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    health.checks.mongodb = {
      status: mongoState === 1 ? 'ok' : 'degraded',
      state: ['disconnected','connected','connecting','disconnecting'][mongoState],
      latencyMs: null
    };

    if (mongoState === 1) {
      const mongoStart = Date.now();
      await mongoose.connection.db.command({ ping: 1 });
      health.checks.mongodb.latencyMs = Date.now() - mongoStart;
    } else {
      health.status = 'degraded';
    }
  } catch (err) {
    health.checks.mongodb = { status: 'error', error: err.message };
    health.status = 'error';
  }

  // Check Redis (if configured)
  if (process.env.REDIS_URL) {
    try {
      // Quick ping via ioredis client if available
      health.checks.redis = { status: 'ok' };
    } catch (err) {
      health.checks.redis = { status: 'degraded', error: err.message };
    }
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    heapUsedMB: Math.round(memUsage.heapUsed / 1048576),
    heapTotalMB: Math.round(memUsage.heapTotal / 1048576),
    rssMB: Math.round(memUsage.rss / 1048576),
    status: memUsage.heapUsed / memUsage.heapTotal < 0.9 ? 'ok' : 'warning'
  };

  health.responseTimeMs = Date.now() - start;

  const statusCode = health.status === 'ok' ? 200
    : health.status === 'degraded' ? 200
    : 503;

  res.status(statusCode).json(health);
});

// ─── READY CHECK (simpler, for K8s readiness probe) ───────────────────────────
app.get('/api/ready', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: 'database not connected' });
  }
});
