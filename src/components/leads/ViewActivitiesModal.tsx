'use client';

import { useState, useEffect } from 'react';
import { Lead, LeadActivity, ActivityType } from '@/types/leads';
import { logger } from '@/lib/logger';

interface ViewActivitiesModalProps {
  lead: Lead;
  onClose: () => void;
}

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call: '📞',
  email: '📧',
  meeting: '🤝',
  'site-visit': '🏢',
  'follow-up': '📋',
  remark: '📝',
  other: '✨',
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  call: 'bg-blue-100 text-blue-800',
  email: 'bg-purple-100 text-purple-800',
  meeting: 'bg-green-100 text-green-800',
  'site-visit': 'bg-orange-100 text-orange-800',
  'follow-up': 'bg-yellow-100 text-yellow-800',
  remark: 'bg-gray-100 text-gray-800',
  other: 'bg-pink-100 text-pink-800',
};

export default function ViewActivitiesModal({ lead, onClose }: ViewActivitiesModalProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leads/activities?leadId=${lead.id}`);
      const data = await response.json();

      if (response.ok) {
        // Sort by created_at descending (newest first)
        const sortedActivities = data.activities.sort(
          (a: LeadActivity, b: LeadActivity) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setActivities(sortedActivities);
      } else {
        logger.error('Failed to fetch activities', data.error);
      }
    } catch (error) {
      logger.error('Error fetching activities', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Activity Timeline</h2>
              <p className="text-gray-300 mt-1">{lead.company_name}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                <span>📍 {lead.location || 'N/A'}</span>
                <span>👤 {lead.contact_person || 'N/A'}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 text-lg">No activities logged yet</p>
              <p className="text-gray-400 text-sm mt-2">Start logging activities to track progress on this lead</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative">
                  {/* Timeline Line */}
                  {index < activities.length - 1 && (
                    <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gray-200"></div>
                  )}

                  {/* Activity Card */}
                  <div className="flex space-x-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl shadow-lg">
                        {ACTIVITY_ICONS[activity.activity_type]}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${ACTIVITY_COLORS[activity.activity_type]}`}>
                              {activity.activity_type.replace('-', ' ')}
                            </span>
                            {activity.status_update && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Status updated
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">{activity.employee_name}</span>
                            {' '}&bull;{' '}
                            {formatDate(activity.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-900 whitespace-pre-wrap mb-4">{activity.activity_description}</p>

                      {/* Dates */}
                      {(activity.start_date || activity.end_date) && (
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          {activity.start_date && (
                            <div className="flex items-center space-x-1">
                              <span>📅 Start:</span>
                              <span className="font-medium">{formatDateOnly(activity.start_date)}</span>
                            </div>
                          )}
                          {activity.end_date && (
                            <div className="flex items-center space-x-1">
                              <span>📅 End:</span>
                              <span className="font-medium">{formatDateOnly(activity.end_date)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status Update */}
                      {activity.status_update && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Status changed to:</span>{' '}
                            <span className="text-gray-900 capitalize">{activity.status_update.replace('-', ' ')}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-8 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
