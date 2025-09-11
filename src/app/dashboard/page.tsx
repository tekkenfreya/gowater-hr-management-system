'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Task } from '@/types/attendance';
import { simpleWhatsAppService } from '@/lib/whatsapp-simple';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  // Layout state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Tasks state (database-driven)
  const [tasks, setTasks] = useState<Task[]>([]);

  const [showAddTask, setShowAddTask] = useState(false);
  const [showTimeOutConfirm, setShowTimeOutConfirm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  // Attendance system
  const [isTimedIn, setIsTimedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [timeInTime, setTimeInTime] = useState<Date | null>(null);
  const [timeOutTime, setTimeOutTime] = useState<Date | null>(null);
  const [workDuration, setWorkDuration] = useState(0); // in seconds
  const [breakDuration, setBreakDuration] = useState(0); // in seconds
  const [workInterval, setWorkInterval] = useState<NodeJS.Timeout | null>(null);
  const [breakInterval, setBreakInterval] = useState<NodeJS.Timeout | null>(null);
  const [breakRecords, setBreakRecords] = useState<{ startTime: Date, endTime?: Date, duration: number }[]>([]);


  // Timer intervals
  const [timerIntervals, setTimerIntervals] = useState<{ [key: string]: NodeJS.Timeout }>({});

  // Redirect to login if not authenticated (but not while loading)
  useEffect(() => {
    if (!isLoading && user === null) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  // Fetch tasks when user is available
  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchTodayAttendance();
    }
  }, [user]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (workInterval) clearInterval(workInterval);
      if (breakInterval) clearInterval(breakInterval);
    };
  }, [workInterval, breakInterval]);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched tasks:', data.tasks);
        setTasks(data.tasks || []);
      } else {
        console.error('Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await fetch('/api/attendance');
      if (response.ok) {
        const data = await response.json();
        const attendance = data.attendance;
        
        if (attendance && attendance.checkInTime && !attendance.checkOutTime) {
          // User is already checked in today
          setIsTimedIn(true);
          setTimeInTime(new Date(attendance.checkInTime));
          setTimeOutTime(null);
          
          // Calculate work duration from check-in time
          const checkInTime = new Date(attendance.checkInTime);
          const currentTime = new Date();
          const durationInSeconds = Math.floor((currentTime.getTime() - checkInTime.getTime()) / 1000);
          setWorkDuration(durationInSeconds);
          
          // Start work duration timer to continue tracking
          const interval = setInterval(() => {
            setWorkDuration(prev => prev + 1);
          }, 1000);
          setWorkInterval(interval);
        } else if (attendance && attendance.checkOutTime) {
          // User has completed today's shift
          setIsTimedIn(false);
          setTimeInTime(new Date(attendance.checkInTime));
          setTimeOutTime(new Date(attendance.checkOutTime));
          
          // Calculate total work duration
          const checkInTime = new Date(attendance.checkInTime);
          const checkOutTime = new Date(attendance.checkOutTime);
          const durationInSeconds = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 1000);
          setWorkDuration(durationInSeconds);
        } else {
          // No attendance record today
          setIsTimedIn(false);
          setTimeInTime(null);
          setTimeOutTime(null);
          setWorkDuration(0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch today\'s attendance:', error);
    }
  };

  // Attendance functions
  const timeIn = async () => {
    try {
      // Call attendance API to check in
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkin',
          notes: 'Dashboard check-in'
        }),
      });

      if (response.ok) {
        const now = new Date();
        setIsTimedIn(true);
        setTimeInTime(now);
        setTimeOutTime(null);
        setWorkDuration(0);

        // Update all pending tasks to "in-progress" in database
        const pendingTasks = tasks.filter(t => t.status === 'pending');
        for (const task of pendingTasks) {
          await updateTaskStatus(task.id, 'in_progress');
        }

        // Start work duration timer
        const interval = setInterval(() => {
          setWorkDuration(prev => prev + 1);
        }, 1000);
        setWorkInterval(interval);
      } else {
        const data = await response.json();
        alert(`Check-in failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      alert('Check-in failed. Please try again.');
    }
  };

  const requestTimeOut = () => {
    // Show confirmation popup
    setShowTimeOutConfirm(true);
  };

  const confirmTimeOut = async () => {
    try {
      // Call attendance API to check out
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkout',
          notes: 'Dashboard check-out'
        }),
      });

      if (response.ok) {
        const now = new Date();
        setIsTimedIn(false);
        setIsOnBreak(false);
        setTimeOutTime(now);
        setShowTimeOutConfirm(false);

        // Stop work duration timer
        if (workInterval) {
          clearInterval(workInterval);
          setWorkInterval(null);
        }

        // Stop break timer if running
        if (breakInterval) {
          clearInterval(breakInterval);
          setBreakInterval(null);
        }

        const data = await response.json();
        if (data.totalHours) {
          alert(`Successfully checked out. Total work hours: ${data.totalHours.toFixed(2)}`);
        }
      } else {
        const data = await response.json();
        alert(`Check-out failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Check-out error:', error);
      alert('Check-out failed. Please try again.');
    }
  };

  const cancelTimeOut = () => {
    setShowTimeOutConfirm(false);
  };

  const startBreak = () => {
    const now = new Date();
    setIsOnBreak(true);

    // Add new break record
    const newBreakRecord = {
      startTime: now,
      duration: 0
    };
    setBreakRecords(prev => [...prev, newBreakRecord]);

    // Stop work timer
    if (workInterval) {
      clearInterval(workInterval);
      setWorkInterval(null);
    }

    // Start break timer
    const interval = setInterval(() => {
      setBreakDuration(prev => prev + 1);
      // Update the current break record duration
      setBreakRecords(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].duration += 1;
        }
        return updated;
      });
    }, 1000);
    setBreakInterval(interval);
  };

  const endBreak = () => {
    setIsOnBreak(false);

    // Complete the current break record
    const now = new Date();
    setBreakRecords(prev => {
      const updated = [...prev];
      if (updated.length > 0 && !updated[updated.length - 1].endTime) {
        updated[updated.length - 1].endTime = now;
      }
      return updated;
    });

    // Stop break timer
    if (breakInterval) {
      clearInterval(breakInterval);
      setBreakInterval(null);
    }

    // Resume work timer
    const interval = setInterval(() => {
      setWorkDuration(prev => prev + 1);
    }, 1000);
    setWorkInterval(interval);
  };

  // Check if user can time out (encourage task status updates)
  const canTimeOut = () => {
    // Must have tasks to time out
    if (tasks.length === 0) return false;

    // Can always time out, but encourage users to update task statuses
    // This is more flexible - some tasks might be left as pending for next day
    return true;
  };

  // Get warning message for time out
  const getTimeOutWarning = () => {
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    if (pendingTasks > 0) {
      return `You have ${pendingTasks} pending task(s). Consider updating their status before timing out.`;
    }
    return 'End your work day';
  };

  // Send Start Report to WhatsApp
  const sendStartReport = async () => {

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const timeInStr = timeInTime ? timeInTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) : new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Create task list for start of work
    const taskList = tasks.map((task, index) => {
      let taskText = `${index + 1}. ${task.title}`;
      if (task.description) {
        // Split description by line breaks and format as subtasks
        const subtasks = task.description.split('\n').filter(line => line.trim());
        const formattedSubtasks = subtasks.map(subtask => `   • ${subtask.trim()}`).join('\n');
        taskText += `\n${formattedSubtasks}`;
      }
      return taskText;
    });

    // Get employee name and role from user profile
    const employeeName = user?.employeeName || user?.name;
    const employeeRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

    const report = `*GoWater Tasks Report*

Date: ${today}
Time In: ${timeInStr}
Employee: ${employeeName}
Role: ${employeeRole}

*Today's Tasks:*
${taskList.length > 0 ? taskList.join('\n') : 'No tasks scheduled for today'}`;

    await simpleWhatsAppService.sendReport(report, 'start');
  };

  // Send EOD Report to WhatsApp
  // Delete today's attendance (for testing)
  const deleteAttendance = async () => {
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
          notes: 'Testing - delete attendance'
        }),
      });

      if (response.ok) {
        // Reset all state
        setIsTimedIn(false);
        setIsOnBreak(false);
        setTimeInTime(null);
        setTimeOutTime(null);
        setWorkDuration(0);
        setBreakDuration(0);
        setBreakRecords([]);
        
        // Clear any running timers
        if (workInterval) {
          clearInterval(workInterval);
          setWorkInterval(null);
        }
        if (breakInterval) {
          clearInterval(breakInterval);
          setBreakInterval(null);
        }

        alert('Today\'s attendance record deleted successfully! You can now time in again.');
      } else {
        const data = await response.json();
        alert(`Delete failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete attendance error:', error);
      alert('Failed to delete attendance. Please try again.');
    }
  };

  const sendEODReport = async () => {

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const timeInStr = timeInTime ? timeInTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) : 'N/A';

    const timeOutStr = timeOutTime ? timeOutTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) : new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Create task list with status
    const allTasksWithStatus = tasks.map((task, index) => {
      const statusMap = {
        'completed': 'done',
        'in_progress': 'in-progress',
        'pending': 'pending',
        'blocked': 'blocked'
      };
      let taskText = `${index + 1}. ${task.title} (${statusMap[task.status]})`;
      if (task.description) {
        // Split description by line breaks and format as subtasks
        const subtasks = task.description.split('\n').filter(line => line.trim());
        const formattedSubtasks = subtasks.map(subtask => `   • ${subtask.trim()}`).join('\n');
        taskText += `\n${formattedSubtasks}`;
      }
      return taskText;
    });

    const totalWorkTime = formatTime(workDuration);
    const totalBreakTime = formatTime(breakDuration);

    // Format break records
    const breakRecordsText = breakRecords.length > 0
      ? `\n*Break Sessions (${breakRecords.length}):*\n` +
      breakRecords.map((record, index) => {
        const startTime = record.startTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        const endTime = record.endTime ? record.endTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : 'Ongoing';
        const duration = formatTime(record.duration);
        return `${index + 1}. ${startTime} - ${endTime} (${duration})`;
      }).join('\n')
      : '';

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;

    // Get employee name and role from user profile
    const employeeName = user?.employeeName || user?.name;
    const employeeRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

    const report = `*GoWater EOD Report*

Date: ${today}
Employee: ${employeeName}
Role: ${employeeRole}

*Work Hours:*
- Time In: ${timeInStr}
- Time Out: ${timeOutStr}
- Work Duration: ${totalWorkTime}
- Break Duration: ${totalBreakTime}${breakRecordsText}

*Task Summary:* ${completedTasks}/${totalTasks} completed
${allTasksWithStatus.length > 0 ? allTasksWithStatus.join('\n') : 'No tasks for today'}`;

    await simpleWhatsAppService.sendReport(report, 'eod');
  };

  const addTask = async (e?: React.MouseEvent) => {
    // Prevent any default behavior if event is passed
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!newTask.title.trim()) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority
        }),
      });

      if (response.ok) {
        const newTaskData = await response.json();
        console.log('New task created:', newTaskData);
        setNewTask({ title: '', description: '', priority: 'medium' });
        setShowAddTask(false);
        fetchTasks(); // Refresh tasks from database
        console.log('Task added successfully - staying on dashboard');
      } else {
        console.error('Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const updateTaskStatus = async (id: string, status: Task['status']) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status }),
      });

      if (response.ok) {
        fetchTasks(); // Refresh tasks from database
      } else {
        console.error('Failed to update task status');
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      // Stop timer if running
      if (timerIntervals[id]) {
        clearInterval(timerIntervals[id]);
        setTimerIntervals(prev => {
          const newIntervals = { ...prev };
          delete newIntervals[id];
          return newIntervals;
        });
      }

      const response = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTasks(); // Refresh tasks from database
      } else {
        console.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };


  const formatTime = (seconds: number) => {
    const safeSeconds = seconds || 0;
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    switch (priority) {
      case 'urgent': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
    }
  };


  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
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

  if (!user) {
    return null; // Will redirect via useEffect
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

        {/* Dashboard Content */}
        <main className="p-6">
          {/* Quick Stats */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-700 font-medium">Welcome back, {user?.name}! Here&apos;s your work overview for today.</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAddTask(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Task</span>
                </button>
              </div>
            </div>
          </div>

          {/* Attendance Controls Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
              <div className="flex items-center space-x-2">
                {!isTimedIn ? (
                  <button
                    onClick={timeIn}
                    disabled={tasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'blocked').length === 0}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 ${tasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'blocked').length > 0
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-300 text-gray-800 cursor-not-allowed'
                      }`}
                    title={tasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'blocked').length === 0 ? 'Add tasks first before timing in' : 'Start your work day'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Time In</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    {isOnBreak ? (
                      <>
                        <div className="text-sm text-orange-600 font-medium flex items-center space-x-1">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                          <span>Break: {formatTime(breakDuration || 0)}</span>
                        </div>
                        <button
                          onClick={endBreak}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Resume Work</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-green-600 font-medium flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span>Working: {formatTime(workDuration || 0)}</span>
                        </div>
                        <button
                          onClick={startBreak}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a8.966 8.966 0 008.354-5.646z" />
                          </svg>
                          <span>Break</span>
                        </button>
                        <button
                          onClick={requestTimeOut}
                          disabled={!canTimeOut()}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 ${canTimeOut()
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-gray-300 text-gray-800 cursor-not-allowed'
                            }`}
                          title={getTimeOutWarning()}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Time Out</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* WhatsApp Reports Section */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-800">
                <span className="font-medium">WhatsApp Reports:</span> Send attendance reports with one click
              </div>
              <div className="flex items-center space-x-2">
                {isTimedIn && (
                  <button
                    onClick={sendStartReport}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                    title="Send start of work report to WhatsApp group"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.700" />
                    </svg>
                    <span>Send Start Report</span>
                  </button>
                )}

                <button
                  onClick={sendEODReport}
                  disabled={isTimedIn || !timeOutTime}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                    !isTimedIn && timeOutTime
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-800 cursor-not-allowed'
                  }`}
                  title={!isTimedIn && timeOutTime ? "Send end of day report to WhatsApp group" : "Complete your shift first before sending EOD report"}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.700" />
                  </svg>
                  <span>Send EOD Report</span>
                </button>

                <button
                  onClick={deleteAttendance}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                  title="Delete today's attendance record (for testing)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Attendance</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Today&apos;s Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{tasks?.length || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{tasks?.filter(t => t.status === 'in_progress')?.length || 0}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{tasks?.filter(t => t.status === 'completed')?.length || 0}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Work Duration</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatTime(workDuration || 0)}
                  </p>
                  <p className="text-xs text-gray-800 mt-1">
                    Break: {Math.floor((breakDuration || 0) / 60)} min
                  </p>
                  {breakRecords && breakRecords.length > 0 && (
                    <p className="text-xs text-gray-800">
                      Break Sessions: {breakRecords.length}
                    </p>
                  )}
                  {timeInTime && (
                    <p className="text-xs text-gray-800">
                      Started: {timeInTime.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Unfinished Tasks Section - Only shown after timeout scenarios */}
          {/* This section is removed to prevent showing ongoing tasks immediately */}
          {/* Tasks are displayed in the regular task grid below */}

          {/* Tasks Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* To Do */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                  Pending ({tasks.filter(t => t.status === 'pending').length})
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {tasks.filter(t => t.status === 'pending').length === 0 ? (
                  <p className="text-gray-800 text-center py-4">No pending tasks</p>
                ) : (
                  tasks.filter(t => t.status === 'pending').map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={updateTaskStatus}
                      onDeleteTask={deleteTask}
                      getPriorityColor={getPriorityColor}
                    />
                  ))
                )}
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  Ongoing ({tasks.filter(t => t.status === 'in_progress').length})
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {tasks.filter(t => t.status === 'in_progress').map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={updateTaskStatus}
                    onDeleteTask={deleteTask}
                    getPriorityColor={getPriorityColor}
                  />
                ))}
              </div>
            </div>

            {/* Completed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  Done ({tasks.filter(t => t.status === 'completed').length})
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {tasks.filter(t => t.status === 'completed').map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={updateTaskStatus}
                    onDeleteTask={deleteTask}
                    getPriorityColor={getPriorityColor}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Add Task Modal */}
          {showAddTask && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Add Task</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Title</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter task title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Description</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Enter task description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={(e) => addTask(e)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                  >
                    Add Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddTask(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Time Out Confirmation Modal */}
          {showTimeOutConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                <h3 className="text-xl font-semibold mb-4 text-center">Confirm End of Work Day</h3>
                <p className="text-gray-800 text-center mb-6">
                  Please confirm the status of your tasks before timing out:
                </p>

                <div className="space-y-4 mb-6">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-gray-800 mt-1">{task.description}</p>
                          )}
                        </div>
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                          className="ml-4 text-sm border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                        >
                          <option value="completed">Done</option>
                          <option value="in_progress">Ongoing</option>
                          <option value="pending">Pending</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                      <p className="text-blue-800 font-medium">Task Status Guide:</p>
                      <ul className="text-blue-700 mt-1 space-y-1">
                        <li><strong>Done:</strong> Task completed successfully</li>
                        <li><strong>Ongoing:</strong> Task in progress, will continue tomorrow</li>
                        <li><strong>Pending:</strong> Task not started or postponed</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={confirmTimeOut}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
                  >
                    Confirm Time Out
                  </button>
                  <button
                    onClick={cancelTimeOut}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({
  task,
  onStatusChange,
  onDeleteTask,
  getPriorityColor
}: {
  task: Task;
  onStatusChange: (id: string, status: Task['status']) => void;
  onDeleteTask: (id: string) => void;
  getPriorityColor: (priority: 'low' | 'medium' | 'high' | 'urgent') => string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 flex-1">{task.title}</h4>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          <button
            onClick={() => onDeleteTask(task.id)}
            className="text-gray-800 hover:text-red-500 transition-colors"
            title="Delete task"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-sm text-gray-800 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-800">
            Created: {new Date(task.createdAt).toLocaleDateString()}
          </span>
        </div>

        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
          className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="pending">Pending</option>
          <option value="in_progress">Ongoing</option>
          <option value="completed">Done</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>
    </div>
  );
}