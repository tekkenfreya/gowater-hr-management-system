'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { AttendanceRecordWithUser, AttendanceManagementFilters } from '@/types/attendance';

interface AttendanceStats {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  averageHours: number;
  automatedCount: number;
}

export default function AttendanceManagementTab() {
  const [records, setRecords] = useState<AttendanceRecordWithUser[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AttendanceManagementFilters>({
    page: 1,
    limit: 20
  });
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId.toString());
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status) params.append('status', filters.status);
      if (filters.workLocation) params.append('workLocation', filters.workLocation);
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '20');

      const response = await fetch(`/api/admin/attendance?${params}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setRecords(data.records);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      logger.error('Failed to fetch attendance', error);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      // Stats endpoint would need to be implemented
      // For now, we'll skip this or calculate from records
    } catch (error) {
      logger.error('Failed to fetch stats', error);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.userId, filters.startDate, filters.endDate, filters.status, filters.workLocation, filters.page, filters.limit]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId) params.append('userId', filters.userId.toString());

      window.location.href = `/api/admin/attendance/export?${params}`;
    } catch (error) {
      logger.error('Failed to export', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) {
      alert('Please select records to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedRecords.length} records?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delete',
          attendanceIds: selectedRecords
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully deleted ${data.affected} records`);
        setSelectedRecords([]);
        fetchAttendance();
      } else {
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      logger.error('Failed to delete records', error);
      alert('Failed to delete records');
    }
  };

  const toggleSelectRecord = (id: number) => {
    setSelectedRecords(prev =>
      prev.includes(id)
        ? prev.filter(recordId => recordId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map(r => r.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as typeof filters.status, page: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="on_duty">On Duty</option>
              <option value="leave">Leave</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
            <select
              value={filters.workLocation || ''}
              onChange={(e) => setFilters({ ...filters, workLocation: e.target.value as typeof filters.workLocation, page: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="WFH">WFH</option>
              <option value="Onsite">Onsite</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-3 mt-4">
          <button
            onClick={() => setFilters({ page: 1, limit: 20 })}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <DownloadIcon />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Actions Bar */}
      {selectedRecords.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-900 font-medium">
            {selectedRecords.length} record(s) selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Delete Selected
          </button>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Attendance Records</h2>
          <span className="text-sm text-gray-600">
            Page {filters.page} of {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading attendance...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No attendance records found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRecords.length === records.length && records.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(record.id)}
                          onChange={() => toggleSelectRecord(record.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.userName}</div>
                        <div className="text-sm text-gray-500">{record.userDepartment}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.totalHours.toFixed(2)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'present'
                            ? 'bg-green-100 text-green-800'
                            : record.status === 'late'
                            ? 'bg-yellow-100 text-yellow-800'
                            : record.status === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status}
                          {record.isAutomated && ' 🤖'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.workLocation || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                disabled={(filters.page || 1) <= 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {filters.page || 1} of {totalPages}
              </span>
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                disabled={(filters.page || 1) >= totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Icon Component
function DownloadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
