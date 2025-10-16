'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Task } from '@/types/attendance';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import TaskTimelineView from '@/components/TaskTimelineView';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { simpleWhatsAppService } from '@/lib/whatsapp-simple';

type BoardBackground = 'gradient-blue' | 'gradient-purple' | 'gradient-green' | 'gradient-orange' | 'solid-gray' | 'pattern-dots' | 'image-abstract' | 'image-nature';

export default function TasksPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [_loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState<'tasks' | 'pending' | 'in_progress' | 'completed' | null>(null);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'start' | 'eod'>('eod');
  const [background, setBackground] = useState<BoardBackground>('gradient-blue');
  const [taskFilter, setTaskFilter] = useState<'all' | 'my-tasks' | 'assigned-by-me' | 'completed' | 'archived'>('all');
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [breakDuration, setBreakDuration] = useState<number>(0);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [reportTasks, setReportTasks] = useState<Array<{
    task: Task;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    subTasks: Array<{
      id: string;
      title: string;
      status: 'pending' | 'in_progress' | 'completed' | 'blocked';
      description: string;
    }>;
  }>>([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    subTasks: [] as { id: string; title: string; notes: string; completed: boolean }[],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  useEffect(() => {
    if (!isLoading && user === null) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchTodayAttendance();
      // Load saved background
      const savedBg = localStorage.getItem('tasksBoardBackground');
      if (savedBg) setBackground(savedBg as BoardBackground);
    }
  }, [user]);

  const fetchTodayAttendance = async () => {
    try {
      const response = await fetch('/api/attendance');
      if (response.ok) {
        const data = await response.json();
        if (data.attendance && data.attendance.checkInTime) {
          setCheckInTime(data.attendance.checkInTime);
          setBreakDuration(data.attendance.breakDuration || 0);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch attendance', error);
    }
  };

  const formatBreakTime = (seconds: number): string => {
    if (seconds === 0) return 'No break';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        logger.error('Failed to fetch tasks', new Error('Response not ok'));
      }
    } catch (error) {
      logger.error('Failed to fetch tasks', error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (status: 'tasks' | 'pending' | 'in_progress' | 'completed') => {
    if (!newTask.title.trim()) return;

    // Map 'tasks' to 'pending' for API (Tasks column uses pending status internally)
    const apiStatus = status === 'tasks' ? 'pending' : status;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, status: apiStatus }),
      });

      if (response.ok) {
        setNewTask({ title: '', description: '', subTasks: [], priority: 'medium' });
        setShowAddTask(null);
        await fetchTasks();
      } else {
        logger.error('Failed to create task', new Error('Response not ok'));
      }
    } catch (error) {
      logger.error('Failed to create task', error);
    }
  };

  const updateTaskStatus = async (id: string, status: Task['status']) => {
    // Optimistic update - update UI immediately
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === id ? { ...task, status } : task
      )
    );

    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) {
        logger.error('Failed to update task status', new Error('Response not ok'));
        // Revert on failure
        await fetchTasks();
      }
    } catch (error) {
      logger.error('Failed to update task status', error);
      // Revert on error
      await fetchTasks();
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    // Optimistic delete - remove from UI immediately
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));

    try {
      const response = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (!response.ok) {
        logger.error('Failed to delete task', new Error('Response not ok'));
        // Revert by fetching fresh data
        await fetchTasks();
      }
    } catch (error) {
      logger.error('Failed to delete task', error);
      // Revert by fetching fresh data
      await fetchTasks();
    }
  };

  const updateTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTask),
      });

      if (response.ok) {
        setEditingTask(null);
        await fetchTasks();
      } else {
        logger.error('Failed to update task', new Error('Response not ok'));
      }
    } catch (error) {
      logger.error('Failed to update task', error);
    }
  };

  // Handle updates from timeline view
  const handleTaskUpdate = async (id: string, updates: Partial<Task>) => {
    try {
      // Optimistic update
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === id ? { ...task, ...updates } : task
        )
      );

      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        logger.error('Failed to update task', new Error('Response not ok'));
        // Revert on failure
        await fetchTasks();
      }
    } catch (error) {
      logger.error('Failed to update task', error);
      // Revert on error
      await fetchTasks();
    }
  };

  const _sendWhatsAppReport = async (reportType: 'start' | 'eod') => {
    if (!user) return;

    // Format date and time
    const now = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const formattedDate = now.toLocaleDateString('en-US', dateOptions);

    // Format check-in time
    const timeIn = checkInTime
      ? new Date(checkInTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      : 'Not checked in';

    // Get today's tasks based on report type
    let todayTasks: Task[];
    let tasksSection = '';

    if (reportType === 'start') {
      // Start report: show pending and blocked tasks (tasks to be done)
      todayTasks = tasks.filter(t =>
        t.status === 'pending' ||
        t.status === 'blocked'
      );

      if (todayTasks.length === 0) {
        tasksSection = 'No tasks for today';
      } else {
        tasksSection = todayTasks.map((task) => {
          let projectText = task.title;

          // Add sub-tasks
          if (task.subTasks && task.subTasks.length > 0) {
            projectText += '\n \n';  // Extra spacing after project title
            projectText += task.subTasks.map((subTask, index) => {
              let subTaskText = `${index + 1}. ${subTask.title}`;
              if (subTask.notes) {
                // Split notes by line and format each with a dash
                const noteLines = subTask.notes.split('\n').filter(line => line.trim());
                if (noteLines.length > 0) {
                  subTaskText += '\n' + noteLines.map(line => `-${line.trim()}`).join('\n');
                }
              }
              return subTaskText;
            }).join('\n\n');
          }

          return projectText;
        }).join('\n\n');
      }
    } else {
      // EOD report: show all tasks with their status
      todayTasks = tasks.filter(t =>
        t.status === 'pending' ||
        t.status === 'in_progress' ||
        t.status === 'completed' ||
        t.status === 'blocked'
      );

      if (todayTasks.length === 0) {
        tasksSection = 'No tasks for today';
      } else {
        tasksSection = todayTasks.map((task) => {
          let projectText = task.title;

          // Add sub-tasks with status based on parent task column
          if (task.subTasks && task.subTasks.length > 0) {
            projectText += '\n \n';  // Extra spacing after project title
            projectText += task.subTasks.map((subTask, index) => {
              // Add status tag based on parent task's column position
              let statusTag = '[PENDING]';
              if (task.status === 'completed') {
                statusTag = '[DONE]';
              } else if (task.status === 'in_progress') {
                statusTag = '[IN PROGRESS]';
              } else if (task.status === 'blocked') {
                statusTag = '[BLOCKED]';
              }
              // pending and other statuses default to [PENDING]

              let subTaskText = `${index + 1}. ${subTask.title} ${statusTag}`;

              if (subTask.notes) {
                // Split notes by line and format each with a dash
                const noteLines = subTask.notes.split('\n').filter(line => line.trim());
                if (noteLines.length > 0) {
                  subTaskText += '\n' + noteLines.map(line => `-${line.trim()}`).join('\n');
                }
              }
              return subTaskText;
            }).join('\n\n');
          }

          return projectText;
        }).join('\n\n');
      }
    }

    // Build the complete report
    const reportTitle = reportType === 'eod' ? 'GoWater EOD Tasks Report' : 'GoWater Tasks Report';
    const report = `${reportTitle}

Date: ${formattedDate}
Time In: ${timeIn}
Employee: ${user.employeeName || user.name}
Position: ${user.position || user.role}

Today's Tasks:
${tasksSection}`;

    // Send via WhatsApp
    try {
      await simpleWhatsAppService.sendReport(report, reportType);
      logger.info(`WhatsApp ${reportType} report sent successfully`);
      setShowReportTypeModal(false);
    } catch (error) {
      logger.error('Failed to send WhatsApp report', error);
      alert('Failed to send report. Please try again.');
    }
  };

  const changeBackground = (bg: BoardBackground) => {
    setBackground(bg);
    localStorage.setItem('tasksBoardBackground', bg);
    setShowBackgroundMenu(false);
  };

  const getBackgroundClass = () => {
    switch (background) {
      case 'gradient-blue':
        return 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600';
      case 'gradient-purple':
        return 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600';
      case 'gradient-green':
        return 'bg-gradient-to-br from-green-400 via-green-500 to-green-600';
      case 'gradient-orange':
        return 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600';
      case 'solid-gray':
        return 'bg-gray-600';
      case 'pattern-dots':
        return 'bg-blue-500';
      case 'image-abstract':
        return 'bg-gray-800';
      case 'image-nature':
        return 'bg-green-800';
      default:
        return 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600';
    }
  };

  const getBackgroundStyle = () => {
    if (background === 'image-abstract') {
      return {
        backgroundImage: 'url("https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      };
    }
    if (background === 'image-nature') {
      return {
        backgroundImage: 'url("https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      };
    }
    return {};
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
    }
  };

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // Filter tasks based on selected filter
  const getFilteredTasks = () => {
    switch (taskFilter) {
      case 'my-tasks':
        // Show only active (not completed, not archived) tasks
        return tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
      case 'assigned-by-me':
        // Show tasks in progress
        return tasks.filter(t => t.status === 'in_progress');
      case 'completed':
        return tasks.filter(t => t.status === 'completed');
      case 'archived':
        return tasks.filter(t => t.status === 'archived');
      default:
        // Show all tasks except archived (unless archived filter is selected)
        return tasks.filter(t => t.status !== 'archived');
    }
  };

  const filteredTasks = getFilteredTasks();

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar user={user} isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <div className="flex-1 transition-all duration-300 lg:ml-52 flex flex-col">
        <Header user={user} onToggleSidebar={toggleSidebar} onLogout={logout} />

        <div className="flex-1 flex">
          {/* Left Task Summary Panel */}
          <div className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 p-4 space-y-4 overflow-y-auto mt-4 mb-4 ml-4 rounded-l-xl shadow-sm">
            {/* My Task Summary Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <h3 className="font-bold text-gray-900 text-sm mb-4">Task Overview</h3>

              {/* Total Tasks Count */}
              <div className="bg-white rounded-lg p-3 mb-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Total Tasks</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {tasks.length}
                  </span>
                </div>
                {/* Debug info - All statuses */}
                <div className="mt-2 text-[9px] text-gray-500 border-t pt-2">
                  <div className="font-semibold mb-1">Status Breakdown:</div>
                  {Object.entries(
                    tasks.reduce((acc, task) => {
                      acc[task.status] = (acc[task.status] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([status, count]) => (
                    <div key={status} className="flex justify-between">
                      <span className="capitalize">{status.replace(/_/g, ' ')}:</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending/To Do Tasks */}
              <div className="bg-white rounded-lg p-3 mb-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">To Do</span>
                  <span className="text-xl font-bold text-orange-600">
                    {tasks.filter(t => t.status === 'pending' || t.status === 'blocked').length}
                  </span>
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-white rounded-lg p-3 mb-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">In Progress</span>
                  <span className="text-xl font-bold text-purple-600">
                    {tasks.filter(t => t.status === 'in_progress').length}
                  </span>
                </div>
              </div>

              {/* Completion Stats */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <span className="text-xs text-gray-600 block mb-2">Completion Rate</span>
                <div className="flex items-end space-x-2">
                  <span className="text-2xl font-bold text-green-600">
                    {tasks.length > 0
                      ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
                      : 0}%
                  </span>
                  <span className="text-xs text-gray-500 pb-1">
                    {tasks.filter(t => t.status === 'completed').length}/{tasks.length} completed
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${tasks.length > 0
                        ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Quick Links</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 ${
                    taskFilter === 'all'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <AllTasksIcon />
                  <span>All Tasks</span>
                </button>
                <button
                  onClick={() => setTaskFilter('my-tasks')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 ${
                    taskFilter === 'my-tasks'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <MyTasksIcon />
                  <span>Active Tasks</span>
                </button>
                <button
                  onClick={() => setTaskFilter('assigned-by-me')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 ${
                    taskFilter === 'assigned-by-me'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <AssignedIcon />
                  <span>In Progress</span>
                </button>
                <button
                  onClick={() => setTaskFilter('completed')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 ${
                    taskFilter === 'completed'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <CompletedIcon />
                  <span>Completed Tasks</span>
                </button>
                <button
                  onClick={() => setTaskFilter('archived')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 ${
                    taskFilter === 'archived'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <ArchiveIcon />
                  <span>Archived Tasks</span>
                </button>
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-900 text-sm mb-3">By Priority</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-gray-600">Urgent</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {tasks.filter(t => t.priority === 'urgent').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-gray-600">High</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {tasks.filter(t => t.priority === 'high').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-gray-600">Medium</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {tasks.filter(t => t.priority === 'medium').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-600">Low</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {tasks.filter(t => t.priority === 'low').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Blue Vertical Separator */}
          <div className="hidden lg:block w-1 bg-blue-500 shadow-lg"></div>

          {/* Main Content - Task Board */}
          <div
            className={`flex-1 ${getBackgroundClass()} p-4 relative`}
            style={getBackgroundStyle()}
          >
          {/* Dark overlay for image backgrounds */}
          {(background === 'image-abstract' || background === 'image-nature') && (
            <div className="absolute inset-0 bg-black/40" />
          )}

          {/* Pattern overlay for dots background */}
          {background === 'pattern-dots' && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {/* Background Menu */}
          {showBackgroundMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowBackgroundMenu(false)}
              />
              <div className="absolute top-16 right-4 bg-white rounded-xl shadow-2xl p-4 z-30 w-80 max-h-[500px] overflow-y-auto">
                <h3 className="font-semibold text-gray-900 mb-3">Board Background</h3>

                {/* Gradients Section */}
                <p className="text-xs font-medium text-gray-600 mb-2">Gradients</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    onClick={() => changeBackground('gradient-blue')}
                    className={`h-20 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 hover:scale-105 transition-transform ${background === 'gradient-blue' ? 'ring-4 ring-blue-500' : ''}`}
                  />
                  <button
                    onClick={() => changeBackground('gradient-purple')}
                    className={`h-20 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 hover:scale-105 transition-transform ${background === 'gradient-purple' ? 'ring-4 ring-purple-500' : ''}`}
                  />
                  <button
                    onClick={() => changeBackground('gradient-green')}
                    className={`h-20 rounded-lg bg-gradient-to-br from-green-400 to-green-600 hover:scale-105 transition-transform ${background === 'gradient-green' ? 'ring-4 ring-green-500' : ''}`}
                  />
                  <button
                    onClick={() => changeBackground('gradient-orange')}
                    className={`h-20 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 hover:scale-105 transition-transform ${background === 'gradient-orange' ? 'ring-4 ring-orange-500' : ''}`}
                  />
                  <button
                    onClick={() => changeBackground('solid-gray')}
                    className={`h-20 rounded-lg bg-gray-600 hover:scale-105 transition-transform ${background === 'solid-gray' ? 'ring-4 ring-gray-500' : ''}`}
                  />
                  <button
                    onClick={() => changeBackground('pattern-dots')}
                    className={`h-20 rounded-lg bg-blue-500 hover:scale-105 transition-transform relative overflow-hidden ${background === 'pattern-dots' ? 'ring-4 ring-blue-500' : ''}`}
                  >
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: 'radial-gradient(circle, white 2px, transparent 2px)',
                        backgroundSize: '15px 15px'
                      }}
                    />
                  </button>
                </div>

                {/* Images Section */}
                <p className="text-xs font-medium text-gray-600 mb-2">Photos</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => changeBackground('image-abstract')}
                    className={`h-24 rounded-lg hover:scale-105 transition-transform relative overflow-hidden ${background === 'image-abstract' ? 'ring-4 ring-blue-500' : ''}`}
                    style={{
                      backgroundImage: 'url("https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&q=80")',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="absolute inset-0 bg-black/20"></div>
                    <span className="absolute bottom-2 left-2 text-white text-xs font-semibold drop-shadow">Abstract</span>
                  </button>
                  <button
                    onClick={() => changeBackground('image-nature')}
                    className={`h-24 rounded-lg hover:scale-105 transition-transform relative overflow-hidden ${background === 'image-nature' ? 'ring-4 ring-green-500' : ''}`}
                    style={{
                      backgroundImage: 'url("https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=80")',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="absolute inset-0 bg-black/20"></div>
                    <span className="absolute bottom-2 left-2 text-white text-xs font-semibold drop-shadow">Nature</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Timeline View */}
          <div className="relative z-10 h-full overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Tasks Timeline</h2>
                  <p className="text-white/70 text-sm mt-1">Manage your tasks and track progress</p>
                </div>
                <button
                  onClick={() => setShowAddTask('tasks')}
                  className="flex items-center space-x-2 bg-white hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-semibold transition-all shadow-lg"
                >
                  <PlusIcon />
                  <span>Add Task</span>
                </button>
              </div>

              {/* Timeline View Component */}
              <TaskTimelineView
                tasks={filteredTasks}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={deleteTask}
                getPriorityColor={getPriorityColor}
              />
            </div>
          </div>
          </div>

          {/* Mobile Floating Action Button - Report */}
          <button
            onClick={() => setShowReportTypeModal(true)}
            className="lg:hidden fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95"
            title="Send WhatsApp Report"
          >
            <WhatsAppIcon className="w-8 h-8" />
          </button>

          {/* Right Action Bar - Dark Vertical Sidebar */}
          <div className="hidden lg:flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 w-16 border-l border-gray-700/30 shadow-2xl">
          {/* WhatsApp - Send Report */}
          <button
            onClick={() => setShowReportTypeModal(true)}
            className="flex flex-col items-center justify-center py-6 px-3 hover:bg-white/10 transition-all group relative"
            title="Send WhatsApp Report"
          >
            <WhatsAppIcon className="w-7 h-7 text-green-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Report</span>
            {/* Tooltip */}
            <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
              Send WhatsApp Report
            </div>
          </button>

          {/* Export Tasks */}
          <button
            className="flex flex-col items-center justify-center py-6 px-3 hover:bg-white/10 transition-all group relative"
            title="Export Tasks"
          >
            <DownloadIcon className="w-7 h-7 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Export</span>
            <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
              Export Tasks
            </div>
          </button>

          {/* Calendar/Schedule */}
          <button
            className="flex flex-col items-center justify-center py-6 px-3 hover:bg-white/10 transition-all group relative"
            title="View Calendar"
          >
            <CalendarIconSmall className="w-7 h-7 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Calendar</span>
            <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
              View Calendar
            </div>
          </button>

          {/* Background Change (Admin Only) */}
          {user.role === 'admin' && (
            <button
              onClick={() => setShowBackgroundMenu(!showBackgroundMenu)}
              className="flex flex-col items-center justify-center py-6 px-3 hover:bg-white/10 transition-all group relative mt-auto"
              title="Change Background"
            >
              <BackgroundIcon className="w-7 h-7 text-yellow-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] text-gray-400 mt-1 font-medium">Theme</span>
              <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                Change Background
              </div>
            </button>
          )}

          {/* Settings */}
          <button
            className="flex flex-col items-center justify-center py-6 px-3 hover:bg-white/10 transition-all group relative"
            title="Board Settings"
          >
            <SettingsIconSmall className="w-7 h-7 text-gray-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-gray-400 mt-1 font-medium">Settings</span>
            <div className="absolute right-full mr-2 hidden group-hover:block bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
              Board Settings
            </div>
          </button>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Add New Task
            </h3>
            <div className="space-y-4">
              {/* Project/Main Task Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Project/Main Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., GoWater Dispenser"
                  autoFocus
                />
              </div>

              {/* Sub-tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">Sub-tasks</label>
                  <button
                    onClick={() => {
                      const newSubTask = {
                        id: `temp-${Date.now()}`,
                        title: '',
                        notes: '',
                        completed: false
                      };
                      setNewTask({ ...newTask, subTasks: [...newTask.subTasks, newSubTask] });
                    }}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <PlusIcon />
                    <span>Add Sub-task</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {newTask.subTasks.map((subTask, index) => (
                    <div key={subTask.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-700">{index + 1}.</span>
                        <input
                          type="text"
                          value={subTask.title}
                          onChange={(e) => {
                            const updated = [...newTask.subTasks];
                            updated[index].title = e.target.value;
                            setNewTask({ ...newTask, subTasks: updated });
                          }}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Add Code"
                        />
                        <button
                          onClick={() => {
                            const updated = newTask.subTasks.filter((_, i) => i !== index);
                            setNewTask({ ...newTask, subTasks: updated });
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                          title="Remove"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}

                  {newTask.subTasks.length === 0 && (
                    <div className="text-center py-6 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded-lg">
                      No sub-tasks yet. Click &ldquo;Add Sub-task&rdquo; to get started.
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                <div className="flex space-x-2">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setNewTask({ ...newTask, priority })}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm capitalize transition-all ${
                        newTask.priority === priority
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => addTask(showAddTask)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors"
              >
                Add Task
              </button>
              <button
                onClick={() => {
                  setNewTask({ title: '', description: '', subTasks: [], priority: 'medium' });
                  setShowAddTask(null);
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Type Selection Modal */}
      {showReportTypeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Send WhatsApp Report
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Choose the type of report you want to send
            </p>

            <div className="space-y-3">
              {/* Start Report Button */}
              <button
                onClick={() => {
                  setReportType('start');
                  // Initialize report tasks from current tasks (exclude archived)
                  const reportData = tasks
                    .filter(t => t.status !== 'archived' && (t.status === 'pending' || t.status === 'blocked'))
                    .map(task => ({
                      task,
                      status: task.status as 'pending' | 'blocked',
                      subTasks: (task.subTasks || []).map(st => ({
                        id: st.id,
                        title: st.title,
                        status: 'pending' as const,
                        description: ''
                      }))
                    }));
                  setReportTasks(reportData);
                  setShowReportTypeModal(false);
                  setShowReportModal(true);
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Start Report</div>
                    <div className="text-xs text-blue-100">Tasks for the day</div>
                  </div>
                </div>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* EOD Report Button */}
              <button
                onClick={() => {
                  setReportType('eod');
                  // Initialize report tasks from current tasks (exclude archived)
                  const reportData = tasks
                    .filter(t =>
                      t.status !== 'archived' &&
                      (t.status === 'pending' ||
                      t.status === 'in_progress' ||
                      t.status === 'completed' ||
                      t.status === 'blocked')
                    )
                    .map(task => ({
                      task,
                      status: task.status as 'pending' | 'in_progress' | 'completed' | 'blocked',
                      subTasks: (task.subTasks || []).map(st => ({
                        id: st.id,
                        title: st.title,
                        status: 'pending' as const,
                        description: ''
                      }))
                    }));
                  setReportTasks(reportData);
                  setShowReportTypeModal(false);
                  setShowReportModal(true);
                }}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-bold">EOD Report</div>
                    <div className="text-xs text-red-100">End of day with status</div>
                  </div>
                </div>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setShowReportTypeModal(false)}
              className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Edit Task
            </h3>
            <div className="space-y-4">
              {/* Project/Main Task Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Project/Main Task Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., GoWater Dispenser"
                  autoFocus
                />
              </div>

              {/* Sub-tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">Sub-tasks</label>
                  <button
                    onClick={() => {
                      const newSubTask = {
                        id: `temp-${Date.now()}`,
                        title: '',
                        notes: '',
                        completed: false
                      };
                      setEditingTask({
                        ...editingTask,
                        subTasks: [...(editingTask.subTasks || []), newSubTask]
                      });
                    }}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <PlusIcon />
                    <span>Add Sub-task</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {(editingTask.subTasks || []).map((subTask, index) => (
                    <div key={subTask.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-700">{index + 1}.</span>
                        <input
                          type="text"
                          value={subTask.title}
                          onChange={(e) => {
                            const updated = [...(editingTask.subTasks || [])];
                            updated[index].title = e.target.value;
                            setEditingTask({ ...editingTask, subTasks: updated });
                          }}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Add Code"
                        />
                        <button
                          onClick={() => {
                            const updated = (editingTask.subTasks || []).filter((_, i) => i !== index);
                            setEditingTask({ ...editingTask, subTasks: updated });
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                          title="Remove"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!editingTask.subTasks || editingTask.subTasks.length === 0) && (
                    <div className="text-center py-6 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded-lg">
                      No sub-tasks yet. Click &ldquo;Add Sub-task&rdquo; to get started.
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                <div className="flex space-x-2">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setEditingTask({ ...editingTask, priority })}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm capitalize transition-all ${
                        editingTask.priority === priority
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={updateTask}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal with Status Dropdowns */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {reportType === 'eod' ? 'End of Day Report' : 'Start of Day Report'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Review and update task statuses, then send your report
            </p>

            <div className="space-y-4 mb-6">
              {reportTasks.map((reportTask, taskIndex) => (
                <div key={reportTask.task.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {/* Main Task */}
                  <div className="mb-3">
                    <h4 className="font-bold text-gray-900 text-base">{reportTask.task.title}</h4>
                  </div>

                  {/* Sub-tasks */}
                  {reportTask.subTasks.length > 0 && (
                    <div className="space-y-2 ml-4">
                      {reportTask.subTasks.map((subTask, subIndex) => (
                        <div key={subTask.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                          <div className="flex items-start space-x-2 mb-2">
                            <span className="text-sm font-semibold text-gray-700 mt-1">{subIndex + 1}.</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className={`text-sm font-medium flex-1 ${
                                  subTask.status === 'completed'
                                    ? 'line-through text-gray-500'
                                    : 'text-gray-900'
                                }`}>
                                  {subTask.title}
                                </p>
                                <select
                                  value={subTask.status}
                                  onChange={(e) => {
                                    const updated = [...reportTasks];
                                    updated[taskIndex].subTasks[subIndex].status = e.target.value as 'pending' | 'in_progress' | 'completed' | 'blocked';
                                    setReportTasks(updated);
                                  }}
                                  className={`ml-2 px-2.5 py-1 border-2 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all cursor-pointer ${
                                    subTask.status === 'pending'
                                      ? 'bg-orange-50 border-orange-300 text-orange-700 focus:ring-orange-500'
                                      : subTask.status === 'in_progress'
                                      ? 'bg-blue-50 border-blue-300 text-blue-700 focus:ring-blue-500'
                                      : 'bg-green-50 border-green-300 text-green-700 focus:ring-green-500'
                                  }`}
                                >
                                  <option value="pending" className="bg-white text-orange-700 font-semibold">Pending</option>
                                  <option value="in_progress" className="bg-white text-blue-700 font-semibold">In Progress</option>
                                  <option value="completed" className="bg-white text-green-700 font-semibold">Completed</option>
                                </select>
                              </div>
                              <textarea
                                value={subTask.description}
                                onChange={(e) => {
                                  const updated = [...reportTasks];
                                  updated[taskIndex].subTasks[subIndex].description = e.target.value;
                                  setReportTasks(updated);
                                }}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                                rows={2}
                                placeholder="Input your notes here"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {reportTasks.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-medium">No tasks to report</p>
                  <p className="text-sm mt-2">Add some tasks to your board first</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  // Generate and send report
                  if (!user) return;

                  // Check which tasks will be archived
                  const tasksToArchive = reportTasks.filter(reportTask => {
                    return reportTask.subTasks.length > 0 &&
                           reportTask.subTasks.every(st => st.status === 'completed');
                  });

                  // Show confirmation if there are tasks to archive
                  if (tasksToArchive.length > 0) {
                    const taskNames = tasksToArchive.map(t => `• ${t.task.title}`).join('\n');
                    const confirmMessage = `The following ${tasksToArchive.length} task(s) will be archived because all subtasks are completed:\n\n${taskNames}\n\nDo you want to proceed with sending the report and archiving these tasks?`;

                    if (!confirm(confirmMessage)) {
                      return; // User cancelled
                    }
                  }

                  const now = new Date();
                  const dateOptions: Intl.DateTimeFormatOptions = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  };
                  const formattedDate = now.toLocaleDateString('en-US', dateOptions);

                  const timeIn = checkInTime
                    ? new Date(checkInTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })
                    : 'Not checked in';

                  const tasksSection = reportTasks.map((reportTask) => {
                    let projectText = reportTask.task.title;

                    if (reportTask.subTasks.length > 0) {
                      projectText += '\n \n';
                      projectText += reportTask.subTasks.map((subTask, index) => {
                        let statusTag = '[PENDING]';
                        if (subTask.status === 'completed') statusTag = '[DONE]';
                        else if (subTask.status === 'in_progress') statusTag = '[IN PROGRESS]';
                        else if (subTask.status === 'blocked') statusTag = '[BLOCKED]';

                        let subTaskText = `${index + 1}. ${subTask.title} ${statusTag}`;

                        if (subTask.description.trim()) {
                          const noteLines = subTask.description.split('\n').filter(line => line.trim());
                          if (noteLines.length > 0) {
                            subTaskText += '\n' + noteLines.map(line => `  ${line.trim()}`).join('\n');
                          }
                        }
                        return subTaskText;
                      }).join('\n\n');
                    }

                    return projectText;
                  }).join('\n\n');

                  const reportTitle = reportType === 'eod' ? 'GoWater EOD Tasks Report' : 'GoWater Tasks Report';
                  const report = `${reportTitle}

Date: ${formattedDate}
Time In: ${timeIn}
Break Time: ${formatBreakTime(breakDuration)}
Employee: ${user.employeeName || user.name}
Position: ${user.position || user.role}

Today's Tasks:
${tasksSection || 'No tasks for today'}`;

                  // Archive tasks where all subtasks are completed
                  const archivePromises = tasksToArchive.map(reportTask => {
                    // Archive this task
                    return fetch('/api/tasks', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        id: reportTask.task.id,
                        status: 'archived'
                      }),
                    });
                  });

                  // Execute all archive operations
                  Promise.all(archivePromises)
                    .then(() => {
                      // Send via WhatsApp after archiving
                      return simpleWhatsAppService.sendReport(report, reportType);
                    })
                    .then(() => {
                      logger.info(`WhatsApp ${reportType} report sent successfully`);
                      // Refresh tasks to reflect archived status
                      fetchTasks();
                      setShowReportModal(false);
                    })
                    .catch((error) => {
                      logger.error('Failed to send WhatsApp report or archive tasks', error);
                      alert('Failed to send report. Please try again.');
                    });
                }}
                disabled={reportTasks.length === 0}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  reportTasks.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                Send WhatsApp Report
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon Components
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function BackgroundIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

// Right Action Bar Icons
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-7 h-7"} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-7 h-7"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CalendarIconSmall({ className }: { className?: string }) {
  return (
    <svg className={className || "w-7 h-7"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function SettingsIconSmall({ className }: { className?: string }) {
  return (
    <svg className={className || "w-7 h-7"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Quick Links Icons
function AllTasksIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function MyTasksIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function AssignedIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function CompletedIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}
