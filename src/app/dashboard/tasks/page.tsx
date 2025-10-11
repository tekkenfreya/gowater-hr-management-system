'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Task } from '@/types/attendance';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

type BoardBackground = 'gradient-blue' | 'gradient-purple' | 'gradient-green' | 'gradient-orange' | 'solid-gray' | 'pattern-dots';

export default function TasksPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState<'pending' | 'in_progress' | 'completed' | null>(null);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [background, setBackground] = useState<BoardBackground>('gradient-blue');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
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
      // Load saved background
      const savedBg = localStorage.getItem('tasksBoardBackground');
      if (savedBg) setBackground(savedBg as BoardBackground);
    }
  }, [user]);

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

  const addTask = async (status: 'pending' | 'in_progress' | 'completed') => {
    if (!newTask.title.trim()) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, status }),
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
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (response.ok) {
        await fetchTasks();
      } else {
        logger.error('Failed to update task status', new Error('Response not ok'));
      }
    } catch (error) {
      logger.error('Failed to update task status', error);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchTasks();
      } else {
        logger.error('Failed to delete task', new Error('Response not ok'));
      }
    } catch (error) {
      logger.error('Failed to delete task', error);
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
      default:
        return 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600';
    }
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

  // Organize tasks by status
  const tasksByStatus = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed'),
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

      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-52'}`}>
        <Header user={user} onToggleSidebar={toggleSidebar} onLogout={logout} />

        {/* Trello-style Board */}
        <div className={`min-h-[calc(100vh-64px)] ${getBackgroundClass()} p-4 relative`}>
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

          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">Tasks Board</h1>

            <button
              onClick={() => setShowBackgroundMenu(!showBackgroundMenu)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
            >
              <BackgroundIcon />
              <span>Change Background</span>
            </button>
          </div>

          {/* Background Menu */}
          {showBackgroundMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowBackgroundMenu(false)}
              />
              <div className="absolute top-16 right-4 bg-white rounded-xl shadow-2xl p-4 z-30 w-80">
                <h3 className="font-semibold text-gray-900 mb-3">Board Background</h3>
                <div className="grid grid-cols-3 gap-3">
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
              </div>
            </>
          )}

          {/* Trello Columns */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-160px)]">
            {/* Pending Column */}
            <TrelloColumn
              title="Pending"
              tasks={tasksByStatus.pending}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'pending')}
              onAddTask={() => setShowAddTask('pending')}
              onDeleteTask={deleteTask}
              getPriorityColor={getPriorityColor}
              isDraggingOver={draggedTask?.status !== 'pending' && draggedTask !== null}
            />

            {/* In Progress Column */}
            <TrelloColumn
              title="In Progress"
              tasks={tasksByStatus.in_progress}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'in_progress')}
              onAddTask={() => setShowAddTask('in_progress')}
              onDeleteTask={deleteTask}
              getPriorityColor={getPriorityColor}
              isDraggingOver={draggedTask?.status !== 'in_progress' && draggedTask !== null}
            />

            {/* Completed Column */}
            <TrelloColumn
              title="Completed"
              tasks={tasksByStatus.completed}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'completed')}
              onAddTask={() => setShowAddTask('completed')}
              onDeleteTask={deleteTask}
              getPriorityColor={getPriorityColor}
              isDraggingOver={draggedTask?.status !== 'completed' && draggedTask !== null}
            />
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Add to {showAddTask === 'pending' ? 'Pending' : showAddTask === 'in_progress' ? 'In Progress' : 'Completed'}
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
  isDraggingOver
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
            className="bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-200 p-3 cursor-grab active:cursor-grabbing transition-all group"
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
              <span className="text-xs text-gray-500">
                {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        ))}

        {/* Add Card Button */}
        <button
          onClick={onAddTask}
          className="w-full bg-white/50 hover:bg-white/80 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg p-3 text-gray-600 hover:text-gray-900 font-medium text-sm transition-all flex items-center justify-center space-x-2"
        >
          <PlusIcon />
          <span>Add a card</span>
        </button>
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

function BackgroundIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
