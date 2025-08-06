const NodeCache = require('node-cache');

// Create a cache instance with default TTL of 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Middleware for caching responses
const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    // Skip caching for non-GET methods or if there's an Authorization header
    if (req.method !== 'GET' || req.headers.authorization) {
      return next();
    }

    // Create a cache key from the request path and query parameters
    const cacheKey = `${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      // Return cached response
      return res.json(cachedResponse);
    }

    // Store the original res.json function
    const originalJson = res.json;

    // Override res.json method to cache the response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data, ttl);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Clear specific cache
const clearCache = (key) => {
  if (key) {
    cache.del(key);
    return true;
  }
  return false;
};

// Clear all cache
const clearAllCache = () => {
  cache.flushAll();
  return true;
};

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const start = process.hrtime();
  const startTime = Date.now();

  // Add request start time to response headers for debugging
  res.set('X-Request-Start', startTime.toString());

  // Once the response is finished, calculate and log the time taken
  res.on('finish', () => {
    const end = process.hrtime(start);
    const time = (end[0] * 1000 + end[1] / 1000000).toFixed(2);
    
    // Add response time to headers
    res.set('X-Response-Time', `${time}ms`);
    
    // Color-coded logging based on response time
    if (time > 1000) {
      console.error(`🔴 VERY SLOW REQUEST: ${req.method} ${req.originalUrl} took ${time}ms`);
    } else if (time > 500) {
      console.warn(`🟡 SLOW REQUEST: ${req.method} ${req.originalUrl} took ${time}ms`);
    } else if (time > 200) {
      console.log(`🟠 MODERATE REQUEST: ${req.method} ${req.originalUrl} took ${time}ms`);
    } else {
      // Only log fast requests in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🟢 FAST REQUEST: ${req.method} ${req.originalUrl} took ${time}ms`);
      }
    }
  });

  next();
};

module.exports = {
  cacheMiddleware,
  clearCache,
  clearAllCache,
  performanceMonitor
}; 