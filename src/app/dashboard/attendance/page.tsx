'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { AttendanceRecord as ServiceAttendanceRecord } from '@/lib/attendance';
import { Task } from '@/types/attendance';

interface WeeklyAttendanceData {
  date: string;
  day: string;
  checkInTime?: string;
  checkOutTime?: string;
  breakDuration?: number;
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'on_duty';
  workLocation?: string;
  notes?: string;
  isWeekend?: boolean;
}

interface AttendanceSummaryData {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  totalHours: number;
}

export default function AttendancePage() {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'regularization'>('summary');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<ServiceAttendanceRecord | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState<WeeklyAttendanceData[]>([]);
  const [summary, setSummary] = useState<AttendanceSummaryData>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    totalHours: 0
  });

  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
      fetchWeeklyAttendance();
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Refetch weekly data when week selection changes
  useEffect(() => {
    if (user && selectedWeek) {
      fetchWeeklyAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, user]);

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

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const fetchWeeklyAttendance = async () => {
    try {
      const startDate = getWeekStartDate(selectedWeek);
      const response = await fetch(`/api/attendance/weekly?startDate=${startDate}`);
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match our interface
        const transformedAttendance = data.weeklyAttendance.map((record: {
          date: string;
          checkInTime?: string;
          checkOutTime?: string;
          breakDuration?: number;
          totalHours: number;
          status: 'present' | 'absent' | 'late' | 'on_duty';
          workLocation?: string;
          notes?: string;
        }) => ({
          date: record.date,
          day: new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' }),
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          breakDuration: record.breakDuration || 0,
          totalHours: record.totalHours || 0,
          status: record.status,
          workLocation: record.workLocation,
          notes: record.notes,
          isWeekend: [0, 6].includes(new Date(record.date).getDay())
        }));
        setWeeklyAttendance(transformedAttendance);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch weekly attendance:', error);
    }
  };

  const getWeekStartDate = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const getWeekEndDate = (date: Date): string => {
    const startDate = new Date(getWeekStartDate(date));
    startDate.setDate(startDate.getDate() + 6);
    return startDate.toISOString().split('T')[0];
  };

  const formatWeekRange = (date: Date): string => {
    const start = new Date(getWeekStartDate(date));
    const end = new Date(getWeekEndDate(date));

    const formatDate = (d: Date) => d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate);
  };

  const getWorkLocationFromRecord = (workLocation?: string): string => {
    // Handle all possible cases for work location
    if (workLocation === 'WFH' || workLocation === 'Onsite') {
      return workLocation;
    }
    // Default to WFH if not set
    return 'WFH';
  };

  const formatTime = (seconds: number) => {
    const safeSeconds = seconds || 0;
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTasksForDate = (date: string): string => {
    // For today's tasks, show in-progress and pending tasks
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      const relevantTasks = tasks.filter(task => 
        task.status === 'in_progress' || task.status === 'pending'
      );
      if (relevantTasks.length > 0) {
        return relevantTasks.map((task, index) => {
          let taskText = `${index + 1}. ${task.title}`;
          if (task.description) {
            // Split description by line breaks and format as subtasks
            const subtasks = task.description.split('\n').filter(line => line.trim());
            const formattedSubtasks = subtasks.map(subtask => `   • ${subtask.trim()}`).join('\n');
            taskText += `\n${formattedSubtasks}`;
          }
          return taskText;
        }).join('\n\n');
      }
    }
    
    // For past dates, show completed tasks
    const completedTasks = tasks.filter(task => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return completedDate.toISOString().split('T')[0] === date;
    });
    
    if (completedTasks.length > 0) {
      return completedTasks.map((task, index) => {
        let taskText = `${index + 1}. ${task.title}`;
        if (task.description) {
          // Split description by line breaks and format as subtasks
          const subtasks = task.description.split('\n').filter(line => line.trim());
          const formattedSubtasks = subtasks.map(subtask => `   • ${subtask.trim()}`).join('\n');
          taskText += `\n${formattedSubtasks}`;
        }
        return taskText;
      }).join('\n\n');
    }
    
    return 'Daily development tasks and project work';
  };


  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
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
          {/* Employee Info Header */}
          <div className="bg-white rounded-lg border border-gray-300 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-900">Name:</span>
                <span className="ml-2 text-gray-800">{user?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">Position:</span>
                <span className="ml-2 text-gray-800">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">Department:</span>
                <span className="ml-2 text-gray-800">{user?.department || 'N/A'}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
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
                {/* Current Status Card - Data Only */}
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
                          {todayAttendance?.status ? todayAttendance.status.charAt(0).toUpperCase() + todayAttendance.status.slice(1) : 'No attendance record'}
                        </h3>
                        <p className="text-xs text-gray-800 mt-1">
                          {todayAttendance?.checkInTime
                            ? `Checked in at ${new Date(todayAttendance.checkInTime).toLocaleTimeString()}`
                            : 'No check-in time'
                          }
                        </p>
                        {todayAttendance?.checkOutTime && (
                          <p className="text-xs text-gray-800 mt-1">
                            {`Checked out at ${new Date(todayAttendance.checkOutTime).toLocaleTimeString()}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        {todayAttendance?.totalHours && (
                          <div className="text-sm text-gray-800">
                            <span className="text-blue-500 font-medium">
                              {todayAttendance.totalHours.toFixed(2)}h worked
                            </span>
                          </div>
                        )}
                        {todayAttendance?.breakDuration && (
                          <div className="text-sm text-orange-600 font-medium">
                            Break: {formatTime(todayAttendance.breakDuration)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => navigateWeek('prev')}
                      className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-md"
                      title="Previous week"
                    >
                      <ChevronLeftIcon />
                    </button>
                    <span className="text-lg font-medium text-gray-900 min-w-[240px] text-center">
                      {formatWeekRange(selectedWeek)}
                    </span>
                    <button
                      onClick={() => navigateWeek('next')}
                      className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-md"
                      title="Next week"
                    >
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

                {/* Attendance Timesheet Table */}
                <div className="bg-white border border-gray-300 rounded-lg overflow-hidden mb-6">
                  {/* Table Header */}
                  <div className="bg-gray-100 border-b border-gray-300">
                    <div className="grid grid-cols-8 divide-x divide-gray-300 text-xs font-semibold text-gray-900 text-center">
                      <div className="p-3 border-r border-gray-300">DATE</div>
                      <div className="p-3 border-r border-gray-300">SITE SCHEDULE</div>
                      <div className="p-3 border-r border-gray-300">TIME IN</div>
                      <div className="p-3 border-r border-gray-300">BREAK</div>
                      <div className="p-3 border-r border-gray-300">TIME OUT</div>
                      <div className="p-3 border-r border-gray-300">OVERTIME</div>
                      <div className="p-3 border-r border-gray-300">TASK / PURPOSE</div>
                      <div className="p-3">REMARKS</div>
                    </div>
                  </div>

                  {/* Table Rows */}
                  {weeklyAttendance.map((day, index) => (
                    <div 
                      key={day.date} 
                      className="grid grid-cols-8 divide-x divide-gray-300 border-b border-gray-300 min-h-[100px]"
                    >
                      {/* Date Column */}
                      <div className="p-3 flex items-center justify-center border-r border-gray-300">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">{day.date}</div>
                          <div className="text-xs text-gray-800">{day.day}</div>
                        </div>
                      </div>

                      {/* Site Schedule Column */}
                      <div className="p-3 flex items-center justify-center border-r border-gray-300">
                        <div className="text-center">
                          {/* Show work location if there's attendance data, regardless of weekend */}
                          {day.checkInTime || day.workLocation ? (
                            <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                              getWorkLocationFromRecord(day.workLocation) === 'WFH'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {getWorkLocationFromRecord(day.workLocation)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </div>

                      {/* TIME IN Column */}
                      <div className="p-3 flex items-center justify-center border-r border-gray-300">
                        <span className="text-sm text-gray-900">
                          {day.checkInTime ? new Date(day.checkInTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      {/* BREAK Column */}
                      <div className="p-3 flex items-center justify-center border-r border-gray-300">
                        <span className="text-sm text-gray-900">
                          {day.breakDuration ? formatTime(day.breakDuration) : '-'}
                        </span>
                      </div>

                      {/* TIME OUT Column */}
                      <div className="p-3 flex items-center justify-center border-r border-gray-300">
                        <span className="text-sm text-gray-900">
                          {day.checkOutTime ? new Date(day.checkOutTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      {/* OVERTIME Column */}
                      <div className="p-3 flex items-center justify-center border-r border-gray-300">
                        <span className="text-sm text-gray-900">-</span>
                      </div>

                      {/* Task/Purpose Column */}
                      <div className="p-3 border-r border-gray-300">
                        <div className="text-xs text-gray-900 whitespace-pre-wrap">
                          {getTasksForDate(day.date)}
                        </div>
                      </div>

                      {/* Remarks Column */}
                      <div className="p-3">
                        <div className="text-xs text-gray-900">
                        </div>
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
                      Week Summary
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