'use client';

import { Task } from '@/types/attendance';
import { useState } from 'react';

interface TaskTimelineViewProps {
  tasks: Task[];
  onTaskUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  onTaskDelete: (id: string) => void;
  getPriorityColor: (priority: Task['priority']) => string;
}

export default function TaskTimelineView({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  getPriorityColor
}: TaskTimelineViewProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set(tasks.map(t => t.id)));
  const [editingNote, setEditingNote] = useState<{ taskId: string; subTaskId: string } | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const toggleTaskExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
      case 'blocked':
        return 'bg-orange-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusTextColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
      case 'blocked':
        return 'text-orange-700';
      case 'in_progress':
        return 'text-blue-700';
      case 'completed':
        return 'text-green-700';
      case 'archived':
        return 'text-gray-700';
      default:
        return 'text-gray-700';
    }
  };

  const getStatusBgColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
      case 'blocked':
        return 'bg-orange-50 border-orange-200';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'archived':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: Date | string | undefined) => {
    if (!dateString) return 'No date';

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'No date';
      }

      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7 && diffDays > 0) return `${diffDays} days ago`;
      if (diffDays < 0 && diffDays > -1) return 'Today';

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      return 'No date';
    }
  };

  const calculateProgress = (task: Task) => {
    if (!task.subTasks || task.subTasks.length === 0) return 0;
    const completed = task.subTasks.filter(st => st.completed).length;
    return (completed / task.subTasks.length) * 100;
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    await onTaskUpdate(task.id, { status: newStatus });
  };

  const handleSubTaskToggle = async (task: Task, subTaskId: string) => {
    const updatedSubTasks = task.subTasks.map(st =>
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );
    await onTaskUpdate(task.id, { subTasks: updatedSubTasks });
  };

  const handleSubTaskDelete = async (task: Task, subTaskId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return;

    const updatedSubTasks = task.subTasks.filter(st => st.id !== subTaskId);
    await onTaskUpdate(task.id, { subTasks: updatedSubTasks });
  };

  const handleNoteEdit = (taskId: string, subTaskId: string, currentNote: string) => {
    setEditingNote({ taskId, subTaskId });
    setNoteValue(currentNote);
  };

  const handleNoteSave = async (task: Task, subTaskId: string) => {
    const updatedSubTasks = task.subTasks.map(st =>
      st.id === subTaskId ? { ...st, notes: noteValue } : st
    );
    await onTaskUpdate(task.id, { subTasks: updatedSubTasks });
    setEditingNote(null);
    setNoteValue('');
  };

  const handleNoteCancel = () => {
    setEditingNote(null);
    setNoteValue('');
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-600 text-lg font-medium">No tasks found</p>
          <p className="text-gray-500 text-sm mt-1">Create a new task to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {tasks.map((task) => {
        const isExpanded = expandedTasks.has(task.id);
        const progress = calculateProgress(task);
        const hasSubTasks = task.subTasks && task.subTasks.length > 0;

        return (
          <div
            key={task.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md"
          >
            {/* Task Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3 flex-1">
                  {/* Expand/Collapse Button */}
                  {hasSubTasks && (
                    <button
                      onClick={() => toggleTaskExpanded(task.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}

                  {/* Task Title */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-gray-900">{task.title}</h3>
                      {/* Date Badge */}
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded" title={`Created: ${formatDate(task.createdAt)}`}>
                        {task.updatedAt && task.updatedAt !== task.createdAt
                          ? `Updated ${formatDate(task.updatedAt)}`
                          : formatDate(task.createdAt)}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-0.5">{task.description}</p>
                    )}
                  </div>

                  {/* Priority Badge */}
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
                    <span className="text-xs text-gray-600 capitalize">{task.priority}</span>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task, e.target.value as Task['status'])}
                    className={`px-3 py-1.5 border-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 transition-all cursor-pointer ${getStatusBgColor(task.status)} ${getStatusTextColor(task.status)}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                    <option value="archived">Archived</option>
                  </select>

                  {/* Delete Button */}
                  <button
                    onClick={() => onTaskDelete(task.id)}
                    className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-all"
                    title="Delete task"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {hasSubTasks && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                    <span>Progress</span>
                    <span className="font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${getStatusColor(task.status)}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sub-tasks */}
            {hasSubTasks && isExpanded && (
              <div className="p-4 bg-gray-50 space-y-2">
                {task.subTasks.map((subTask, index) => (
                  <div
                    key={subTask.id}
                    className="bg-white rounded-lg border border-gray-200 p-3 transition-all hover:shadow-sm group"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleSubTaskToggle(task, subTask.id)}
                        className="mt-0.5"
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            subTask.completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {subTask.completed && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Sub-task Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <p
                            className={`text-sm font-medium flex-1 ${
                              subTask.completed ? 'line-through text-gray-500' : 'text-gray-900'
                            }`}
                          >
                            <span className="text-gray-500 mr-2">{index + 1}.</span>
                            {subTask.title}
                          </p>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1 ml-2">
                            {/* Edit Note Button */}
                            <button
                              onClick={() => handleNoteEdit(task.id, subTask.id, subTask.notes || '')}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Edit notes"
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {/* Delete Subtask Button */}
                            <button
                              onClick={() => handleSubTaskDelete(task, subTask.id)}
                              className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete subtask"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Notes Display or Editor */}
                        {editingNote?.taskId === task.id && editingNote?.subTaskId === subTask.id ? (
                          <div className="mt-2">
                            <textarea
                              value={noteValue}
                              onChange={(e) => setNoteValue(e.target.value)}
                              className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              rows={3}
                              placeholder="Add notes..."
                              autoFocus
                            />
                            <div className="flex space-x-2 mt-2">
                              <button
                                onClick={() => handleNoteSave(task, subTask.id)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleNoteCancel}
                                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          subTask.notes && (
                            <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-200">
                              {subTask.notes.split('\n').map((line, i) => (
                                <p key={i} className="mb-0.5 last:mb-0">
                                  {line}
                                </p>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
