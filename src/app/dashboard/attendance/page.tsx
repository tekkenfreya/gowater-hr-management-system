'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { AttendanceRecord } from '@/types/attendance';

export default function AttendancePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'regularization'>('summary');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [checkingOut, setCheckingOut] = useState(false);

  // Mock attendance data based on Zoho screenshot
  const [currentAttendance, setCurrentAttendance] = useState({
    isCheckedIn: false,
    checkInTime: null as Date | null,
    workHours: '00:24:50',
    status: 'General [ 12:00 AM - 12:00 AM ]',
    todayDate: new Date().toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  });

  // Mock weekly attendance data
  const weeklyAttendance = [
    { day: 'Sun', date: '31', isWeekend: true, status: 'Weekend', checkIn: null, checkOut: null, hours: '00:00', lateBy: null },
    { day: 'Mon', date: '01', isWeekend: false, status: 'Late', checkIn: '10:49 PM', checkOut: null, hours: '07:42 AM', lateBy: '22:49' },
    { day: 'Tue', date: '02', isWeekend: false, status: 'Present', checkIn: '09:58 PM', checkOut: null, hours: '09:08 AM', lateBy: '21:58' },
    { day: 'Wed', date: '03', isWeekend: false, status: 'Present', checkIn: '10:30 PM', checkOut: null, hours: '00:24:50', lateBy: '22:30' },
    { day: 'Thu', date: '04', isWeekend: false, status: 'Absent', checkIn: null, checkOut: null, hours: '00:00', lateBy: null },
    { day: 'Fri', date: '05', isWeekend: false, status: 'Absent', checkIn: null, checkOut: null, hours: '00:00', lateBy: null },
    { day: 'Sat', date: '06', isWeekend: true, status: 'Weekend', checkIn: null, checkOut: null, hours: '00:00', lateBy: null }
  ];

  const summaryStats = {
    days: 7,
    payableDays: 4,
    present: 2,
    onDuty: 0,
    paidLeave: 0,
    holidays: 0,
    weekend: 2
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/auth/login';
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleCheckOut = () => {
    setCheckingOut(true);
    // Simulate checkout process
    setTimeout(() => {
      setCurrentAttendance(prev => ({
        ...prev,
        isCheckedIn: false,
        checkInTime: null
      }));
      setCheckingOut(false);
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'text-green-600';
      case 'Late': return 'text-orange-600';
      case 'Absent': return 'text-red-600';
      case 'Weekend': return 'text-gray-500';
      default: return 'text-gray-600';
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
              <p className="text-gray-600">Track your attendance and manage work hours</p>
            </div>
            
            {/* Export Button */}
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2">
              <DownloadIcon />
              <span>Export</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-t-xl border border-gray-200 border-b-0">
            <div className="flex">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'summary' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Attendance Summary
              </button>
              <button
                onClick={() => setActiveTab('regularization')}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'regularization' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
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
                {/* Current Status Card - Matching Zoho Design */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm text-gray-600">{currentAttendance.todayDate}</p>
                        <h3 className="font-medium text-gray-900">{currentAttendance.status}</h3>
                        <p className="text-xs text-gray-500 mt-1">Add notes for check out</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          <span className="text-red-500 font-medium">{currentAttendance.workHours}</span> Hrs
                        </div>
                      </div>
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
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm">
                      Regularization
                    </button>
                  </div>
                </div>

                {/* Weekly Calendar Grid - Matching Zoho Layout */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                  {/* Header */}
                  <div className="bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-8 divide-x divide-gray-200">
                      <div className="p-4 font-medium text-gray-900">Days</div>
                      <div className="p-4 font-medium text-gray-900">Hours</div>
                      <div className="p-4 font-medium text-gray-900 text-center">Payable Days</div>
                      <div className="p-4 font-medium text-gray-900 text-center">Present</div>
                      <div className="p-4 font-medium text-gray-900 text-center">On Duty</div>
                      <div className="p-4 font-medium text-gray-900 text-center">Paid leave</div>
                      <div className="p-4 font-medium text-gray-900 text-center">Holidays</div>
                      <div className="p-4 font-medium text-gray-900 text-center">Weekend</div>
                    </div>
                  </div>

                  {/* Weekly Data Rows */}
                  {weeklyAttendance.map((day, index) => (
                    <div 
                      key={day.date} 
                      className={`grid grid-cols-8 divide-x divide-gray-200 border-b border-gray-200 ${getStatusBg(day.status)}`}
                    >
                      {/* Day Column */}
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{day.day}</p>
                            <p className="text-sm text-gray-600">{day.date}</p>
                          </div>
                          {day.status === 'Weekend' && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                              {day.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Hours Column */}
                      <div className="p-4">
                        <div className={`${getStatusColor(day.status)}`}>
                          <p className="font-medium">{day.hours}</p>
                          <p className="text-xs">Hrs worked</p>
                        </div>
                      </div>

                      {/* Timeline Visualization */}
                      <div className="col-span-6 p-4">
                        {day.checkIn && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {day.lateBy && (
                                <span className="text-xs text-orange-600">Late by {day.lateBy}</span>
                              )}
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium">{day.checkIn}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-medium">{day.hours}</span>
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            </div>
                          </div>
                        )}
                        {!day.checkIn && day.status === 'Absent' && (
                          <div className="flex items-center justify-center py-2">
                            <span className="text-sm text-gray-500">No attendance recorded</span>
                          </div>
                        )}
                        {day.isWeekend && (
                          <div className="flex items-center justify-center py-2">
                            <span className="text-sm text-gray-500">Weekend</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Stats */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-7 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{summaryStats.days}</p>
                      <p className="text-sm text-gray-600">Days</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{summaryStats.payableDays}</p>
                      <p className="text-sm text-gray-600">Payable Days</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{summaryStats.present}</p>
                      <p className="text-sm text-gray-600">Present</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{summaryStats.onDuty}</p>
                      <p className="text-sm text-gray-600">On Duty</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{summaryStats.paidLeave}</p>
                      <p className="text-sm text-gray-600">Paid leave</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-cyan-600">{summaryStats.holidays}</p>
                      <p className="text-sm text-gray-600">Holidays</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-600">{summaryStats.weekend}</p>
                      <p className="text-sm text-gray-600">Weekend</p>
                    </div>
                  </div>
                  <div className="mt-4 text-right">
                    <p className="text-sm text-gray-600">
                      {currentAttendance.status} • <span className="text-red-500">00:24:50 Hrs</span>
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'regularization' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClockIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Regularization Requests</h3>
                <p className="text-gray-600 mb-6">Request regularization for missed punches or timing adjustments</p>
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