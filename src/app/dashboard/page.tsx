'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import BreakModal from '@/components/BreakModal';
import ForcePasswordChangeModal from '@/components/ForcePasswordChangeModal';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/contexts/AttendanceContext';
import { logger } from '@/lib/logger';
import { formatPhilippineTime } from '@/lib/timezone';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  position: string;
  department: string;
  isOnline: boolean;
  isBoss: boolean;
  avatar?: string;
}

interface WeeklyAttendanceData {
  date: string;
  day: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'on_duty';
  isWeekend?: boolean;
  sessions?: Array<{ checkIn: string; checkOut: string }>;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading, logout, refetch } = useAuth();
  const { isTimedIn, isOnBreak, workDuration, breakStartTime, checkInTime, handleTimeIn, handleEndBreak } = useAttendance();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Team members state
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);

  // Attendance calendar state
  const [weeklyAttendance, setWeeklyAttendance] = useState<WeeklyAttendanceData[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'summary'>('calendar');
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Initialize to current week's Sunday
    const today = new Date();
    const currentDay = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - currentDay);
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  });
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalHours: 0,
    daysPresent: 0,
    avgHoursPerDay: 0,
    weekProgress: 0,
    period: 'week' as 'week' | 'month' | 'year',
    expectedHours: 40
  });

  // Get week dates based on currentWeekStart (Sunday to Saturday)
  const getWeekDates = () => {
    const weekDates = [];
    for (let i = 0; i < 7; i++) { // Sunday to Saturday
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getWeekDates();

  // Calculate real-time summary from weeklyAttendance
  const calculateWeeklySummary = () => {
    let totalHours = 0;
    let daysPresent = 0;

    weeklyAttendance.forEach(attendance => {
      if (attendance.totalHours > 0) {
        totalHours += attendance.totalHours;
        daysPresent++;
      }
    });

    const avgHoursPerDay = daysPresent > 0 ? totalHours / daysPresent : 0;
    const expectedHours = 40; // 5 days * 8 hours
    const progress = (totalHours / expectedHours) * 100;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      daysPresent,
      avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
      progress: Math.min(Math.round(progress), 100),
      expectedHours
    };
  };

  const weeklySummary = calculateWeeklySummary();

  // Navigation functions
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - currentDay);
    sunday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(sunday);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && user === null) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  // Fetch team data and weekly attendance
  useEffect(() => {
    if (user) {
      fetchWeeklyAttendance();
      fetchTeamMembers();
    }
  }, [user, currentWeekStart]); // Re-fetch when week changes

  // Fetch summary when time period changes
  useEffect(() => {
    if (user && activeTab === 'summary') {
      fetchAttendanceSummary(timePeriod);
    }
  }, [timePeriod, activeTab, user]);

  // Update current time every second for live progress bar
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeeklyAttendance = async () => {
    try {
      const startDateStr = currentWeekStart.toISOString().split('T')[0];
      const response = await fetch(`/api/attendance/weekly?startDate=${startDateStr}`);
      if (response.ok) {
        const data = await response.json();
        logger.debug('Weekly attendance data:', data);
        logger.debug('Attendance array:', data.attendance);
        setWeeklyAttendance(data.attendance || []);

        // Calculate summary statistics
        if (data.summary) {
          const totalHours = data.summary.totalHours || 0;
          const daysPresent = data.summary.presentDays || 0;
          const avgHoursPerDay = daysPresent > 0 ? totalHours / daysPresent : 0;
          const expectedHoursPerWeek = 40; // Standard 5-day work week, 8 hours/day
          const weekProgress = (totalHours / expectedHoursPerWeek) * 100;

          setAttendanceSummary({
            totalHours: Math.round(totalHours * 10) / 10,
            daysPresent,
            avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
            weekProgress: Math.min(Math.round(weekProgress), 100),
            period: 'week',
            expectedHours: expectedHoursPerWeek
          });
        }
      }
    } catch (error) {
      logger.error('Failed to fetch weekly attendance', error);
    }
  };

  const fetchAttendanceSummary = async (period: 'week' | 'month' | 'year') => {
    try {
      const response = await fetch(`/api/attendance/summary?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        logger.debug(`${period} attendance summary:`, data);

        if (data.summary) {
          const totalHours = data.summary.totalHours || 0;
          const daysPresent = data.summary.presentDays || 0;
          const avgHoursPerDay = daysPresent > 0 ? totalHours / daysPresent : 0;

          // Calculate expected hours based on period
          let expectedHours = 40; // week
          if (period === 'month') {
            // Approximately 4.33 weeks per month, 5 working days per week
            expectedHours = 173; // ~40 hours * 4.33 weeks
          } else if (period === 'year') {
            // 52 weeks per year
            expectedHours = 2080; // 40 hours * 52 weeks
          }

          const progress = (totalHours / expectedHours) * 100;

          setAttendanceSummary({
            totalHours: Math.round(totalHours * 10) / 10,
            daysPresent,
            avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
            weekProgress: Math.min(Math.round(progress), 100),
            period,
            expectedHours
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to fetch ${period} attendance summary`, error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team/members');
      logger.debug('Team members response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        logger.debug('Team members data:', data);
        setAllEmployees(data.employees || []);
      } else {
        logger.error('Failed to fetch team members', { status: response.status, statusText: response.statusText });
      }
    } catch (error) {
      logger.error('Failed to fetch team members', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Force Password Change Modal */}
      {user.force_password_reset && (
        <ForcePasswordChangeModal
          onPasswordChanged={() => {
            // Refetch user data to get updated force_password_reset flag
            refetch();
          }}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        user={user}
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      {/* Profile Card - Fixed next to sidebar */}
      {!sidebarCollapsed && (
        <div className="hidden lg:flex flex-col fixed left-[224px] top-[120px] bottom-6 w-80 z-20 px-4">
          {/* User Profile Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-4">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-3xl">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </span>
                )}
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="text-lg font-bold text-gray-900">
                {user?.employeeId || 'N/A'} - {user?.name}
              </p>
              <p className="text-sm text-gray-600">{user?.position || user?.role}</p>
            </div>

            <div className="text-center mb-4">
              {!isTimedIn ? (
                <p className="text-red-500 font-medium text-sm">Yet to check-in</p>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-green-600 font-medium text-sm">Working</p>
                </div>
              )}
            </div>

            <div className="text-center mb-4">
              <p className="text-3xl font-mono font-bold text-gray-900">
                {formatTime(workDuration)}
              </p>
            </div>

            {/* Check In/Out Button */}
            {!isTimedIn ? (
              <button
                onClick={handleTimeIn}
                className="w-full py-3 rounded-lg font-medium transition-colors bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
              >
                Check In
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to check out?')) {
                      fetch('/api/attendance/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes: '' })
                      }).then(() => {
                        window.location.reload();
                      });
                    }
                  }}
                  disabled={isOnBreak}
                  className={`w-full py-3 rounded-lg font-medium transition-colors mb-2 shadow-lg ${
                    isOnBreak
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white'
                  }`}
                >
                  Check Out
                </button>

                {/* Start/End Break Button */}
                <button
                  onClick={isOnBreak ? handleEndBreak : () => {
                    fetch('/api/attendance/break/start', {
                      method: 'POST'
                    }).then(() => {
                      window.location.reload();
                    });
                  }}
                  className={`w-full py-3 rounded-lg font-medium transition-colors shadow-lg ${
                    isOnBreak
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
                  }`}
                >
                  {isOnBreak ? 'End Break' : 'Start Break'}
                </button>
              </>
            )}
          </div>

          {/* Team Status Box - Full Height */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">Team Status</h3>
              <p className="text-xs text-gray-500 mt-1">{allEmployees.length} employees</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {allEmployees.length > 0 ? (
                <div className="p-4">
                  <div className="space-y-3">
                    {allEmployees.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className={`w-12 h-12 bg-gradient-to-br ${
                          employee.isBoss
                            ? 'from-purple-500 to-purple-600'
                            : 'from-blue-500 to-blue-600'
                        } rounded-full flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden`}>
                          {employee.avatar ? (
                            <img
                              src={employee.avatar}
                              alt={employee.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold text-base">
                              {getInitials(employee.name)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {employee.name}
                            </p>
                            {employee.isBoss && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                Boss
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{employee.employeeId} • {employee.position}</p>
                          <div className="flex items-center mt-1">
                            <div className={`w-2 h-2 rounded-full mr-2 ${employee.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></div>
                            <p className={`text-xs font-medium ${employee.isOnline ? 'text-green-600' : 'text-red-500'}`}>
                              {employee.isOnline ? 'Working' : 'Not yet signed in'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No employees found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-52'}`}>
        <Header
          user={user}
          onToggleSidebar={toggleSidebar}
        />

        {/* Dashboard Content */}
        <main className="p-6">
          <div className={!sidebarCollapsed ? 'lg:ml-80 lg:pr-4' : ''}>
            {/* Attendance Calendar View */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {/* Tabs */}
              <div className="border-b border-gray-200 px-6 pt-4">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'calendar'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Attendance Calendar
                  </button>
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'summary'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Attendance Summary
                  </button>
                </div>
              </div>

              {/* Calendar Content */}
              <div className="p-6">
                {activeTab === 'calendar' ? (
                  <>
                    {/* Week Navigation Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={goToPreviousWeek}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Previous week"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-semibold text-gray-900">
                            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>

                        <button
                          onClick={goToNextWeek}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Next week"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      <button
                        onClick={goToCurrentWeek}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Today
                      </button>
                    </div>

                    {/* General shift info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        General [<span className="font-medium">12:00 AM - 12:00 AM</span>]
                      </p>
                    </div>

                {/* Week calendar */}
                <div className="space-y-2 relative">
                  {weekDates.map((date) => {
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNumber = date.getDate();
                    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
                    const isSunday = dayOfWeek === 0;
                    const isToday = date.toDateString() === currentTime.toDateString();

                    // Check for saved attendance data for this day
                    const savedAttendance = weeklyAttendance.find(a => {
                      const attDate = new Date(a.date);
                      return attDate.toDateString() === date.toDateString();
                    });

                    // Live calculation based on actual check-in time (only for today while clocked in)
                    const hasLiveAttendance = !isSunday && isToday && isTimedIn && checkInTime;
                    const hasSavedAttendance = savedAttendance && (savedAttendance.checkInTime || savedAttendance.sessions);

                    // Build sessions array for display (includes past sessions + current live session)
                    const displaySessions: Array<{checkIn: Date, checkOut: Date | null, isLive: boolean}> = [];

                    if (hasSavedAttendance) {
                      // Add completed sessions from history
                      const sessions = savedAttendance.sessions || [];
                      if (Array.isArray(sessions)) {
                        sessions.forEach((session: { checkIn: string; checkOut: string }) => {
                          displaySessions.push({
                            checkIn: new Date(session.checkIn),
                            checkOut: new Date(session.checkOut),
                            isLive: false
                          });
                        });
                      }

                      // Add current session (either live or completed)
                      if (savedAttendance.checkInTime) {
                        let currentCheckOut: Date | null = null;
                        if (!hasLiveAttendance && savedAttendance.checkOutTime) {
                          currentCheckOut = new Date(savedAttendance.checkOutTime);
                        }
                        displaySessions.push({
                          checkIn: new Date(savedAttendance.checkInTime),
                          checkOut: currentCheckOut,
                          isLive: Boolean(hasLiveAttendance)
                        });
                      }
                    }

                    const hoursWorked = savedAttendance?.totalHours ?
                      formatTime(Math.floor(savedAttendance.totalHours * 3600)) :
                      (hasLiveAttendance ? formatTime(workDuration) : '00:00:00');

                    const hasAttendance = displaySessions.length > 0;

                    return (
                      <div
                        key={date.toISOString()}
                        className={`flex items-center py-4 border-b border-gray-100 ${
                          isSunday ? 'bg-yellow-50' : ''
                        } ${isToday ? 'bg-blue-50' : ''}`}
                      >
                        <div className="w-16 text-sm font-medium text-gray-700">{dayName}</div>
                        <div className="w-12 text-sm text-gray-600">{dayNumber < 10 ? `0${dayNumber}` : dayNumber}</div>
                        <div className="flex-1 px-2">
                          {isSunday ? (
                            <div className="flex items-center justify-center py-8">
                              <span className="text-yellow-600 text-sm font-medium">Rest Day</span>
                            </div>
                          ) : (
                            <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                              {/* Time grid lines (every 3 hours) */}
                              {[0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((percent) => (
                                <div
                                  key={percent}
                                  className="absolute top-0 bottom-0 w-px bg-gray-200"
                                  style={{ left: `${percent}%` }}
                                />
                              ))}

                              {/* Check-in time labels above bars */}

                              {hasAttendance && displaySessions.map((session, sessionIndex) => {
                                const checkInHour = session.checkIn.getHours() + session.checkIn.getMinutes() / 60;
                                const checkInPercent = (checkInHour / 24) * 100;

                                return (
                                  <div
                                    key={`label-${sessionIndex}`}
                                    className="absolute -top-5 text-xs text-gray-600 font-medium"
                                    style={{ left: `${checkInPercent}%` }}
                                  >
                                    {formatPhilippineTime(session.checkIn)}
                                  </div>
                                );
                              })}

                              {/* Green progress bars - Multiple sessions with gaps (Zoho style) */}
                              {hasAttendance && displaySessions.map((session, sessionIndex) => {
                                const checkInHour = session.checkIn.getHours() + session.checkIn.getMinutes() / 60;
                                const checkInPercent = (checkInHour / 24) * 100;

                                let checkOutHour = checkInHour;
                                if (session.checkOut) {
                                  checkOutHour = session.checkOut.getHours() + session.checkOut.getMinutes() / 60;
                                } else if (session.isLive) {
                                  checkOutHour = currentTime.getHours() + currentTime.getMinutes() / 60;
                                }

                                const durationPercent = ((checkOutHour - checkInHour) / 24) * 100;

                                return (
                                  <div key={sessionIndex}>
                                    <div
                                      className="absolute top-1 bottom-1 bg-gradient-to-r from-green-500 to-green-600 rounded flex items-center justify-between px-2"
                                      style={{
                                        left: `${checkInPercent}%`,
                                        width: `${durationPercent}%`
                                      }}
                                    >
                                      <span className="text-xs font-medium text-white">
                                        {formatPhilippineTime(session.checkIn)}
                                      </span>
                                      {durationPercent > 5 && (
                                        <span className="text-xs font-medium text-white">
                                          {session.checkOut ?
                                            formatPhilippineTime(session.checkOut) :
                                            formatPhilippineTime(currentTime)
                                          }
                                        </span>
                                      )}
                                    </div>
                                    {/* Pulsing dot at the end of progress bar (only for live session) */}
                                    {session.isLive && (
                                      <div
                                        className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-green-400 rounded-full animate-pulse"
                                        style={{
                                          left: `${checkInPercent + durationPercent}%`
                                        }}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="w-24 text-right text-sm font-medium text-gray-900">
                          {hasAttendance ? hoursWorked : '00:00:00'}
                        </div>
                        <div className="w-32 text-right text-xs text-gray-500">
                          Hrs worked
                        </div>
                      </div>
                    );
                  })}

                  {/* Hour tracker labels at bottom */}
                  <div className="flex items-center py-2 border-t-2 border-gray-300 mt-4">
                    <div className="w-16"></div>
                    <div className="w-12"></div>
                    <div className="flex-1 px-2 relative">
                      <div className="flex justify-between text-xs text-gray-500 font-medium">
                        {['12AM', '02AM', '04AM', '06AM', '08AM', '10AM', '01PM', '03PM', '05PM', '07PM', '09PM', '11PM'].map((time) => (
                          <span key={time} className="flex-shrink-0">
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="w-24"></div>
                    <div className="w-32"></div>
                  </div>
                </div>
                  </>
                ) : (
                  /* Attendance Summary View */
                  <div className="space-y-6">
                    {/* Week Navigation Header - Same as Calendar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={goToPreviousWeek}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Previous week"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-semibold text-gray-900">
                            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>

                        <button
                          onClick={goToNextWeek}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Next week"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      <button
                        onClick={goToCurrentWeek}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Today
                      </button>
                    </div>

                    {/* Summary Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Total Hours Card */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-blue-700 mb-2">Total Hours Worked</p>
                        <p className="text-4xl font-bold text-blue-900 mb-1">{weeklySummary.totalHours}h</p>
                        <p className="text-xs text-blue-600">This week</p>
                      </div>

                      {/* Days Present Card */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-green-700 mb-2">Days Present</p>
                        <p className="text-4xl font-bold text-green-900 mb-1">{weeklySummary.daysPresent}<span className="text-2xl text-green-700">/5</span></p>
                        <p className="text-xs text-green-600">Working days</p>
                      </div>

                      {/* Average Hours Card */}
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-purple-700 mb-2">Average Per Day</p>
                        <p className="text-4xl font-bold text-purple-900 mb-1">{weeklySummary.avgHoursPerDay}h</p>
                        <p className="text-xs text-purple-600">Daily average</p>
                      </div>
                    </div>

                    {/* Weekly Target Progress Bar */}
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-orange-800 mb-1">Weekly Target Progress</h3>
                          <p className="text-xs text-orange-600">{weeklySummary.totalHours}h of {weeklySummary.expectedHours}h expected</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-orange-900">{weeklySummary.progress}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-orange-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${weeklySummary.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Daily Breakdown Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                        <h3 className="text-base font-semibold text-gray-800">Daily Breakdown</h3>
                        <p className="text-xs text-gray-600 mt-1">Detailed attendance for the week</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {weekDates.map((date) => {
                              const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                              const dayOfWeek = date.getDay();
                              const isSunday = dayOfWeek === 0;
                              const isToday = date.toDateString() === currentTime.toDateString();

                              const savedAttendance = weeklyAttendance.find(a => {
                                const attDate = new Date(a.date);
                                return attDate.toDateString() === date.toDateString();
                              });

                              const hasAttendance = savedAttendance && (savedAttendance.checkInTime || savedAttendance.sessions);

                              return (
                                <tr key={date.toISOString()} className={`${isToday ? 'bg-blue-50' : ''} ${isSunday ? 'bg-yellow-50' : ''}`}>
                                  <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {dayName}
                                    {isToday && <span className="ml-2 text-xs text-blue-600 font-semibold">(Today)</span>}
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {isSunday ? (
                                      <span className="text-gray-400">Rest Day</span>
                                    ) : hasAttendance && savedAttendance.checkInTime ? (
                                      formatPhilippineTime(savedAttendance.checkInTime)
                                    ) : (
                                      <span className="text-gray-400">--</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {isSunday ? (
                                      <span className="text-gray-400">Rest Day</span>
                                    ) : hasAttendance && savedAttendance.checkOutTime ? (
                                      formatPhilippineTime(savedAttendance.checkOutTime)
                                    ) : hasAttendance && !savedAttendance.checkOutTime && isToday ? (
                                      <span className="text-green-600 font-medium">Working...</span>
                                    ) : (
                                      <span className="text-gray-400">--</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {isSunday ? (
                                      <span className="text-gray-400">--</span>
                                    ) : hasAttendance ? (
                                      <span className="text-blue-600">
                                        {savedAttendance.totalHours
                                          ? `${Math.round(savedAttendance.totalHours * 10) / 10}h`
                                          : (isToday && isTimedIn ? formatTime(workDuration) : '0h')
                                        }
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">0h</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap">
                                    {isSunday ? (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                                        Rest Day
                                      </span>
                                    ) : hasAttendance ? (
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        savedAttendance.status === 'present'
                                          ? 'bg-green-100 text-green-700'
                                          : savedAttendance.status === 'late'
                                          ? 'bg-orange-100 text-orange-700'
                                          : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {savedAttendance.status === 'present' ? 'Present' : savedAttendance.status === 'late' ? 'Late' : 'On Duty'}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                        Absent
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Break Modal */}
      {isOnBreak && breakStartTime && (
        <BreakModal
          isOpen={isOnBreak}
          breakStartTime={breakStartTime}
          onEndBreak={handleEndBreak}
        />
      )}
    </div>
  );
}
