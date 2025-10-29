const { User, Message, Conversation } = require('~/db/models');
const { SystemRoles } = require('librechat-data-provider');
const { logger } = require('@librechat/data-schemas');

/**
 * Get user statistics for admin dashboard
 * @returns {Promise<Object>} User statistics
 */
const getUserStats = async function () {
  try {
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: SystemRoles.ADMIN });
    const regularUsers = await User.countDocuments({ role: SystemRoles.USER });

    // Get new users in the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    // Get new users in the last 30 days
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: monthAgo },
    });

    // Get verified vs unverified users
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    const unverifiedUsers = await User.countDocuments({ emailVerified: false });

    // Get total conversations and messages
    const totalConversations = await Conversation.countDocuments();
    const totalMessages = await Message.countDocuments();

    return {
      totalUsers,
      adminUsers,
      regularUsers,
      newUsersThisWeek,
      newUsersThisMonth,
      verifiedUsers,
      unverifiedUsers,
      totalConversations,
      totalMessages,
      averageMessagesPerUser: totalUsers > 0 ? Math.round(totalMessages / totalUsers) : 0,
    };
  } catch (error) {
    logger.error('[getUserStats] Error getting user statistics:', error);
    throw new Error('Failed to retrieve user statistics');
  }
};

/**
 * Get paginated list of all users with optional filtering and search
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.limit - Number of users per page
 * @param {string} options.search - Search query for email, name, or username
 * @param {string} options.role - Filter by role (ADMIN, USER)
 * @param {string} options.sortBy - Field to sort by (createdAt, email, name)
 * @param {string} options.sortOrder - Sort order (asc, desc)
 * @returns {Promise<Object>} Paginated user list with metadata
 */
const getAllUsersPaginated = async function ({
  page = 1,
  limit = 20,
  search = '',
  role = null,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) {
  try {
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

    // Add search filter
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }

    // Add role filter
    if (role) {
      query.role = role;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const users = await User.find(query)
      .select('email name username avatar role provider emailVerified createdAt')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    logger.error('[getAllUsersPaginated] Error getting users:', error);
    throw new Error('Failed to retrieve users');
  }
};

/**
 * Get detailed information for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User details with statistics
 */
const getUserDetails = async function (userId) {
  try {
    const user = await User.findById(userId)
      .select('email name username avatar role provider emailVerified createdAt')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    // Get user's conversation count
    const conversationCount = await Conversation.countDocuments({ user: userId });

    // Get user's message count
    const messageCount = await Message.countDocuments({ user: userId });

    // Get user's last activity (most recent message)
    const lastMessage = await Message.findOne({ user: userId })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();

    return {
      ...user,
      stats: {
        conversationCount,
        messageCount,
        lastActivity: lastMessage ? lastMessage.createdAt : null,
      },
    };
  } catch (error) {
    logger.error('[getUserDetails] Error getting user details:', error);
    throw error;
  }
};

/**
 * Update user role (admin action)
 * @param {string} userId - User ID to update
 * @param {string} newRole - New role (ADMIN or USER)
 * @param {string} adminUserId - ID of admin performing the action
 * @returns {Promise<Object>} Updated user
 */
const updateUserRole = async function (userId, newRole, adminUserId) {
  try {
    // Validate role
    if (newRole !== SystemRoles.ADMIN && newRole !== SystemRoles.USER) {
      throw new Error('Invalid role');
    }

    // Get current user state
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oldRole = user.role;

    // Update role
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { role: newRole } },
      { new: true },
    )
      .select('email name username avatar role provider emailVerified createdAt')
      .lean();

    // Log the action
    logger.info(
      `[Admin Action] User role updated by admin ${adminUserId}: User ${userId} role changed from ${oldRole} to ${newRole}`,
    );

    return updatedUser;
  } catch (error) {
    logger.error('[updateUserRole] Error updating user role:', error);
    throw error;
  }
};

/**
 * Get user registration trends over time
 * @param {number} days - Number of days to get trends for (default: 30)
 * @returns {Promise<Array>} Array of daily user counts
 */
const getUserRegistrationTrends = async function (days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return trends.map((trend) => ({
      date: trend._id,
      count: trend.count,
    }));
  } catch (error) {
    logger.error('[getUserRegistrationTrends] Error getting registration trends:', error);
    throw new Error('Failed to retrieve registration trends');
  }
};

module.exports = {
  getUserStats,
  getAllUsersPaginated,
  getUserDetails,
  updateUserRole,
  getUserRegistrationTrends,
};
