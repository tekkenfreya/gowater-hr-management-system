'use client';

import { useState } from 'react';
import { Lead, ActivityType, ActivityFormData } from '@/types/leads';
import { logger } from '@/lib/logger';

interface LogActivityModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
}

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string }[] = [
  { value: 'call', label: 'Phone Call', icon: '📞' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'meeting', label: 'Meeting', icon: '🤝' },
  { value: 'site-visit', label: 'Site Visit', icon: '🏢' },
  { value: 'follow-up', label: 'Follow-up', icon: '📋' },
  { value: 'remark', label: 'Remark', icon: '📝' },
  { value: 'other', label: 'Other', icon: '✨' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'No status change' },
  { value: 'not-started', label: 'Not Started' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'closed', label: 'Closed Deal' },
  { value: 'rejected', label: 'Rejected' },
];

export default function LogActivityModal({ lead, onClose, onSuccess }: LogActivityModalProps) {
  const [formData, setFormData] = useState<ActivityFormData>({
    activity_type: 'call',
    activity_description: '',
    start_date: '',
    end_date: '',
    status_update: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.activity_description.trim()) {
      alert('Activity description is required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/leads/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          ...formData,
          status_update: formData.status_update || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert(`Failed to log activity: ${data.error}`);
        logger.error('Failed to log activity', data.error);
      }
    } catch (error) {
      alert('An error occurred while logging the activity');
      logger.error('Error logging activity', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-700 px-8 py-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Log Activity</h2>
              <p className="text-zinc-400 mt-1">{lead.company_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-zinc-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Activity Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Activity Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ACTIVITY_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, activity_type: type.value }))}
                  className={`p-4 border-2 rounded-xl transition-all text-left ${
                    formData.activity_type === type.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{type.icon}</span>
                    <span className="font-medium text-gray-900">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Activity Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="activity_description"
              value={formData.activity_description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none text-gray-900"
              placeholder="Describe what you did... (e.g., 'Called Mr. Santos to discuss pricing for 3 vending machines. He requested a formal quote by Friday.')"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Start Date</label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all text-gray-900"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">End Date (Optional)</label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all text-gray-900"
            />
          </div>

          {/* Status Update */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Update Lead Status</label>
            <select
              name="status_update"
              value={formData.status_update}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all text-gray-900"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Optionally update the lead status based on this activity
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-zinc-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-zinc-900">Activity will be tracked</p>
                <p className="text-sm text-zinc-600 mt-1">
                  This activity will be logged with your name and timestamp. Your boss can see all activities in the dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging...' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
