import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useToastContext } from '@librechat/client';
import { dataService } from 'librechat-data-provider';
import { AdminQueryKeys } from './queries';

// Admin types (matching backend)
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

/**
 * Hook to update user role (promote to admin or demote to user)
 */
export const useUpdateUserRoleMutation = (): UseMutationResult<
  { message: string; user: AdminUser },
  Error,
  { userId: string; role: 'ADMIN' | 'USER' }
> => {
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  return useMutation<
    { message: string; user: AdminUser },
    Error,
    { userId: string; role: 'ADMIN' | 'USER' }
  >(
    ({ userId, role }) => {
      return dataService.updateAdminUserRole(userId, { role });
    },
    {
      onSuccess: (data) => {
        // Invalidate and refetch admin queries to get updated data
        queryClient.invalidateQueries([AdminQueryKeys.users]);
        queryClient.invalidateQueries([AdminQueryKeys.stats]);
        queryClient.invalidateQueries([AdminQueryKeys.userDetails, data.user._id]);

        showToast({
          message: data.message,
          status: 'success',
        });
      },
      onError: (error) => {
        showToast({
          message: error.message || 'Failed to update user role',
          status: 'error',
        });
      },
    },
  );
};
