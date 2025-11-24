'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import UserPermissionsModal from '@/components/admin/UserPermissionsModal';
import AttendanceManagementTab from '@/components/admin/AttendanceManagementTab';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface CreateUserForm {
  email: string;
  password: string;
  name: string;
  employeeId: string;
  role: 'admin' | 'employee' | 'manager';
  position: string;
  department: string;
  employeeName: string;
}

interface EditUserForm {
  name: string;
  employeeId: string;
  role: 'admin' | 'employee' | 'manager';
  position: string;
  department: string;
  employeeName: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'attendance'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    name: '',
    employeeId: '',
    role: 'employee',
    position: '',
    department: '',
    employeeName: ''
  });
  const [editForm, setEditForm] = useState<EditUserForm>({
    name: '',
    employeeId: '',
    role: 'employee',
    position: '',
    department: '',
    employeeName: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [user, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      logger.error('Failed to fetch users', error);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateForm(false);
        setCreateForm({
          email: '',
          password: '',
          name: '',
          employeeId: '',
          role: 'employee',
          position: '',
          department: '',
          employeeName: ''
        });
        fetchUsers(); // Refresh the users list
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch {
      setError('Failed to create user. Please try again.');
    }
    setFormLoading(false);
  };

  const handleEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditForm({
      name: userToEdit.name,
      employeeId: userToEdit.employeeId || '',
      role: userToEdit.role,
      position: userToEdit.position || '',
      department: userToEdit.department || '',
      employeeName: userToEdit.employeeName || ''
    });
    setShowEditForm(true);
    setError('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setFormLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (response.ok) {
        setShowEditForm(false);
        setEditingUser(null);
        fetchUsers(); // Refresh the users list
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (error) {
      setError('Failed to update user. Please try again.');
    }
    setFormLoading(false);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchUsers(); // Refresh the users list
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      alert('Failed to delete user. Please try again.');
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        user={user} 
        isCollapsed={sidebarCollapsed} 
        onToggle={toggleSidebar}
      />

      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-52'}`}>
        <Header
          user={user}
          onToggleSidebar={toggleSidebar}
        />

        <main className="p-6">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-800">Manage employee accounts and system settings</p>
            </div>

            {activeTab === 'users' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <PlusIcon />
                <span>Add Employee</span>
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'attendance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Manage Attendance
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'users' && (
            <>
              {/* Users List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Employee Accounts</h2>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-800">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{userItem.name}</div>
                          {userItem.employeeName && (
                            <div className="text-sm text-gray-800">{userItem.employeeName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                          {userItem.employeeId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                          {userItem.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                          {userItem.position || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userItem.role === 'admin'
                              ? 'bg-red-100 text-red-800'
                              : userItem.role === 'manager'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {userItem.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                          {userItem.department || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setPermissionsUser(userItem);
                                setShowPermissionsModal(true);
                              }}
                              className="text-purple-600 hover:text-purple-900 transition-colors"
                              title="Manage permissions"
                            >
                              <ShieldIcon />
                            </button>
                            <button
                              onClick={() => handleEditUser(userItem)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Edit user"
                            >
                              <EditIcon />
                            </button>
                            {userItem.id !== user.id && (
                              <button
                                onClick={() => handleDeleteUser(userItem.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Delete user"
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            </>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <AttendanceManagementTab />
          )}

          {/* Create User Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Employee Account</h2>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="john@gowater.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={createForm.password}
                        onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                        className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                        style={{ color: '#000000', backgroundColor: '#ffffff' }}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Role</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm({...createForm, role: e.target.value as 'admin' | 'manager' | 'employee'})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Department</label>
                    <input
                      type="text"
                      value={createForm.department}
                      onChange={(e) => setCreateForm({...createForm, department: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="IT, Sales, Marketing..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Employee ID</label>
                    <input
                      type="text"
                      value={createForm.employeeId}
                      onChange={(e) => setCreateForm({...createForm, employeeId: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="R-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Position</label>
                    <input
                      type="text"
                      value={createForm.position}
                      onChange={(e) => setCreateForm({...createForm, position: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="Software Developer, Manager..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Employee Name (Display)</label>
                    <input
                      type="text"
                      value={createForm.employeeName}
                      onChange={(e) => setCreateForm({...createForm, employeeName: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="Anne (optional display name)"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setError('');
                        setCreateForm({
                          email: '',
                          password: '',
                          name: '',
                          employeeId: '',
                          role: 'employee',
                          position: '',
                          department: '',
                          employeeName: ''
                        });
                      }}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-800 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {formLoading ? 'Creating...' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {showEditForm && editingUser && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Employee: {editingUser.name}</h2>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Employee ID</label>
                    <input
                      type="text"
                      value={editForm.employeeId}
                      onChange={(e) => setEditForm({...editForm, employeeId: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="R-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Position</label>
                    <input
                      type="text"
                      value={editForm.position}
                      onChange={(e) => setEditForm({...editForm, position: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="Software Developer, Manager..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({...editForm, role: e.target.value as 'admin' | 'manager' | 'employee'})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Department</label>
                    <input
                      type="text"
                      value={editForm.department}
                      onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="IT, Sales, Marketing..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Employee Name (Display)</label>
                    <input
                      type="text"
                      value={editForm.employeeName}
                      onChange={(e) => setEditForm({...editForm, employeeName: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="Anne (optional display name)"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditForm(false);
                        setEditingUser(null);
                        setError('');
                      }}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded text-gray-800 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {formLoading ? 'Updating...' : 'Update User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* User Permissions Modal */}
          {showPermissionsModal && permissionsUser && (
            <UserPermissionsModal
              userId={permissionsUser.id}
              userName={permissionsUser.name}
              userRole={permissionsUser.role}
              onClose={() => {
                setShowPermissionsModal(false);
                setPermissionsUser(null);
              }}
              onSuccess={() => {
                fetchUsers(); // Refresh the users list
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// Icon Components
function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

function ShieldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}