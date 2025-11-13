const COMMUNITY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CHAIRMAN: 'chairman',
  BOARD: 'board',
  FINANCE: 'finance',
  COMMUNITY_OWNER: 'community_owner',
  COMMUNITY_LEAD: 'community_lead',
  COMMUNITY_MEMBER: 'community_member',
  VOLUNTEER_COORDINATOR: 'volunteer_coordinator',
  PRIEST: 'priest',
  VOLUNTEER: 'volunteer',
  PUBLIC: 'public'
};

const PERMISSIONS = {
  CAN_CREATE_COMMUNITY: [
    ROLES.SUPER_ADMIN,
    ROLES.CHAIRMAN,
    ROLES.BOARD,
    ROLES.COMMUNITY_OWNER
  ],
  CAN_MANAGE_COMMUNITY: [
    ROLES.SUPER_ADMIN,
    ROLES.CHAIRMAN,
    ROLES.BOARD,
    ROLES.COMMUNITY_OWNER,
    ROLES.COMMUNITY_LEAD
  ],
  CAN_VIEW_FINANCE: [
    ROLES.SUPER_ADMIN,
    ROLES.CHAIRMAN,
    ROLES.BOARD,
    ROLES.FINANCE
  ],
};

module.exports = {
  COMMUNITY_STATUS,
  PAGINATION,
  ROLES,
  PERMISSIONS
};


