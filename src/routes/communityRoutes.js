const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { allowRoles, PERMISSIONS } = require('../middleware/rbacMiddleware');

// Import controllers
const {
  createCommunity,
  listCommunities,
  getCommunity,
  updateCommunity,
  deleteCommunity,
  getCommunityCalendar,
  getCommunityFinances,
  getCommunityTasks
} = require('../controllers/community/communityController');

const {
  getCommunityMembers,
  addMember,
  updateMemberRole,
  removeMember
} = require('../controllers/community/memberController');

const {
  getCommunityStats
} = require('../controllers/community/statsController');

const {
  getCommunityTimeline
} = require('../controllers/community/timelineController');

// ✅ Apply auth middleware to all routes
router.use(authMiddleware);

// ========================
// COMMUNITY CRUD ROUTES
// ========================
router.post('/', allowRoles(PERMISSIONS.CAN_CREATE_COMMUNITY), createCommunity);
router.get('/', listCommunities);
router.get('/:id', getCommunity);
router.put('/:id', allowRoles(PERMISSIONS.CAN_MANAGE_COMMUNITY), updateCommunity);
router.delete('/:id', allowRoles(PERMISSIONS.CAN_MANAGE_COMMUNITY), deleteCommunity);

// ========================
// COMMUNITY MEMBERS ROUTES
// ========================
router.get('/:id/members', getCommunityMembers);
router.post('/:id/members', allowRoles(PERMISSIONS.CAN_MANAGE_COMMUNITY), addMember);
router.put('/:id/members/:userId', allowRoles(PERMISSIONS.CAN_MANAGE_COMMUNITY), updateMemberRole);
router.delete('/:id/members/:userId', allowRoles(PERMISSIONS.CAN_MANAGE_COMMUNITY), removeMember);

// ========================
// COMMUNITY DATA ROUTES
// ========================
router.get('/:id/calendar', getCommunityCalendar);
router.get('/:id/finances', getCommunityFinances);
router.get('/:id/tasks', getCommunityTasks);
router.get('/:id/stats', getCommunityStats);
router.get('/:id/timeline', getCommunityTimeline);

module.exports = router;