import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Shield, User, Mail, Calendar } from 'lucide-react';
import { SystemRoles } from 'librechat-data-provider';
import { useGetAdminUsersQuery, useUpdateUserRoleMutation } from '~/data-provider/Admin';
import { cn } from '~/utils';

export default function UserTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useGetAdminUsersQuery({
    page,
    limit: 20,
    search: debouncedSearch,
    sortBy,
    sortOrder,
  });

  const updateRoleMutation = useUpdateUserRoleMutation();

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  };

  const handleRoleToggle = (userId: string, currentRole: string) => {
    const newRole = currentRole === SystemRoles.ADMIN ? SystemRoles.USER : SystemRoles.ADMIN;
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by email, name, or username..."
            className="w-full rounded-md border border-border-light bg-surface-secondary py-2 pl-10 pr-4 text-sm text-text-primary placeholder-text-tertiary focus:border-text-primary focus:outline-none focus:ring-1 focus:ring-text-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border-light">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border-light bg-surface-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                  User
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                  Joined
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light bg-surface-primary">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-border-light border-t-text-primary" />
                    </div>
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-secondary">
                    No users found
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr
                    key={user._id}
                    className="transition-colors hover:bg-surface-secondary"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-tertiary text-text-secondary">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{user.name}</p>
                          {user.username && (
                            <p className="text-xs text-text-tertiary">@{user.username}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-text-tertiary" />
                        <span className="text-sm text-text-primary">{user.email}</span>
                      </div>
                      {!user.emailVerified && (
                        <span className="mt-1 inline-block text-xs text-yellow-600">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.role === SystemRoles.ADMIN ? (
                          <>
                            <Shield className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium text-blue-500">Admin</span>
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4 text-text-tertiary" />
                            <span className="text-sm text-text-secondary">User</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary capitalize">
                      {user.provider}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Calendar className="h-4 w-4" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRoleToggle(user._id, user.role)}
                        disabled={updateRoleMutation.isLoading}
                        className={cn(
                          'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                          user.role === SystemRoles.ADMIN
                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
                          updateRoleMutation.isLoading && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        {user.role === SystemRoles.ADMIN ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border-light bg-surface-secondary px-4 py-3">
            <div className="text-sm text-text-secondary">
              Showing {(page - 1) * 20 + 1} to{' '}
              {Math.min(page * 20, data.pagination.totalCount)} of{' '}
              {data.pagination.totalCount} users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!data.pagination.hasPreviousPage}
                className="rounded-md border border-border-light bg-surface-primary px-3 py-1 text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-text-secondary">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!data.pagination.hasNextPage}
                className="rounded-md border border-border-light bg-surface-primary px-3 py-1 text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}