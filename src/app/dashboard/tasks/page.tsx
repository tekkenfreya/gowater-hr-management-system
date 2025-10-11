'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Task } from '@/types/attendance';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { simpleWhatsAppService } from '@/lib/whatsapp-simple';

type BoardBackground = 'gradient-blue' | 'gradient-purple' | 'gradient-green' | 'gradient-orange' | 'solid-gray' | 'pattern-dots' | 'image-abstract' | 'image-nature';

export default function TasksPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState<'tasks' | 'pending' | 'in_progress' | 'completed' | null>(null);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const [background, setBackground] = useState<BoardBackground>('gradient-blue');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'my-tasks' | 'assigned-by-me' | 'completed'>('all');
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
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
        }
      }
    } catch (error) {
      logger.error('Failed to fetch attendance', error);
    }
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
        setNewTask({ title: '', description: '', priority: 'medium' });
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

  const sendWhatsAppReport = async (reportType: 'start' | 'eod') => {
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
        tasksSection = '  No tasks for today';
      } else {
        tasksSection = todayTasks.map((task, index) => {
          let taskText = `${index + 1}. ${task.title}`;
          if (task.description) {
            taskText += `\n   •  ${task.description}`;
          }
          return taskText;
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
        tasksSection = '  No tasks for today';
      } else {
        tasksSection = todayTasks.map((task, index) => {
          const statusText = task.status.replace(/_/g, ' ').toUpperCase();

          let taskText = `${index + 1}. ${task.title} [${statusText}]`;
          if (task.description) {
            taskText += `\n   •  ${task.description}`;
          }
          return taskText;
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

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: 'pending' | 'in_progress' | 'completed') => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      await updateTaskStatus(draggedTask.id, newStatus);
    }
    setDraggedTask(null);
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
        // Show only active (not completed) tasks
        return tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
      case 'assigned-by-me':
        // Show tasks in progress
        return tasks.filter(t => t.status === 'in_progress');
      case 'completed':
        return tasks.filter(t => t.status === 'completed');
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  // Organize tasks by status
  // Tasks column shows all pending/blocked tasks (backlog), other columns show their respective statuses
  const tasksByStatus = {
    tasks: filteredTasks.filter(t => t.status === 'pending' || t.status === 'blocked'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    completed: filteredTasks.filter(t => t.status === 'completed'),
  };

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

          {/* Trello Columns */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 h-full p-4">
            {/* Tasks Column (Backlog) - Only place to add new tasks */}
            <TrelloColumn
              title="Tasks"
              tasks={tasksByStatus.tasks}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'pending')}
              onAddTask={() => setShowAddTask('tasks')}
              onDeleteTask={deleteTask}
              getPriorityColor={getPriorityColor}
              isDraggingOver={draggedTask?.status !== 'pending' && draggedTask !== null}
              showAddButton={true}
            />

            {/* In Progress Column */}
            <TrelloColumn
              title="In Progress"
              tasks={tasksByStatus.in_progress}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'in_progress')}
              onAddTask={() => {}}
              onDeleteTask={deleteTask}
              getPriorityColor={getPriorityColor}
              isDraggingOver={draggedTask?.status !== 'in_progress' && draggedTask !== null}
              showAddButton={false}
            />

            {/* Completed Column */}
            <TrelloColumn
              title="Completed"
              tasks={tasksByStatus.completed}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'completed')}
              onAddTask={() => {}}
              onDeleteTask={deleteTask}
              getPriorityColor={getPriorityColor}
              isDraggingOver={draggedTask?.status !== 'completed' && draggedTask !== null}
              showAddButton={false}
            />
          </div>
          </div>

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
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Add New Task
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>
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
                onClick={() => setShowAddTask(null)}
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
                onClick={() => sendWhatsAppReport('start')}
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
                onClick={() => sendWhatsAppReport('eod')}
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
    </div>
  );
}

// Trello Column Component
function TrelloColumn({
  title,
  tasks,
  onDragStart,
  onDragOver,
  onDrop,
  onAddTask,
  onDeleteTask,
  getPriorityColor,
  isDraggingOver,
  showAddButton = true
}: {
  title: string;
  tasks: Task[];
  onDragStart: (task: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onAddTask: () => void;
  onDeleteTask: (id: string) => void;
  getPriorityColor: (priority: 'low' | 'medium' | 'high' | 'urgent') => string;
  isDraggingOver: boolean;
  showAddButton?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-sm px-4 py-3 mb-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">{title}</h2>
          <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`flex-1 bg-white/90 backdrop-blur-sm rounded-lg p-3 overflow-y-auto space-y-3 transition-all ${
          isDraggingOver ? 'ring-4 ring-blue-400 bg-blue-50/90' : ''
        }`}
      >
        {tasks.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => onDragStart(task)}
            className="bg-white/60 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md border border-white/40 p-3 cursor-grab active:cursor-grabbing transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900 text-sm flex-1">{task.title}</h4>
              <button
                onClick={() => onDeleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-500 transition-all"
                title="Delete"
              >
                <TrashIcon />
              </button>
            </div>

            {task.description && (
              <p className="text-xs text-gray-600 mb-3 line-clamp-3">{task.description}</p>
            )}

            <div className="flex items-center justify-between">
              <div className={`w-10 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
              <span className="text-xs text-gray-500 capitalize">
                {task.priority}
              </span>
            </div>
          </div>
        ))}

        {/* Add Card Button - Only show in Tasks column */}
        {showAddButton && (
          <button
            onClick={onAddTask}
            className="w-full bg-white/50 hover:bg-white/80 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg p-3 text-gray-600 hover:text-gray-900 font-medium text-sm transition-all flex items-center justify-center space-x-2"
          >
            <PlusIcon />
            <span>Add a card</span>
          </button>
        )}
      </div>
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

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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
