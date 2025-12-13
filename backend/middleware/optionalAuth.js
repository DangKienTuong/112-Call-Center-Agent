const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Optional Authentication Middleware
 * If a valid token is provided, attaches the user to req.user
 * If no token or invalid token, continues without error (guest mode)
 */
module.exports = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      // No token - continue as guest
      req.user = null;
      req.isAuthenticated = false;
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user
      const user = await User.findById(decoded.id).select('-password');

      if (user && user.status === 'active') {
        // Valid user - attach to request
        req.user = user;
        req.token = token;
        req.isAuthenticated = true;
      } else {
        // Invalid user - continue as guest
        req.user = null;
        req.isAuthenticated = false;
      }
    } catch (jwtError) {
      // Invalid token - continue as guest
      req.user = null;
      req.isAuthenticated = false;
    }

    next();
  } catch (error) {
    // Any other error - continue as guest
    req.user = null;
    req.isAuthenticated = false;
    next();
  }
};
