import { useQuery, type UseQueryOptions, type QueryObserverResult } from '@tanstack/react-query';
import { useRecoilValue } from 'recoil';
import { dataService } from 'librechat-data-provider';
import store from '~/store';

// Admin types (matching backend responses)
interface AdminStatsResponse {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  totalConversations: number;
  totalMessages: number;
  averageMessagesPerUser: number;
}

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  username: string;
  avatar?: string;
  role: string;
  provider: string;
  emailVerified: boolean;
  createdAt: string;
}

interface AdminUsersResponse {
  users: AdminUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface AdminUserDetailsResponse extends AdminUser {
  stats: {
    conversationCount: number;
    messageCount: number;
    lastActivity: string | null;
  };
}

interface AdminTrendDataPoint {
  date: string;
  count: number;
}

export enum AdminQueryKeys {
  stats = 'adminStats',
  users = 'adminUsers',
  userDetails = 'adminUserDetails',
  trends = 'adminTrends',
}

/**
 * Hook to fetch admin dashboard statistics
 */
export const useGetAdminStatsQuery = (
  config?: UseQueryOptions<AdminStatsResponse>,
): QueryObserverResult<AdminStatsResponse> => {
  const queriesEnabled = useRecoilValue<boolean>(store.queriesEnabled);
  return useQuery<AdminStatsResponse>(
    [AdminQueryKeys.stats],
    () => dataService.getAdminStats(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
      staleTime: 30000, // 30 seconds
      ...config,
      enabled: (config?.enabled ?? true) === true && queriesEnabled,
    },
  );
};

/**
 * Hook to fetch paginated list of users with filtering
 */
export const useGetAdminUsersQuery = (
  params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: string;
  },
  config?: UseQueryOptions<AdminUsersResponse>,
): QueryObserverResult<AdminUsersResponse> => {
  const queriesEnabled = useRecoilValue<boolean>(store.queriesEnabled);
  return useQuery<AdminUsersResponse>(
    [AdminQueryKeys.users, params],
    () => dataService.getAdminUsers(params),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      keepPreviousData: true, // Keep previous data while fetching new page
      staleTime: 10000, // 10 seconds
      ...config,
      enabled: (config?.enabled ?? true) === true && queriesEnabled,
    },
  );
};

/**
 * Hook to fetch detailed information for a specific user
 */
export const useGetAdminUserDetailsQuery = (
  userId: string,
  config?: UseQueryOptions<AdminUserDetailsResponse>,
): QueryObserverResult<AdminUserDetailsResponse> => {
  const queriesEnabled = useRecoilValue<boolean>(store.queriesEnabled);
  return useQuery<AdminUserDetailsResponse>(
    [AdminQueryKeys.userDetails, userId],
    () => dataService.getAdminUserDetails(userId),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
      staleTime: 30000, // 30 seconds
      ...config,
      enabled: (config?.enabled ?? true) === true && queriesEnabled && !!userId,
    },
  );
};

/**
 * Hook to fetch user registration trends
 */
export const useGetAdminTrendsQuery = (
  params: { days?: number },
  config?: UseQueryOptions<AdminTrendDataPoint[]>,
): QueryObserverResult<AdminTrendDataPoint[]> => {
  const queriesEnabled = useRecoilValue<boolean>(store.queriesEnabled);
  return useQuery<AdminTrendDataPoint[]>(
    [AdminQueryKeys.trends, params],
    () => dataService.getAdminTrends(params),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
      staleTime: 60000, // 1 minute
      ...config,
      enabled: (config?.enabled ?? true) === true && queriesEnabled,
    },
  );
};
