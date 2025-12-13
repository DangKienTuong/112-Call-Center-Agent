const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public routes - Staff/Admin
router.post('/register', authController.register);
router.post('/login', authController.login);

// Public routes - Reporter (public users)
router.post('/register-reporter', authController.registerReporter);
router.post('/login-reporter', authController.loginReporter);

// Protected routes
router.use(auth);
router.get('/me', authController.getMe);
router.put('/profile', authController.updateProfile);
router.post('/change-password', authController.changePassword);

module.exports = router;