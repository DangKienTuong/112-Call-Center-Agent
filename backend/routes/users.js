const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/authorize');

// All routes require authentication and admin role
router.use(auth);
router.use(isAdmin);

// User CRUD operations
router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

// Special operations
router.post('/:id/reset-password', userController.resetPassword);
router.patch('/:id/toggle-status', userController.toggleStatus);

module.exports = router;
