'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { DashboardStats, LeadCategory } from '@/types/leads';
import { logger } from '@/lib/logger';

const CATEGORY_COLORS: Record<LeadCategory, string> = {
  factory: '#3B82F6',
  school: '#10B981',
  cooperative: '#F59E0B',
  dti: '#8B5CF6',
  rotary: '#EC4899',
  event: '#EF4444',
};

export default function LeadAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has permission to view analytics
    if (user && user.role !== 'admin' && user.role !== 'boss') {
      router.push('/dashboard');
      return;
    }

    fetchStats();
  }, [user, router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leads/dashboard');
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      } else {
        logger.error('Failed to fetch dashboard stats', data.error);
      }
    } catch (error) {
      logger.error('Error fetching dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Failed to load analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Activity Dashboard</h1>
          <p className="text-gray-600">Track team performance and lead activity</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total_leads}</div>
            <div className="text-sm text-gray-600 mt-1">Total Leads</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-3xl font-bold text-blue-600">{stats.active_leads}</div>
            <div className="text-sm text-gray-600 mt-1">Active Leads</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-3xl font-bold text-green-600">{stats.closed_deals}</div>
            <div className="text-sm text-gray-600 mt-1">Closed Deals</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">📝</div>
            <div className="text-3xl font-bold text-purple-600">{stats.total_activities}</div>
            <div className="text-sm text-gray-600 mt-1">Total Activities</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-3xl font-bold text-orange-600">{stats.activities_today}</div>
            <div className="text-sm text-gray-600 mt-1">Today&apos;s Activities</div>
          </div>
        </div>

        {/* Employee Activity Leaderboard */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Employee Activity Leaderboard</h2>
          <div className="space-y-4">
            {stats.employee_activities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No employee activities yet</p>
            ) : (
              stats.employee_activities.map((employee, index) => (
                <div key={employee.employee_name} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{employee.employee_name}</h3>
                        <p className="text-sm text-gray-600">{employee.leads_assigned} leads assigned</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">{employee.total_activities}</div>
                      <div className="text-sm text-gray-600">Total Activities</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{employee.calls}</div>
                      <div className="text-xs text-gray-600">Calls</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{employee.emails}</div>
                      <div className="text-xs text-gray-600">Emails</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{employee.meetings}</div>
                      <div className="text-xs text-gray-600">Meetings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{employee.site_visits}</div>
                      <div className="text-xs text-gray-600">Site Visits</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Leads by Category */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Leads by Category</h2>
            <div className="space-y-4">
              {stats.by_category.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium capitalize">{category.category}</span>
                    <span className="text-gray-600 font-semibold">{category.count} ({category.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${category.percentage}%`,
                        backgroundColor: CATEGORY_COLORS[category.category],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leads by Status */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Leads by Status</h2>
            <div className="space-y-3">
              {stats.by_status.map((status) => (
                <div key={status.status} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-900 font-medium capitalize">{status.status.replace('-', ' ')}</span>
                  <span className="text-2xl font-bold text-gray-900">{status.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stale Leads Alert */}
        {stats.stale_leads.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 mb-8">
            <div className="flex items-start space-x-4">
              <div className="text-4xl">⚠️</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-red-900 mb-2">Stale Leads Alert</h2>
                <p className="text-red-700 mb-4">
                  {stats.stale_leads.length} lead(s) have no activity in the last 30 days
                </p>
                <div className="space-y-2">
                  {stats.stale_leads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-gray-900">{lead.company_name}</div>
                          <div className="text-sm text-gray-600">
                            Assigned to: {lead.assigned_to || 'Unassigned'}
                          </div>
                        </div>
                        <div className="text-sm text-red-600">
                          {lead.activity_count} activities
                        </div>
                      </div>
                    </div>
                  ))}
                  {stats.stale_leads.length > 5 && (
                    <p className="text-sm text-red-700 text-center pt-2">
                      +{stats.stale_leads.length - 5} more stale leads
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activities Feed */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity Feed</h2>
          <div className="space-y-4">
            {stats.recent_activities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No activities yet</p>
            ) : (
              stats.recent_activities.map((activity) => (
                <div key={activity.id} className="border-l-4 border-blue-500 bg-gray-50 rounded-r-xl p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-bold text-gray-900">{activity.employee_name}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600">{activity.company_name}</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {activity.category}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{activity.activity_description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="capitalize">{activity.activity_type.replace('-', ' ')}</span>
                        <span>{formatDate(activity.created_at)}</span>
                        {activity.status_update && (
                          <span className="text-green-600 font-medium">
                            Status: {activity.status_update.replace('-', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
