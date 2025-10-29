const { logger } = require('@librechat/data-schemas');
const { SystemRoles } = require('librechat-data-provider');
const {
  getUserStats,
  getAllUsersPaginated,
  getUserDetails,
  updateUserRole,
  getUserRegistrationTrends,
} = require('~/models/adminMethods');

/**
 * Get admin dashboard statistics
 * GET /api/admin/stats
 */
const getStatsController = async (req, res) => {
  try {
    const stats = await getUserStats();
    res.status(200).json(stats);
  } catch (error) {
    logger.error('[getStatsController] Error:', error);
    res.status(500).json({ message: 'Failed to retrieve statistics', error: error.message });
  }
};

/**
 * Get paginated list of users with filtering and search
 * GET /api/admin/users
 * Query params: page, limit, search, role, sortBy, sortOrder
 */
const getUsersController = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = null,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10))); // Max 100 per page

    // Validate sortBy
    const validSortFields = ['createdAt', 'email', 'name', 'username'];
    const sortByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Validate sortOrder
    const sortOrderValue = sortOrder === 'asc' ? 'asc' : 'desc';

    // Validate role filter
    let roleFilter = null;
    if (role === SystemRoles.ADMIN || role === SystemRoles.USER) {
      roleFilter = role;
    }

    const result = await getAllUsersPaginated({
      page: pageNum,
      limit: limitNum,
      search,
      role: roleFilter,
      sortBy: sortByField,
      sortOrder: sortOrderValue,
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error('[getUsersController] Error:', error);
    res.status(500).json({ message: 'Failed to retrieve users', error: error.message });
  }
};

/**
 * Get detailed information for a specific user
 * GET /api/admin/users/:id
 */
const getUserDetailsController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const userDetails = await getUserDetails(id);
    res.status(200).json(userDetails);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: 'User not found' });
    }
    logger.error('[getUserDetailsController] Error:', error);
    res.status(500).json({ message: 'Failed to retrieve user details', error: error.message });
  }
};

/**
 * Update user role (promote to admin or demote to regular user)
 * PATCH /api/admin/users/:id/role
 * Body: { role: 'ADMIN' | 'USER' }
 */
const updateUserRoleController = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminUserId = req.user.id;

    // Validation
    if (!id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    if (role !== SystemRoles.ADMIN && role !== SystemRoles.USER) {
      return res.status(400).json({ message: 'Invalid role. Must be ADMIN or USER' });
    }

    // Prevent self-demotion
    if (id === adminUserId && role === SystemRoles.USER) {
      return res.status(403).json({ message: 'You cannot demote yourself from admin' });
    }

    const updatedUser = await updateUserRole(id, role, adminUserId);
    res.status(200).json({
      message: 'User role updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: 'User not found' });
    }
    if (error.message === 'Invalid role') {
      return res.status(400).json({ message: 'Invalid role' });
    }
    logger.error('[updateUserRoleController] Error:', error);
    res.status(500).json({ message: 'Failed to update user role', error: error.message });
  }
};

/**
 * Get user registration trends
 * GET /api/admin/trends
 * Query params: days (default: 30)
 */
const getRegistrationTrendsController = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = Math.min(365, Math.max(1, parseInt(days, 10))); // Max 1 year

    const trends = await getUserRegistrationTrends(daysNum);
    res.status(200).json(trends);
  } catch (error) {
    logger.error('[getRegistrationTrendsController] Error:', error);
    res
      .status(500)
      .json({ message: 'Failed to retrieve registration trends', error: error.message });
  }
};

module.exports = {
  getStatsController,
  getUsersController,
  getUserDetailsController,
  updateUserRoleController,
  getRegistrationTrendsController,
};
