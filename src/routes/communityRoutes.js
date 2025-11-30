console.log('🔧🔧🔧 LOADING communityRoutes.js FILE 🔧🔧🔧');

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { allowRoles, PERMISSIONS } = require('../middleware/rbacMiddleware');

console.log('🔧 communityRoutes.js: Imports loaded successfully');

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
  updateMember,
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

console.log('🔧 Community Routes: Registering member routes...');

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
console.log('🔧 Registering: GET /:id/members');
router.get('/:id/members', (req, res, next) => {
  console.log('✅ GET /:id/members route HIT!', req.params.id);
  next();
}, getCommunityMembers);

console.log('🔧 Registering: POST /:id/members');
router.post('/:id/members', (req, res, next) => {
  console.log('✅ POST /:id/members route HIT!', req.params.id);
  next();
}, allowRoles(PERMISSIONS.CAN_MANAGE_COMMUNITY), addMember);
router.put('/:id/members/:memberId', allowRoles(PERMISSIONS.CAN_MANAGE_COMMUNITY), updateMember);
router.patch('/:id/members/:memberId/role', allowRoles(PERMISSIONS.CAN_MANAGE_COMMUNITY), updateMemberRole);
router.delete('/:id/members/:memberId', allowRoles(PERMISSIONS.CAN_MANAGE_COMMUNITY), removeMember);

// Legacy routes for backward compatibility
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