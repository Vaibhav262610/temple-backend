// Volunteers Routes
const express = require('express');
const router = express.Router();
const {
  getVolunteers,
  getVolunteerById,
  createVolunteer,
  updateVolunteer,
  approveVolunteer,
  rejectVolunteer,
  updateVolunteerHours,
  deleteVolunteer,
  getVolunteerStats
} = require('../controllers/volunteers');
const { body } = require('express-validator');

// Validation rules
const volunteerValidation = [
  body('user_id')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  body('availability')
    .optional(),
  body('emergency_contact')
    .optional(),
  body('community_id')
    .optional()
    .isMongoId()
    .withMessage('Valid community ID is required')
];

// Routes
router.get('/', getVolunteers);
router.get('/stats', getVolunteerStats);
router.get('/:id', getVolunteerById);
router.post('/', volunteerValidation, createVolunteer);
router.put('/:id', volunteerValidation, updateVolunteer);
router.post('/:id/approve', approveVolunteer);
router.post('/:id/reject', rejectVolunteer);
router.post('/:id/hours', updateVolunteerHours);
router.delete('/:id', deleteVolunteer);

module.exports = router;
