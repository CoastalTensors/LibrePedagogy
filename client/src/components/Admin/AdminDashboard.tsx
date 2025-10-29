import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, UserCheck, UserPlus, MessageSquare, Shield } from 'lucide-react';
import type { ContextType } from '~/common';
import { useDocumentTitle, useLocalize } from '~/hooks';
import { useGetAdminStatsQuery } from '~/data-provider/Admin';
import { cn } from '~/utils';
import UserTable from './UserTable';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  className?: string;
}

const StatCard = ({ title, value, icon, subtitle, className }: StatCardProps) => (
  <div className={cn('rounded-lg border border-border-light bg-surface-primary p-6', className)}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-text-primary">{value}</p>
        {subtitle && <p className="mt-1 text-sm text-text-tertiary">{subtitle}</p>}
      </div>
      <div className="ml-4 flex-shrink-0 text-text-tertiary">{icon}</div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const localize = useLocalize();
  const { navVisible } = useOutletContext<ContextType>();
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');

  useDocumentTitle('Admin Dashboard | LibreChat');

  const { data: stats, isLoading, error } = useGetAdminStatsQuery();

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-text-primary">Failed to load admin dashboard</p>
          <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-primary">
      {/* Header */}
      <div className="border-b border-border-light bg-surface-primary px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Manage users and view system statistics
            </p>
          </div>
          <div className="flex items-center gap-2 text-text-tertiary">
            <Shield className="h-5 w-5" />
            <span className="text-sm font-medium">Administrator</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-border-light">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'overview'
                ? 'border-b-2 border-text-primary text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'users'
                ? 'border-b-2 border-text-primary text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            Users
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-light border-t-text-primary" />
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Users"
                    value={stats?.totalUsers ?? 0}
                    icon={<Users className="h-8 w-8" />}
                    subtitle={`${stats?.adminUsers ?? 0} admins, ${stats?.regularUsers ?? 0} users`}
                  />
                  <StatCard
                    title="New This Week"
                    value={stats?.newUsersThisWeek ?? 0}
                    icon={<UserPlus className="h-8 w-8" />}
                    subtitle={`${stats?.newUsersThisMonth ?? 0} this month`}
                  />
                  <StatCard
                    title="Verified Users"
                    value={stats?.verifiedUsers ?? 0}
                    icon={<UserCheck className="h-8 w-8" />}
                    subtitle={`${stats?.unverifiedUsers ?? 0} unverified`}
                  />
                  <StatCard
                    title="Total Messages"
                    value={stats?.totalMessages?.toLocaleString() ?? 0}
                    icon={<MessageSquare className="h-8 w-8" />}
                    subtitle={`Avg ${stats?.averageMessagesPerUser ?? 0}/user`}
                  />
                </div>

                {/* Additional Info */}
                <div className="rounded-lg border border-border-light bg-surface-primary p-6">
                  <h3 className="text-lg font-semibold text-text-primary">Quick Actions</h3>
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => setActiveTab('users')}
                      className="w-full rounded-md border border-border-light bg-surface-secondary px-4 py-2 text-left text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary"
                    >
                      View All Users →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'users' && <UserTable />}
      </div>
    </div>
  );
}