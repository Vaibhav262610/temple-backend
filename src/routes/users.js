// Users Routes
const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getCurrentUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword
} = require('../controllers/users');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');

// Validation rules
const authValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name must be between 1 and 100 characters'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

const passwordChangeValidation = [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Admin registration validation
const adminRegistrationValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('full_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name must be between 1 and 100 characters'),
  body('role')
    .isIn(['admin', 'board', 'community_owner', 'volunteer_head', 'priest', 'finance_team'])
    .withMessage('Role must be one of: admin, board, community_owner, volunteer_head, priest, or finance_team')
];

// Routes
router.post('/register', authValidation, registerUser);
router.post('/admin-register', adminRegistrationValidation, registerUser); // Admin registration
router.post('/login', authValidation, loginUser);
router.get('/me', authMiddleware, getCurrentUser);
router.get('/', authMiddleware, getUsers);
router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, deleteUser);
router.post('/change-password', authMiddleware, passwordChangeValidation, changePassword);

module.exports = router;
