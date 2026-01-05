'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BreakModal from '@/components/BreakModal';
import ForcePasswordChangeModal from '@/components/ForcePasswordChangeModal';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/contexts/AttendanceContext';
import { logger } from '@/lib/logger';
import { formatPhilippineTime } from '@/lib/timezone';
import { simpleWhatsAppService } from '@/lib/whatsapp-simple';

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

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  subTasks?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading, logout, refetch } = useAuth();
  const { isTimedIn, isOnBreak, workDuration, breakStartTime, checkInTime, handleTimeIn, handleTimeOut, handleStartBreak, handleEndBreak } = useAttendance();
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

  // Check-in modal state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInTasks, setCheckInTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'blocked' | 'archived'
  });

  // Check-out modal state
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkOutTasks, setCheckOutTasks] = useState<Task[]>([]);
  const [isLoadingCheckOutTasks, setIsLoadingCheckOutTasks] = useState(false);

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

  // Fetch today's tasks for check-in modal
  const fetchCheckInTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        // Filter for today's active/pending tasks
        const today = new Date().toISOString().split('T')[0];
        const todaysTasks = (data.tasks || []).filter((task: Task) =>
          task.status !== 'archived' &&
          task.status !== 'completed' &&
          (!task.due_date || task.due_date.startsWith(today))
        );
        setCheckInTasks(todaysTasks);
      }
    } catch (error) {
      logger.error('Failed to fetch check-in tasks', error);
      setCheckInTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Open check-in modal and fetch tasks
  const handleOpenCheckInModal = () => {
    setShowCheckInModal(true);
    setShowAddTaskForm(false);
    setNewTask({ title: '', description: '', priority: 'medium', status: 'pending' });
    fetchCheckInTasks();
  };

  // Create new task
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title.trim(),
          description: newTask.description?.trim() || '',
          priority: newTask.priority,
          status: newTask.status,
          due_date: new Date().toISOString().split('T')[0],
          subTasks: []
        }),
      });

      if (response.ok) {
        // Refresh task list
        await fetchCheckInTasks();
        // Reset form
        setNewTask({ title: '', description: '', priority: 'medium', status: 'pending' });
        setShowAddTaskForm(false);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create task');
      }
    } catch (error) {
      logger.error('Failed to create task', error);
      alert('Failed to create task');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh task list
        await fetchCheckInTasks();
      } else {
        alert('Failed to delete task');
      }
    } catch (error) {
      logger.error('Failed to delete task', error);
      alert('Failed to delete task');
    }
  };

  // Send report to WhatsApp and complete check-in
  const handleSendReportAndCheckIn = async () => {
    try {
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      const formattedDate = now.toLocaleDateString('en-US', dateOptions);

      // Format check-in time
      const checkInTimeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Format tasks section
      const tasksSection = checkInTasks.length > 0
        ? checkInTasks.map((task, index) => {
            let taskText = `${index + 1}. ${task.title}`;
            if (task.description?.trim()) {
              taskText += `\n   ${task.description.trim()}`;
            }
            taskText += ` [${task.status}]`;
            return taskText;
          }).join('\n\n')
        : 'No tasks planned for today';

      const report = `GoWater Start of Day Report

Date: ${formattedDate}
Employee: ${user?.employeeName || user?.name}
Position: ${user?.position || user?.role}
Check-in Time: ${checkInTimeFormatted}
Check-out Time: N/A
Hours Worked: 0.00 hours

Today's Planned Tasks:
${tasksSection}`;

      // Send to WhatsApp
      await simpleWhatsAppService.sendReport(report);

      // Small delay to ensure WhatsApp window opens
      await new Promise(resolve => setTimeout(resolve, 500));

      // Complete check-in
      await handleTimeIn();

      // Close modal
      setShowCheckInModal(false);

      logger.info('Check-in report sent and user checked in successfully');
    } catch (error) {
      logger.error('Failed to send check-in report', error);
      alert('Failed to send report. Please try again.');
    }
  };

  // Fetch today's tasks for check-out modal
  const fetchCheckOutTasks = async () => {
    setIsLoadingCheckOutTasks(true);
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        // Get all of today's tasks (including completed) to show status updates
        const today = new Date().toISOString().split('T')[0];
        const todaysTasks = (data.tasks || []).filter((task: Task) =>
          task.status !== 'archived' &&
          (!task.due_date || task.due_date.startsWith(today))
        );
        setCheckOutTasks(todaysTasks);
      }
    } catch (error) {
      logger.error('Failed to fetch check-out tasks', error);
      setCheckOutTasks([]);
    } finally {
      setIsLoadingCheckOutTasks(false);
    }
  };

  // Open check-out modal and fetch tasks
  const handleOpenCheckOutModal = () => {
    setShowCheckOutModal(true);
    fetchCheckOutTasks();
  };

  // Update task status
  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          status: newStatus
        }),
      });

      if (response.ok) {
        // Update local state
        setCheckOutTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
      } else {
        alert('Failed to update task status');
      }
    } catch (error) {
      logger.error('Failed to update task status', error);
      alert('Failed to update task status');
    }
  };

  // Send end-of-day report and check out
  const handleSendReportAndCheckOut = async () => {
    try {
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      const formattedDate = now.toLocaleDateString('en-US', dateOptions);

      // Format check-in and check-out times
      const checkInTimeFormatted = checkInTime
        ? new Date(checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : 'N/A';
      const checkOutTimeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Calculate hours worked
      const hoursWorked = (workDuration / 3600).toFixed(2);

      // Format tasks section (matching check-in format)
      const tasksSection = checkOutTasks.length > 0
        ? checkOutTasks.map((task, index) => {
            let taskText = `${index + 1}. ${task.title}`;
            if (task.description?.trim()) {
              taskText += `\n   ${task.description.trim()}`;
            }
            taskText += ` [${task.status}]`;
            return taskText;
          }).join('\n\n')
        : 'No tasks worked on today';

      const report = `GoWater End of Day Report

Date: ${formattedDate}
Employee: ${user?.employeeName || user?.name}
Position: ${user?.position || user?.role}
Check-in Time: ${checkInTimeFormatted}
Check-out Time: ${checkOutTimeFormatted}
Hours Worked: ${hoursWorked} hours

Today's Task Updates:
${tasksSection}`;

      // Send to WhatsApp
      await simpleWhatsAppService.sendReport(report);

      // Small delay to ensure WhatsApp window opens
      await new Promise(resolve => setTimeout(resolve, 500));

      // Complete check-out
      await handleTimeOut();

      // Close modal
      setShowCheckOutModal(false);

      logger.info('Check-out report sent and user checked out successfully');
    } catch (error) {
      logger.error('Failed to send check-out report', error);
      alert('Failed to send report. Please try again.');
    }
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

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Force Password Change Modal */}
      {user.force_password_reset && (
        <ForcePasswordChangeModal
          onPasswordChanged={() => {
            // Refetch user data to get updated force_password_reset flag
            refetch();
          }}
        />
      )}

      {/* Dashboard Content */}
      <div className="h-full flex flex-col">
          {/* Attendance Controls */}
          <div className="px-6 py-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {!isTimedIn ? (
                  <button
                    onClick={handleOpenCheckInModal}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                    style={{ fontFamily: 'var(--font-geist-sans)' }}
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Check In</span>
                    </div>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleOpenCheckOutModal}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                      style={{ fontFamily: 'var(--font-geist-sans)' }}
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Check Out</span>
                      </div>
                    </button>

                    {!isOnBreak && (
                      <button
                        onClick={handleStartBreak}
                        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-wider rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                        style={{ fontFamily: 'var(--font-geist-sans)' }}
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Start Break</span>
                        </div>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Work Duration Display */}
              {isTimedIn && (
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2 text-gray-700">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                      Work Duration:
                    </span>
                    <span className="text-2xl font-bold text-blue-600 tabular-nums" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                      {formatTime(workDuration)}
                    </span>
                  </div>
                  {checkInTime && (
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">Checked in at:</span>{' '}
                      <span className="font-bold text-gray-900">
                        {new Date(checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Attendance Calendar View */}
            <div className="flex-1 flex flex-col">
              {/* Tabs */}
              <div className="relative border-b border-gray-200 px-6 py-4 bg-white">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className={`pb-3 px-1 border-b-2 font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                      activeTab === 'calendar'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-blue-600'
                    }`}
                    style={{ fontFamily: 'var(--font-geist-sans)' }}
                  >
                    Attendance Calendar
                  </button>
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`pb-3 px-1 border-b-2 font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                      activeTab === 'summary'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-blue-600'
                    }`}
                    style={{ fontFamily: 'var(--font-geist-sans)' }}
                  >
                    Attendance Summary
                  </button>
                </div>
              </div>

              {/* Calendar Content */}
              <div className="relative px-6 py-4 flex-1 bg-white overflow-y-auto flex flex-col">
                {activeTab === 'calendar' ? (
                  <>
                    {/* Week Navigation Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={goToPreviousWeek}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600"
                          title="Previous week"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-bold text-gray-900 uppercase tracking-wider" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>

                        <button
                          onClick={goToNextWeek}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600"
                          title="Next week"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      <button
                        onClick={goToCurrentWeek}
                        className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 hover:border-blue-700 rounded-lg transition-all duration-300"
                        style={{ fontFamily: 'var(--font-geist-sans)' }}
                      >
                        Today
                      </button>
                    </div>

                    {/* General shift info */}
                    <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-700 font-semibold" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                        General [<span className="font-bold text-blue-600">12:00 AM - 12:00 AM</span>]
                      </p>
                    </div>

                {/* Week calendar */}
                <div className="flex-1 flex flex-col gap-2 relative overflow-y-auto">
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
                        className={`flex-1 flex items-center py-3 border-b border-gray-200 ${
                          isSunday ? 'bg-gray-50' : ''
                        } ${isToday ? 'bg-blue-50' : ''}`}
                      >
                        <div className="w-12 sm:w-16 text-sm font-medium text-gray-900">{dayName}</div>
                        <div className="w-10 sm:w-12 text-sm text-gray-600">{dayNumber < 10 ? `0${dayNumber}` : dayNumber}</div>
                        <div className="flex-1 px-2">
                          {isSunday ? (
                            <div className="flex items-center justify-center py-8">
                              <span className="text-gray-500 text-sm font-medium">Rest Day</span>
                            </div>
                          ) : (
                            <div className="relative h-10 border border-gray-300 rounded-lg overflow-hidden bg-white">
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
                                      className="absolute top-1 bottom-1 bg-gradient-to-r from-green-500 to-green-400 rounded flex items-center justify-between px-2"
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
                        <div className="w-20 sm:w-24 text-right text-sm font-medium text-gray-900">
                          {hasAttendance ? hoursWorked : '00:00:00'}
                        </div>
                        <div className="hidden sm:block w-32 text-right text-xs text-gray-500">
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
                      <div className="rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-p3-cyan rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Total Hours Worked</p>
                        <p className="text-4xl font-bold text-gray-900 mb-1">{weeklySummary.totalHours}h</p>
                        <p className="text-xs text-gray-500">This week</p>
                      </div>

                      {/* Days Present Card */}
                      <div className="rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-p3-cyan rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Days Present</p>
                        <p className="text-4xl font-bold text-gray-900 mb-1">{weeklySummary.daysPresent}<span className="text-2xl text-gray-600">/5</span></p>
                        <p className="text-xs text-gray-500">Working days</p>
                      </div>

                      {/* Average Hours Card */}
                      <div className="rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-p3-cyan rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Average Per Day</p>
                        <p className="text-4xl font-bold text-gray-900 mb-1">{weeklySummary.avgHoursPerDay}h</p>
                        <p className="text-xs text-gray-500">Daily average</p>
                      </div>
                    </div>

                    {/* Weekly Target Progress Bar */}
                    <div className="rounded-xl p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 mb-1">Weekly Target Progress</h3>
                          <p className="text-xs text-gray-600">{weeklySummary.totalHours}h of {weeklySummary.expectedHours}h expected</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-blue-600">{weeklySummary.progress}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-cyan-500 h-3 rounded-full shadow-lg shadow-cyan-400/30 transition-all duration-500"
                          style={{ width: `${weeklySummary.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Daily Breakdown Table */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-base font-semibold text-gray-800">Daily Breakdown</h3>
                        <p className="text-xs text-gray-600 mt-1">Detailed attendance for the week</p>
                      </div>
                      <div className="overflow-x-auto -mx-6 sm:mx-0">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                              <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                              <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                              <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                              <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
                                <tr key={date.toISOString()} className={`${isToday ? 'bg-blue-50' : ''} ${isSunday ? 'bg-gray-50' : ''}`}>
                                  <td className="px-3 sm:px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {dayName}
                                    {isToday && <span className="ml-2 text-xs text-blue-600 font-semibold">(Today)</span>}
                                  </td>
                                  <td className="px-3 sm:px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </td>
                                  <td className="px-3 sm:px-5 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {isSunday ? (
                                      <span className="text-gray-400">Rest Day</span>
                                    ) : hasAttendance && savedAttendance.checkInTime ? (
                                      formatPhilippineTime(savedAttendance.checkInTime)
                                    ) : (
                                      <span className="text-gray-400">--</span>
                                    )}
                                  </td>
                                  <td className="px-3 sm:px-5 py-4 whitespace-nowrap text-sm text-gray-900">
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
                                  <td className="px-3 sm:px-5 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                    {isSunday ? (
                                      <span className="text-gray-400 font-normal">--</span>
                                    ) : hasAttendance ? (
                                      <span>
                                        {savedAttendance.totalHours
                                          ? `${Math.round(savedAttendance.totalHours * 10) / 10}h`
                                          : (isToday && isTimedIn ? formatTime(workDuration) : '0h')
                                        }
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 font-normal">0h</span>
                                    )}
                                  </td>
                                  <td className="px-3 sm:px-5 py-4 whitespace-nowrap">
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

      {/* Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700">
              <h2 className="text-2xl font-bold text-white">Start of Day Check-In</h2>
              <p className="text-green-50 text-sm mt-1">Review your tasks and send report to begin your day</p>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoadingTasks ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Tasks</h3>
                      <button
                        onClick={() => setShowAddTaskForm(!showAddTaskForm)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Task</span>
                      </button>
                    </div>

                    {/* Add Task Form */}
                    {showAddTaskForm && (
                      <div className="mb-4 p-4 border-2 border-green-200 rounded-lg bg-green-50">
                        <h4 className="font-semibold text-gray-900 mb-3">Create New Task</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                            <input
                              type="text"
                              value={newTask.title}
                              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Enter task title..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                              value={newTask.description}
                              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              rows={2}
                              placeholder="Add task description..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                              <select
                                value={newTask.priority}
                                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                              <select
                                value={newTask.status}
                                onChange={(e) => setNewTask({ ...newTask, status: e.target.value as 'pending' | 'in_progress' | 'completed' | 'blocked' | 'archived' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="blocked">Blocked</option>
                                <option value="archived">Archived</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleCreateTask}
                              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                            >
                              Create Task
                            </button>
                            <button
                              onClick={() => {
                                setShowAddTaskForm(false);
                                setNewTask({ title: '', description: '', priority: 'medium', status: 'pending' });
                              }}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {checkInTasks.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800">No tasks for today</h4>
                            <p className="text-sm text-yellow-700 mt-1">You can still check in, but consider adding tasks to track your progress.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {checkInTasks.map((task, index) => (
                          <div key={task.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="flex items-start">
                              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{task.title}</h4>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    task.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {task.status.replace('_', ' ').toUpperCase()}
                                  </span>
                                  {task.priority && (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                      task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {task.priority.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="flex-shrink-0 ml-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete task"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">What happens next?</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          When you click &quot;Send Report & Check In&quot;, a WhatsApp message with your start-of-day report will be prepared.
                          After sending, you&apos;ll be automatically checked in.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowCheckInModal(false)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReportAndCheckIn}
                disabled={isLoadingTasks}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>Send Report & Check In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Out Modal */}
      {showCheckOutModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700">
              <h2 className="text-2xl font-bold text-white">End of Day Check-Out</h2>
              <p className="text-red-50 text-sm mt-1">Update task statuses and send report to end your day</p>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoadingCheckOutTasks ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
              ) : (
                <>
                  {/* Hours Worked Display */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Hours Worked Today</h3>
                        <p className="text-3xl font-bold text-blue-600 mt-1">{(workDuration / 3600).toFixed(2)} hrs</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Check-in: {checkInTime ? new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                        <p className="text-sm text-gray-600">Check-out: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Task Updates</h3>
                      <div className="text-sm text-gray-500">
                        {checkOutTasks.filter(t => t.status === 'completed').length} / {checkOutTasks.length} completed
                      </div>
                    </div>

                    {checkOutTasks.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800">No tasks for today</h4>
                            <p className="text-sm text-yellow-700 mt-1">You can still check out and send your end-of-day report.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {checkOutTasks.map((task, index) => (
                          <div key={task.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="flex items-start">
                              <span className="flex-shrink-0 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{task.title}</h4>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  {task.priority && (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      task.priority === 'urgent' ? 'bg-purple-100 text-purple-800' :
                                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                      task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {task.priority.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-shrink-0 ml-3">
                                <select
                                  value={task.status}
                                  onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                                  className={`px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                    task.status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
                                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                    task.status === 'blocked' ? 'bg-red-100 text-red-800 border-red-300' :
                                    'bg-gray-100 text-gray-800 border-gray-300'
                                  }`}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                  <option value="blocked">Blocked</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">What happens next?</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          When you click &quot;Send Report & Check Out&quot;, a WhatsApp message with your end-of-day report including task updates and hours worked will be prepared.
                          After sending, you&apos;ll be automatically checked out.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowCheckOutModal(false)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReportAndCheckOut}
                disabled={isLoadingCheckOutTasks}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>Send Report & Check Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Break Modal */}
      {isOnBreak && breakStartTime && (
        <BreakModal
          isOpen={isOnBreak}
          breakStartTime={breakStartTime}
          onEndBreak={handleEndBreak}
        />
      )}
    </>
  );
}
