'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface ReportData {
  type: string;
  period: string;
  generatedDate: string;
  status: 'ready' | 'generating' | 'failed';
  downloadUrl?: string;
}

export default function TeamReportsPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportType, setSelectedReportType] = useState('attendance');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isLoading && user === null) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    // TODO: Fetch existing reports from API
    // For now, showing sample data
    const sampleReports: ReportData[] = [
      {
        type: 'Team Attendance Summary',
        period: 'November 2024',
        generatedDate: '2024-12-01',
        status: 'ready',
        downloadUrl: '/reports/attendance-nov-2024.xlsx'
      },
      {
        type: 'Leave Balance Report',
        period: 'Q4 2024',
        generatedDate: '2024-12-01',
        status: 'ready',
        downloadUrl: '/reports/leave-balance-q4-2024.pdf'
      },
      {
        type: 'Productivity Report',
        period: 'November 2024',
        generatedDate: '2024-11-30',
        status: 'generating'
      }
    ];
    
    setReports(sampleReports);
    setLoading(false);
  }, [user, router]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      // TODO: Implement API call to generate report
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      const newReport: ReportData = {
        type: getReportTypeName(selectedReportType),
        period: getPeriodName(selectedPeriod),
        generatedDate: new Date().toISOString().split('T')[0],
        status: 'ready',
        downloadUrl: `/reports/${selectedReportType}-${selectedPeriod}-${Date.now()}.xlsx`
      };
      
      setReports(prev => [newReport, ...prev]);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
    
    setIsGenerating(false);
  };

  const getReportTypeName = (type: string) => {
    const names = {
      attendance: 'Team Attendance Summary',
      leave: 'Leave Balance Report',
      productivity: 'Productivity Report',
      tasks: 'Task Performance Report'
    };
    return names[type as keyof typeof names] || type;
  };

  const getPeriodName = (period: string) => {
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const names = {
      weekly: `Week of ${currentDate.toLocaleDateString()}`,
      monthly: currentMonth,
      quarterly: `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`,
      yearly: currentDate.getFullYear().toString()
    };
    return names[period as keyof typeof names] || period;
  };

  const getStatusBadge = (status: ReportData['status']) => {
    const statusStyles = {
      ready: 'bg-green-100 text-green-800',
      generating: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    };

    const statusText = {
      ready: 'Ready',
      generating: 'Generating...',
      failed: 'Failed'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {statusText[status]}
      </span>
    );
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

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading) {
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
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Team Reports</h1>
            <p className="text-gray-700">Generate and download comprehensive team performance reports</p>
          </div>

          {/* Report Generator */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Report</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Report Type</label>
                <select
                  value={selectedReportType}
                  onChange={(e) => setSelectedReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="attendance">Team Attendance Summary</option>
                  <option value="leave">Leave Balance Report</option>
                  <option value="productivity">Productivity Report</option>
                  <option value="tasks">Task Performance Report</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Time Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">This Week</option>
                  <option value="monthly">This Month</option>
                  <option value="quarterly">This Quarter</option>
                  <option value="yearly">This Year</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generateReport}
                  disabled={isGenerating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Generate Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="text-blue-800 font-medium">Report Information:</p>
                  <p className="text-blue-700 mt-1">
                    This will generate a <strong>{getReportTypeName(selectedReportType)}</strong> for <strong>{getPeriodName(selectedPeriod)}</strong>. 
                    The report will be available for download once generated.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Reports */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Generated Reports</h2>
            </div>

            {reports.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No reports generated</h3>
                <p className="mt-1 text-sm text-gray-800">
                  Generate your first report using the form above.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {reports.map((report, index) => (
                  <div key={index} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900">{report.type}</h3>
                          {getStatusBadge(report.status)}
                        </div>
                        <div className="text-sm text-gray-700 mb-1">
                          <strong>Period:</strong> {report.period}
                        </div>
                        <div className="text-xs text-gray-800">
                          Generated on {new Date(report.generatedDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {report.status === 'ready' && report.downloadUrl && (
                          <button
                            onClick={() => window.open(report.downloadUrl, '_blank')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Download</span>
                          </button>
                        )}
                        {report.status === 'generating' && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}