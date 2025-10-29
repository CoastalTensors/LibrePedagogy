const express = require('express');
const { checkAdmin, requireJwtAuth } = require('~/server/middleware');
const rateLimit = require('express-rate-limit');
const {
  getStatsController,
  getUsersController,
  getUserDetailsController,
  updateUserRoleController,
  getRegistrationTrendsController,
} = require('~/server/controllers/AdminController');

const router = express.Router();

// Admin rate limiter - stricter than regular endpoints
const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// All admin routes require authentication and admin role
router.use(requireJwtAuth);
router.use(checkAdmin);
router.use(adminLimiter);

/**
 * @route GET /api/admin/stats
 * @desc Get dashboard statistics (total users, new users, etc.)
 * @access Admin only
 */
router.get('/stats', getStatsController);

/**
 * @route GET /api/admin/users
 * @desc Get paginated list of users with filtering and search
 * @query page - Page number (default: 1)
 * @query limit - Users per page (default: 20, max: 100)
 * @query search - Search by email, name, or username
 * @query role - Filter by role (ADMIN or USER)
 * @query sortBy - Sort field (createdAt, email, name, username)
 * @query sortOrder - Sort order (asc or desc)
 * @access Admin only
 */
router.get('/users', getUsersController);

/**
 * @route GET /api/admin/users/:id
 * @desc Get detailed information for a specific user
 * @access Admin only
 */
router.get('/users/:id', getUserDetailsController);

/**
 * @route PATCH /api/admin/users/:id/role
 * @desc Update user role (promote to admin or demote to user)
 * @body { role: 'ADMIN' | 'USER' }
 * @access Admin only
 */
router.patch('/users/:id/role', updateUserRoleController);

/**
 * @route GET /api/admin/trends
 * @desc Get user registration trends over time
 * @query days - Number of days (default: 30, max: 365)
 * @access Admin only
 */
router.get('/trends', getRegistrationTrendsController);

module.exports = router;