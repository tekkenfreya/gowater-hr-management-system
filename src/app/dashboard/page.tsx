'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/contexts/AttendanceContext';
import { logger } from '@/lib/logger';

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
  const { user, isLoading, logout } = useAuth();
  const { isTimedIn, workDuration, checkInTime, handleTimeIn } = useAttendance();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Team members state
  const [allEmployees, setAllEmployees] = useState<TeamMember[]>([]);

  // Attendance calendar state
  const [selectedWeek] = useState(new Date());
  const [weeklyAttendance, setWeeklyAttendance] = useState<WeeklyAttendanceData[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'regularization'>('summary');

  // Get current week's dates (Sunday to Saturday)
  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const sunday = new Date(today);

    // Calculate days to subtract to get to Sunday
    sunday.setDate(today.getDate() - currentDay);

    const weekDates = [];
    for (let i = 0; i < 7; i++) { // Sunday to Saturday
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getWeekDates();

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
  }, [user]);

  // Update current time every second for live progress bar
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeeklyAttendance = async () => {
    try {
      const response = await fetch('/api/attendance/weekly');
      if (response.ok) {
        const data = await response.json();
        logger.debug('Weekly attendance data:', data);
        logger.debug('Attendance array:', data.attendance);
        setWeeklyAttendance(data.attendance || []);
      }
    } catch (error) {
      logger.error('Failed to fetch weekly attendance', error);
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
                className="w-full py-3 rounded-lg font-medium transition-colors bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg"
              >
                Check Out
              </button>
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
          onLogout={logout}
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
                    onClick={() => setActiveTab('summary')}
                    className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'summary'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Attendance Summary
                  </button>
                  <button
                    onClick={() => setActiveTab('regularization')}
                    className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'regularization'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Regularization
                  </button>
                </div>
              </div>

              {/* Calendar Content */}
              <div className="p-6">
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
                                    {session.checkIn.toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
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
                                        {session.checkIn.toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </span>
                                      {durationPercent > 5 && (
                                        <span className="text-xs font-medium text-white">
                                          {session.checkOut ?
                                            session.checkOut.toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: true
                                            }) :
                                            currentTime.toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: true
                                            })
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
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
