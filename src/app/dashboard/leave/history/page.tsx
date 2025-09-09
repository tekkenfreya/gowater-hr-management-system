'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface LeaveRequest {
  id: string;
  type: 'sick' | 'vacation' | 'personal' | 'maternity' | 'emergency';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
  approvedBy?: string;
  comments?: string;
}

export default function LeaveHistoryPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (!isLoading && user === null) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    // TODO: Fetch leave requests from API
    // For now, showing sample data
    const sampleRequests: LeaveRequest[] = [
      {
        id: '1',
        type: 'vacation',
        startDate: '2024-12-20',
        endDate: '2024-12-30',
        days: 11,
        reason: 'Winter holiday vacation with family',
        status: 'approved',
        appliedDate: '2024-12-01',
        approvedBy: 'John Manager',
        comments: 'Approved. Enjoy your vacation!'
      },
      {
        id: '2',
        type: 'sick',
        startDate: '2024-11-15',
        endDate: '2024-11-16',
        days: 2,
        reason: 'Flu symptoms',
        status: 'approved',
        appliedDate: '2024-11-15',
        approvedBy: 'John Manager'
      },
      {
        id: '3',
        type: 'personal',
        startDate: '2024-10-10',
        endDate: '2024-10-10',
        days: 1,
        reason: 'Personal appointment',
        status: 'pending',
        appliedDate: '2024-10-08'
      }
    ];
    
    setLeaveRequests(sampleRequests);
    setLoading(false);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const getStatusBadge = (status: LeaveRequest['status']) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeColor = (type: LeaveRequest['type']) => {
    const colors = {
      vacation: 'text-blue-600',
      sick: 'text-red-600',
      personal: 'text-purple-600',
      maternity: 'text-pink-600',
      emergency: 'text-orange-600'
    };
    return colors[type];
  };

  const filteredRequests = selectedStatus === 'all' 
    ? leaveRequests 
    : leaveRequests.filter(req => req.status === selectedStatus);

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

  if (loading) {
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
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Leave History</h1>
                <p className="text-gray-700">View and track your leave requests</p>
              </div>
              <button
                onClick={() => router.push('/dashboard/leave/apply')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Request</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold text-gray-700">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{leaveRequests.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold text-gray-700">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{leaveRequests.filter(r => r.status === 'pending').length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold text-gray-700">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{leaveRequests.filter(r => r.status === 'approved').length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold text-gray-700">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">{leaveRequests.filter(r => r.status === 'rejected').length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-semibold text-gray-800">Filter by status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Leave Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Leave Requests</h2>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No leave requests</h3>
                <p className="mt-1 text-sm text-gray-800">
                  {selectedStatus === 'all' ? "You haven't submitted any leave requests yet." : `No ${selectedStatus} requests found.`}
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/dashboard/leave/apply')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                  >
                    Submit Leave Request
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <div key={request.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className={`font-medium capitalize ${getTypeColor(request.type)}`}>
                            {request.type} Leave
                          </h3>
                          {getStatusBadge(request.status)}
                          <span className="text-sm text-gray-800">
                            {request.days} day{request.days > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 mb-1">
                          <strong>Dates:</strong> {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          <strong>Reason:</strong> {request.reason}
                        </div>
                        <div className="text-xs text-gray-800">
                          Applied on {new Date(request.appliedDate).toLocaleDateString()}
                          {request.approvedBy && (
                            <span> • Approved by {request.approvedBy}</span>
                          )}
                        </div>
                        {request.comments && (
                          <div className="text-xs text-gray-800 mt-1">
                            <strong>Comments:</strong> {request.comments}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}