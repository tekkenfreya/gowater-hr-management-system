'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface LeaveRequest {
  id: number;
  user_id: number;
  leave_type: 'annual' | 'sick' | 'personal' | 'emergency';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_id?: number;
  approved_at?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
  employee_name?: string;
  employee_email?: string;
  employee_department?: string;
  approver_name?: string;
  approver_email?: string;
  total_days?: number;
}

export default function LeaveTracker() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'apply' | 'history'>('apply');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [leaveBalance, setLeaveBalance] = useState({
    annual: { used: 0, total: 20 },
    sick: { used: 0, total: 10 },
    personal: { used: 0, total: 5 },
    emergency: { used: 0, total: 3 }
  });
  
  // Leave application form state
  const [newLeave, setNewLeave] = useState({
    type: 'annual' as LeaveRequest['leave_type'],
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchLeaveBalance = async () => {
    try {
      const response = await fetch('/api/leave/balance');
      const data = await response.json();

      if (data.success) {
        setLeaveBalance(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch leave balance:', error);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && user === null) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchLeaveRequests();
      fetchLeaveBalance();
    }
  }, [user]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/leave');
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch leave requests');
        return;
      }

      setLeaveRequests(data.data || []);
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      setError('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleApplyLeave = async () => {
    if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason.trim()) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setFormLoading(true);
      setError('');

      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: newLeave.startDate,
          end_date: newLeave.endDate,
          leave_type: newLeave.type,
          reason: newLeave.reason
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to submit leave request');
        return;
      }

      // Reset form and refresh data
      setNewLeave({
        type: 'annual',
        startDate: '',
        endDate: '',
        reason: ''
      });

      // Refresh leave requests and balance
      await fetchLeaveRequests();
      await fetchLeaveBalance();

      setActiveTab('history');
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      setError('Failed to submit leave request. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusColor = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getLeaveTypeColor = (type: LeaveRequest['leave_type']) => {
    switch (type) {
      case 'annual': return 'bg-blue-100 text-blue-800';
      case 'sick': return 'bg-red-100 text-red-800';
      case 'personal': return 'bg-purple-100 text-purple-800';
      case 'emergency': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading while verifying authentication
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        user={user}
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Header */}
        <Header
          user={user}
          onToggleSidebar={toggleSidebar}
          onLogout={logout}
        />

        {/* Leave Content */}
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Leave Tracker</h1>
          <p className="text-gray-800 font-medium">Manage your leave requests and track your balance</p>
        </div>

        {/* Leave Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Vacation Leave</p>
                <p className="text-2xl font-bold text-blue-600">{leaveBalance.annual.total - leaveBalance.annual.used}</p>
                <p className="text-xs text-gray-800">Available days</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-800">
                <span>Used: {leaveBalance.annual.used}</span>
                <span>Total: {leaveBalance.annual.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(leaveBalance.annual.used / leaveBalance.annual.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Sick Leave</p>
                <p className="text-2xl font-bold text-red-600">{leaveBalance.sick.total - leaveBalance.sick.used}</p>
                <p className="text-xs text-gray-800">Available days</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <MedicalIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-800">
                <span>Used: {leaveBalance.sick.used}</span>
                <span>Total: {leaveBalance.sick.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{ width: `${(leaveBalance.sick.used / leaveBalance.sick.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Personal Leave</p>
                <p className="text-2xl font-bold text-purple-600">{leaveBalance.personal.total - leaveBalance.personal.used}</p>
                <p className="text-xs text-gray-800">Available days</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <UserIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-800">
                <span>Used: {leaveBalance.personal.used}</span>
                <span>Total: {leaveBalance.personal.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${(leaveBalance.personal.used / leaveBalance.personal.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('apply')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'apply'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-800 hover:text-gray-900'
                }`}
              >
                Apply Leave
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-800 hover:text-gray-900'
                }`}
              >
                Leave History
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'apply' ? (
              <div className="max-w-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Apply for Leave</h3>
                
                {/* Error Display */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Leave Type</label>
                    <select
                      value={newLeave.type}
                      onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value as LeaveRequest['leave_type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="annual">Annual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="personal">Personal</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={newLeave.startDate}
                        onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">End Date</label>
                      <input
                        type="date"
                        value={newLeave.endDate}
                        onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {newLeave.startDate && newLeave.endDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-800">
                        Total Days: {calculateDays(newLeave.startDate, newLeave.endDate)} days
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Reason</label>
                    <textarea
                      value={newLeave.reason}
                      onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Please provide a reason for your leave request..."
                    />
                  </div>

                  <button
                    onClick={handleApplyLeave}
                    disabled={formLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                  >
                    {formLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>{formLoading ? 'Submitting...' : 'Submit Leave Request'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-6">Leave History</h3>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-800">Loading leave requests...</p>
                  </div>
                ) : leaveRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-800">No leave requests found.</p>
                    <p className="text-sm text-gray-800 mt-1">Apply for leave to see your requests here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leaveRequests.map((request) => (
                    <div key={request.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLeaveTypeColor(request.leave_type)}`}>
                              {request.leave_type === 'annual' ? 'Annual' : request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-semibold text-gray-800">Duration</p>
                              <p className="text-gray-800">{request.start_date} to {request.end_date}</p>
                              <p className="text-gray-800">{request.total_days || 1} day{(request.total_days || 1) > 1 ? 's' : ''}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">Applied Date</p>
                              <p className="text-gray-800">{new Date(request.created_at).toLocaleDateString()}</p>
                              {request.approver_name && (
                                <p className="text-gray-800">By: {request.approver_name}</p>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">Reason</p>
                              <p className="text-gray-800">{request.reason}</p>
                            </div>
                          </div>
                          {request.comments && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <p className="text-sm font-semibold text-gray-800">Comments:</p>
                              <p className="text-sm text-gray-800">{request.comments}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
      </div>
    </div>
  );
}

// Icon Components
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function MedicalIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}