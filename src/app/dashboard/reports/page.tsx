'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types/attendance';
import * as XLSX from 'xlsx';

interface AttendanceReport {
  date: string;
  timeIn: string;
  timeOut: string;
  workHours: string;
  breakTime: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  overtime: string;
}

interface TaskReport {
  taskName: string;
  project: string;
  assignee: string;
  status: string;
  priority: string;
  timeSpent: string;
  dueDate: string;
  completionDate: string;
}

interface LeaveReport {
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  appliedDate: string;
}

export default function Reports() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'attendance' | 'tasks' | 'leaves' | 'time'>('attendance');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // Database-driven data
  const [attendanceData, setAttendanceData] = useState<AttendanceReport[]>([]);
  const [tasksData, setTasksData] = useState<TaskReport[]>([]);
  const [leavesData, setLeavesData] = useState<LeaveReport[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Data will be loaded from database APIs
    setAttendanceData([]);
    setTasksData([]);
    setLeavesData([]);
  }, []);

  const exportToExcel = (reportType: string) => {
    let data: unknown[] = [];
    let fileName = '';

    switch (reportType) {
      case 'attendance':
        data = attendanceData;
        fileName = `Attendance_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`;
        break;
      case 'tasks':
        data = tasksData;
        fileName = `Tasks_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`;
        break;
      case 'leaves':
        data = leavesData;
        fileName = `Leave_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`;
        break;
      case 'summary':
        // Create summary report
        data = [
          {
            'Report Type': 'Summary',
            'Generated Date': new Date().toLocaleDateString(),
            'Period': `${dateRange.startDate} to ${dateRange.endDate}`,
            'Employee': user?.name || 'Employee',
            'Total Attendance Days': attendanceData.length,
            'Present Days': attendanceData.filter(d => d.status === 'Present').length,
            'Late Days': attendanceData.filter(d => d.status === 'Late').length,
            'Total Tasks': tasksData.length,
            'Completed Tasks': tasksData.filter(t => t.status === 'Completed').length,
            'Total Leaves': leavesData.length,
            'Approved Leaves': leavesData.filter(l => l.status === 'Approved').length
          }
        ];
        fileName = `Summary_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`;
        break;
    }

    if (data.length === 0) {
      alert('No data available for the selected period');
      return;
    }

    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Add some styling to headers
      const headerStyle = {
        font: { bold: true },
        fill: { fgColor: { rgb: "366092" } }
      };

      // Apply header styling (first row)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = headerStyle;
      }

      // Auto-width columns
      const colWidths: { wch: number }[] = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        let maxWidth = 10;
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = ws[cellAddress];
          if (cell && cell.v) {
            const cellLength = cell.v.toString().length;
            maxWidth = Math.max(maxWidth, cellLength);
          }
        }
        colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
      }
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, reportType.charAt(0).toUpperCase() + reportType.slice(1));

      // Write and download file
      XLSX.writeFile(wb, fileName);
      
      alert(`Excel file "${fileName}" has been downloaded successfully!`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in progress': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotalWorkHours = () => {
    return attendanceData.reduce((total, record) => {
      const [hours, minutes] = record.workHours.split(':').map(Number);
      return total + hours + (minutes / 60);
    }, 0).toFixed(1);
  };

  const calculateCompletionRate = () => {
    const completed = tasksData.filter(t => t.status === 'Completed').length;
    return tasksData.length > 0 ? ((completed / tasksData.length) * 100).toFixed(1) : '0';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-700 font-medium">Generate and export detailed reports</p>
          </div>
          <button
            onClick={() => exportToExcel('summary')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <DownloadIcon className="w-5 h-5" />
            <span>Export Summary</span>
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Report Period</h3>
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Total Work Hours</p>
                <p className="text-2xl font-bold text-blue-600">{calculateTotalWorkHours()}h</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <ClockIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Attendance Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {attendanceData.length > 0 ? Math.round((attendanceData.filter(d => d.status === 'Present' || d.status === 'Late').length / attendanceData.length) * 100) : 0}%
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Task Completion</p>
                <p className="text-2xl font-bold text-purple-600">{calculateCompletionRate()}%</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <TaskIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Leave Days</p>
                <p className="text-2xl font-bold text-orange-600">{leavesData.reduce((sum, leave) => sum + leave.days, 0)}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <CalendarIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'attendance', label: 'Attendance Report', count: attendanceData.length },
                { id: 'tasks', label: 'Tasks Report', count: tasksData.length },
                { id: 'leaves', label: 'Leave Report', count: leavesData.length },
                { id: 'time', label: 'Time Tracking', count: 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'attendance' | 'tasks' | 'leaves' | 'time')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-700 hover:text-gray-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="bg-gray-100 text-gray-800 text-xs rounded-full px-2 py-1">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {activeTab === 'attendance' && 'Attendance Report'}
                {activeTab === 'tasks' && 'Tasks Report'}
                {activeTab === 'leaves' && 'Leave Report'}
                {activeTab === 'time' && 'Time Tracking Report'}
              </h3>
              <button
                onClick={() => exportToExcel(activeTab)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>Export to Excel</span>
              </button>
            </div>

            {/* Attendance Report */}
            {activeTab === 'attendance' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left p-4 font-semibold text-gray-900">Date</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Time In</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Time Out</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Work Hours</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Break Time</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Overtime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map((record, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-gray-900">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="p-4 text-gray-700">{record.timeIn}</td>
                        <td className="p-4 text-gray-700">{record.timeOut}</td>
                        <td className="p-4 font-medium text-gray-900">{record.workHours}</td>
                        <td className="p-4 text-gray-700">{record.breakTime}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-700">{record.overtime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tasks Report */}
            {activeTab === 'tasks' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left p-4 font-semibold text-gray-900">Task Name</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Project</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Assignee</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Priority</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Time Spent</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksData.map((task, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">{task.taskName}</td>
                        <td className="p-4 text-gray-700">{task.project}</td>
                        <td className="p-4 text-gray-700">{task.assignee}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            task.priority === 'High' ? 'bg-red-100 text-red-800' : 
                            task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="p-4 text-gray-700">{task.timeSpent}</td>
                        <td className="p-4 text-gray-700">{new Date(task.dueDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Leave Report */}
            {activeTab === 'leaves' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left p-4 font-semibold text-gray-900">Leave Type</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Start Date</th>
                      <th className="text-left p-4 font-semibold text-gray-900">End Date</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Days</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Reason</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Applied Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leavesData.map((leave, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">{leave.leaveType}</td>
                        <td className="p-4 text-gray-700">{new Date(leave.startDate).toLocaleDateString()}</td>
                        <td className="p-4 text-gray-700">{new Date(leave.endDate).toLocaleDateString()}</td>
                        <td className="p-4 text-gray-900">{leave.days}</td>
                        <td className="p-4 text-gray-700">{leave.reason}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(leave.status)}`}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-700">{new Date(leave.appliedDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Time Tracking Report */}
            {activeTab === 'time' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClockIcon className="w-8 h-8 text-gray-800" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Time Tracking Report</h3>
                <p className="text-gray-800 mb-4">Detailed time tracking reports will be available soon</p>
                <button
                  onClick={() => exportToExcel('attendance')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Export Attendance Instead
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon Components
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}