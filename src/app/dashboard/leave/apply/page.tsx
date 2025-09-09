'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface LeaveApplication {
  type: 'sick' | 'vacation' | 'personal' | 'maternity' | 'emergency';
  startDate: string;
  endDate: string;
  reason: string;
}

export default function ApplyLeavePage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [leaveForm, setLeaveForm] = useState<LeaveApplication>({
    type: 'vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Leave balance 
  const leaveBalance = {
    vacation: { used: 5, total: 20 },
    sick: { used: 2, total: 10 },
    personal: { used: 1, total: 5 }
  };

  useEffect(() => {
    if (!isLoading && user === null) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const calculateDays = () => {
    if (!leaveForm.startDate || !leaveForm.endDate) return 0;
    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setSuccess('');

    try {
      // TODO: Implement API call to submit leave request
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setSuccess('Leave request submitted successfully!');
      setLeaveForm({
        type: 'vacation',
        startDate: '',
        endDate: '',
        reason: ''
      });
    } catch (error) {
      setError('Failed to submit leave request. Please try again.');
    }
    setFormLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        user={user}
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <Header
          user={user}
          onToggleSidebar={toggleSidebar}
          onLogout={logout}
        />

        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Apply for Leave</h1>
            <p className="text-gray-700">Submit a new leave request for approval</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Leave Balance Cards */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance</h2>
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">Vacation Days</h3>
                    <span className="text-sm text-gray-800">
                      {leaveBalance.vacation.total - leaveBalance.vacation.used}/{leaveBalance.vacation.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${((leaveBalance.vacation.total - leaveBalance.vacation.used) / leaveBalance.vacation.total) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">Sick Days</h3>
                    <span className="text-sm text-gray-800">
                      {leaveBalance.sick.total - leaveBalance.sick.used}/{leaveBalance.sick.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${((leaveBalance.sick.total - leaveBalance.sick.used) / leaveBalance.sick.total) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">Personal Days</h3>
                    <span className="text-sm text-gray-800">
                      {leaveBalance.personal.total - leaveBalance.personal.used}/{leaveBalance.personal.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${((leaveBalance.personal.total - leaveBalance.personal.used) / leaveBalance.personal.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Application Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Leave Request Form</h2>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Leave Type</label>
                    <select
                      value={leaveForm.type}
                      onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as LeaveApplication['type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="vacation">Vacation</option>
                      <option value="sick">Sick Leave</option>
                      <option value="personal">Personal</option>
                      <option value="maternity">Maternity</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={leaveForm.startDate}
                        onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">End Date</label>
                      <input
                        type="date"
                        value={leaveForm.endDate}
                        onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {leaveForm.startDate && leaveForm.endDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-sm font-medium">
                        Total Days: {calculateDays()} day(s)
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Reason</label>
                    <textarea
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Please provide a reason for your leave request..."
                      required
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                    >
                      {formLoading ? 'Submitting...' : 'Submit Request'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/leave')}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}