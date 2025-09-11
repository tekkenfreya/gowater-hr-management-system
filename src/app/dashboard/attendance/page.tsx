'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { AttendanceRecord } from '@/types/attendance';

export default function AttendancePage() {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'regularization'>('summary');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [weeklyAttendance, setWeeklyAttendance] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
      fetchWeeklyAttendance();
    }
  }, [user]);

  const fetchTodayAttendance = async () => {
    try {
      const response = await fetch('/api/attendance/today');
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data.attendance);
      }
    } catch (error) {
      console.error('Failed to fetch today attendance:', error);
    }
  };

  const fetchWeeklyAttendance = async () => {
    try {
      const startDate = getWeekStartDate(selectedWeek);
      const response = await fetch(`/api/attendance/weekly?startDate=${startDate}`);
      if (response.ok) {
        const data = await response.json();
        setWeeklyAttendance(data.weeklyAttendance);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch weekly attendance:', error);
    }
    setLoading(false);
  };

  const getWeekStartDate = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: '' }),
      });

      if (response.ok) {
        await fetchTodayAttendance();
        await fetchWeeklyAttendance();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to check in');
      }
    } catch (error) {
      alert('Failed to check in. Please try again.');
    }
    setCheckingIn(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      const response = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: '' }),
      });

      if (response.ok) {
        await fetchTodayAttendance();
        await fetchWeeklyAttendance();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to check out');
      }
    } catch (error) {
      alert('Failed to check out. Please try again.');
    }
    setCheckingOut(false);
  };

  const handleDeleteAttendance = async () => {
    if (!confirm('Are you sure you want to delete today\'s attendance record? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          notes: 'Testing - delete attendance from attendance page'
        }),
      });

      if (response.ok) {
        await fetchTodayAttendance();
        await fetchWeeklyAttendance();
        alert('Today\'s attendance record deleted successfully! You can now check in again.');
      } else {
        const data = await response.json();
        alert(`Delete failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete attendance error:', error);
      alert('Failed to delete attendance. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'text-green-600';
      case 'Late': return 'text-orange-600';
      case 'Absent': return 'text-red-600';
      case 'Weekend': return 'text-gray-800';
      default: return 'text-gray-800';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-green-50';
      case 'Late': return 'bg-orange-50';
      case 'Absent': return 'bg-red-50';
      case 'Weekend': return 'bg-gray-50';
      default: return 'bg-white';
    }
  };

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
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
              <p className="text-gray-800">Track your attendance and manage work hours</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleDeleteAttendance}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                title="Delete today's attendance record (for testing)"
              >
                <TrashIcon />
                <span>Delete Today</span>
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2">
                <DownloadIcon />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-t-xl border border-gray-200 border-b-0">
            <div className="flex">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'summary' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-800 hover:text-gray-900'
                }`}
              >
                Attendance Summary
              </button>
              <button
                onClick={() => setActiveTab('regularization')}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'regularization' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-800 hover:text-gray-900'
                }`}
              >
                Regularization
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-6">
            {activeTab === 'summary' && (
              <>
                {/* Current Status Card - Real Data */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm text-gray-800">
                          {new Date().toLocaleDateString('en-US', { 
                            weekday: 'long',
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                        <h3 className="font-medium text-gray-900">
                          {todayAttendance?.status ? todayAttendance.status.charAt(0).toUpperCase() + todayAttendance.status.slice(1) : 'Not checked in'}
                        </h3>
                        <p className="text-xs text-gray-800 mt-1">
                          {todayAttendance?.checkInTime 
                            ? `Checked in at ${new Date(todayAttendance.checkInTime).toLocaleTimeString()}`
                            : 'Ready to check in'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-800">
                          <span className="text-blue-500 font-medium">
                            {todayAttendance?.totalHours ? todayAttendance.totalHours.toFixed(2) : '0.00'}
                          </span> Hrs
                        </div>
                      </div>
                      {!todayAttendance?.checkInTime ? (
                        <button
                          onClick={handleCheckIn}
                          disabled={checkingIn}
                          className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                        >
                          {checkingIn ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Checking in...</span>
                            </>
                          ) : (
                            <>
                              <ClockIcon />
                              <span>Check in</span>
                            </>
                          )}
                        </button>
                      ) : todayAttendance?.checkOutTime ? (
                        <div className="text-green-600 font-medium px-6 py-2">
                          ✓ Day Complete
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleCheckOut}
                            disabled={checkingOut}
                            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                          >
                            {checkingOut ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Checking out...</span>
                              </>
                            ) : (
                              <>
                                <ClockIcon />
                                <span>Check out</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleDeleteAttendance}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                            title="Delete today's attendance record (for testing)"
                          >
                            <TrashIcon />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <ChevronLeftIcon />
                    </button>
                    <span className="text-lg font-medium text-gray-900">
                      31-Aug-2025 - 06-Sep-2025
                    </span>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <ChevronRightIcon />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <CalendarIcon />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <ViewListIcon />
                    </button>
                  </div>
                </div>

                {/* Weekly Calendar Grid - Matching Zoho Layout */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                  {/* Header */}
                  <div className="bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-5 divide-x divide-gray-200">
                      <div className="p-4 font-medium text-gray-900">Date</div>
                      <div className="p-4 font-medium text-gray-900">Check In</div>
                      <div className="p-4 font-medium text-gray-900">Check Out</div>
                      <div className="p-4 font-medium text-gray-900">Total Hours</div>
                      <div className="p-4 font-medium text-gray-900 text-center">Status</div>
                    </div>
                  </div>

                  {/* Weekly Data Rows */}
                  {weeklyAttendance.map((day, index) => (
                    <div 
                      key={day.date} 
                      className={`grid grid-cols-5 divide-x divide-gray-200 border-b border-gray-200 ${getStatusBg(day.status)}`}
                    >
                      {/* Date Column */}
                      <div className="p-4">
                        <p className="font-medium text-gray-900">{day.day}</p>
                        <p className="text-sm text-gray-800">{day.date}</p>
                      </div>

                      {/* Check In Column */}
                      <div className="p-4">
                        <p className="font-medium text-gray-900">{day.checkIn || '--'}</p>
                        {day.lateBy && (
                          <p className="text-xs text-orange-600">Late by {day.lateBy}</p>
                        )}
                      </div>

                      {/* Check Out Column */}
                      <div className="p-4">
                        <p className="font-medium text-gray-900">{day.checkOut || '--'}</p>
                      </div>

                      {/* Total Hours Column */}
                      <div className="p-4">
                        <p className="font-medium text-gray-900">{day.hours}</p>
                      </div>

                      {/* Status Column */}
                      <div className="p-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          day.status === 'Present' ? 'bg-green-100 text-green-800' :
                          day.status === 'Late' ? 'bg-orange-100 text-orange-800' :
                          day.status === 'Absent' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {day.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Stats */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{summary.totalDays || 0}</p>
                      <p className="text-sm text-gray-800">Total Days</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{summary.presentDays || 0}</p>
                      <p className="text-sm text-gray-800">Present</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{summary.absentDays || 0}</p>
                      <p className="text-sm text-gray-800">Absent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{summary.totalHours?.toFixed(1) || '0.0'}h</p>
                      <p className="text-sm text-gray-800">Total Hours</p>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-800">
                      Week Summary • {summary.lateDays || 0} late days
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'regularization' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClockIcon className="w-8 h-8 text-gray-800" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Regularization Requests</h3>
                <p className="text-gray-800 mb-6">Request regularization for missed punches or timing adjustments</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200">
                  Request Regularization
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Icon Components
function DownloadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ViewListIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}