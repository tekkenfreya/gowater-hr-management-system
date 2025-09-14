export interface User {
  id: string;
  email: string;
  name: string;
  role: 'employee' | 'supervisor' | 'admin';
  department: string;
  supervisorId?: string;
  employeeId: string;
  profileImage?: string;
  workSchedule: WorkSchedule;
  leaveBalance: LeaveBalance;
}

export interface WorkSchedule {
  workDays: string[]; // ['Monday', 'Tuesday', etc.]
  startTime: string; // '09:00'
  endTime: string; // '17:00'
  breakDuration: number; // minutes
  timezone: string;
}

export interface LeaveBalance {
  annual: number;
  sick: number;
  personal: number;
  maternity?: number;
  paternity?: number;
  total: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn?: Date;
  clockOut?: Date;
  breaks: BreakRecord[];
  totalWorkHours: number;
  totalBreakHours: number;
  status: 'present' | 'absent' | 'late' | 'early-leave' | 'holiday' | 'leave';
  location?: string;
  tasks: Task[];
  notes?: string;
  regularizationRequest?: RegularizationRequest;
  isHoliday: boolean;
  overtimeHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BreakRecord {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  type: 'lunch' | 'tea' | 'personal' | 'meeting';
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeSpent: number; // seconds
  isTimerRunning: boolean;
  estimatedHours?: number;
  category?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  halfDay: boolean;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  attachments: string[];
  emergencyContact?: string;
}

export interface RegularizationRequest {
  id: string;
  userId: string;
  date: string;
  type: 'missed-punch-in' | 'missed-punch-out' | 'early-leave' | 'late-arrival' | 'break-extension';
  requestedTime: string;
  actualTime?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

export interface WhatsAppReport {
  id: string;
  userId: string;
  type: 'start-report' | 'eod-report' | 'weekly-summary' | 'leave-notification' | 'supervisor-summary';
  content: string;
  sentAt: Date;
  status: 'pending' | 'sent' | 'failed';
  recipients: string[];
  metadata?: {
    attendanceId?: string;
    leaveRequestId?: string;
    tasks?: Task[];
    workHours?: number;
    breakHours?: number;
  };
}

export interface Department {
  id: string;
  name: string;
  description: string;
  supervisorId: string;
  employees: string[];
  workSchedule: WorkSchedule;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'religious' | 'company';
  isOptional: boolean;
  description?: string;
}

export interface AttendanceSummary {
  userId: string;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  totalWorkDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  leaveDays: number;
  holidayDays: number;
  totalWorkHours: number;
  totalBreakHours: number;
  overtimeHours: number;
  attendancePercentage: number;
  averageWorkHours: number;
  tasksCompleted: number;
  totalTasks: number;
  productivityScore: number;
}

export interface SupervisorDashboard {
  supervisorId: string;
  teamMembers: User[];
  pendingApprovals: {
    leaveRequests: LeaveRequest[];
    regularizationRequests: RegularizationRequest[];
  };
  teamAttendance: AttendanceSummary[];
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  teamProductivity: number;
}

export interface ExcelExportData {
  type: 'attendance' | 'leave' | 'tasks' | 'summary';
  period: {
    startDate: string;
    endDate: string;
  };
  userId?: string;
  departmentId?: string;
  data: unknown[];
  filename: string;
  generatedAt: Date;
  generatedBy: string;
}

export interface NotificationSettings {
  whatsapp: {
    enabled: boolean;
    phoneNumber: string;
    reports: {
      startReport: boolean;
      eodReport: boolean;
      weeklyReport: boolean;
      leaveNotifications: boolean;
    };
  };
  email: {
    enabled: boolean;
    reports: boolean;
    approvals: boolean;
  };
  push: {
    enabled: boolean;
    clockReminders: boolean;
    breakReminders: boolean;
  };
}

export interface AppSettings {
  workingHours: {
    start: string;
    end: string;
    breakDuration: number;
  };
  attendance: {
    allowEarlyClockIn: boolean;
    allowLateClockOut: boolean;
    requireLocation: boolean;
    autoClockOut: boolean;
    overtimeThreshold: number;
  };
  leave: {
    maxAdvanceRequest: number; // days
    requireApproval: boolean;
    carryOverLimit: number;
  };
  notifications: NotificationSettings;
}