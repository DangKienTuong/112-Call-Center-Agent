/**
 * Role-based authorization middleware
 * Defines permissions for different user roles
 */

// Role hierarchy and permissions
const rolePermissions = {
  admin: {
    tickets: ['create', 'read', 'update', 'delete', 'updateStatus'],
    users: ['create', 'read', 'update', 'delete'],
    dashboard: ['read'],
    reports: ['read', 'export']
  },
  staff: {
    tickets: ['read', 'updateStatus'],
    users: [],
    dashboard: [],
    reports: []
  }
};

/**
 * Check if a role has permission for a specific action on a resource
 */
const hasPermission = (role, resource, action) => {
  const permissions = rolePermissions[role];
  if (!permissions) return false;

  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
};

/**
 * Middleware to check if user has required role(s)
 * @param {string|string[]} allowedRoles - Role(s) allowed to access the route
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has permission for a specific action on a resource
 * @param {string} resource - The resource being accessed
 * @param {string} action - The action being performed
 */
const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;

    if (!hasPermission(userRole, resource, action)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Check if user is admin or staff
 */
const isAdminOrStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!['admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin or Staff access required'
    });
  }

  next();
};

/**
 * Check if user can update ticket status
 * Admin has full access, Staff can only update status
 */
const canUpdateTicketStatus = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const userRole = req.user.role;

  if (hasPermission(userRole, 'tickets', 'updateStatus')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to update ticket status.'
    });
  }
};

/**
 * Check if user can fully update ticket (all fields)
 * Only admin can update all fields
 */
const canFullUpdateTicket = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const userRole = req.user.role;

  if (hasPermission(userRole, 'tickets', 'update')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to fully update tickets.'
    });
  }
};

module.exports = {
  rolePermissions,
  hasPermission,
  requireRole,
  requirePermission,
  isAdmin,
  isAdminOrStaff,
  canUpdateTicketStatus,
  canFullUpdateTicket
};
