import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
}

interface SubTaskReportData {
  subtask_id: string;
  subtask_title: string;
  status: string;
  description?: string;
}

interface TaskReportData {
  task_id: string;
  task_title: string;
  task_status: string;
  task_priority?: string;
  notes?: string;
  subTasks?: SubTaskReportData[];
}

interface CreateReportRequest {
  report_type: string;
  report_date: string;
  check_in_time?: string;
  break_duration?: number;
  tasks: TaskReportData[];
}

/**
 * POST /api/reports
 * Create a new task report
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userId = decoded.userId;

    const body: CreateReportRequest = await request.json();
    const { report_type, report_date, check_in_time, break_duration, tasks } = body;

    // Validation
    if (!report_type || !report_date || !tasks || tasks.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: report_type, report_date, tasks' },
        { status: 400 }
      );
    }

    const db = getDb();
    const reportId = randomUUID();

    // Create main report
    const reportData = {
      id: reportId,
      user_id: userId,
      report_type,
      report_date,
      check_in_time: check_in_time || null,
      break_duration: break_duration || 0,
      status: 'draft',
      whatsapp_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.insert('task_reports', reportData as Record<string, unknown>);

    // Create task report items
    for (const task of tasks) {
      const taskItemId = randomUUID();

      const taskItemData = {
        id: taskItemId,
        report_id: reportId,
        task_id: task.task_id,
        task_title: task.task_title,
        task_status: task.task_status,
        task_priority: task.task_priority || null,
        notes: task.notes || null,
        created_at: new Date().toISOString(),
      };

      await db.insert('task_report_items', taskItemData as Record<string, unknown>);

      // Create subtask report items
      if (task.subTasks && task.subTasks.length > 0) {
        for (const subtask of task.subTasks) {
          const subtaskItemData = {
            id: randomUUID(),
            report_item_id: taskItemId,
            subtask_id: subtask.subtask_id,
            subtask_title: subtask.subtask_title,
            status: subtask.status,
            description: subtask.description || null,
            created_at: new Date().toISOString(),
          };

          await db.insert('subtask_report_items', subtaskItemData as Record<string, unknown>);
        }
      }

      // Update task's last_reported_at
      await db.update('tasks', {
        last_reported_at: new Date().toISOString(),
        last_report_id: reportId,
      }, { id: task.task_id });
    }

    return NextResponse.json({
      report: reportData,
      message: 'Report created successfully'
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating report', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports
 * Get all reports for the current user
 * Query params:
 *   - report_type (optional): Filter by report type
 *   - start_date (optional): Filter by date range
 *   - end_date (optional): Filter by date range
 *   - status (optional): Filter by status (draft, sent)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userId = decoded.userId;

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('report_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status');

    const db = getDb();

    // Build filter
    const filter: Record<string, unknown> = { user_id: userId };
    if (reportType) filter.report_type = reportType;
    if (status) filter.status = status;

    // Get reports
    const reports = await db.all('task_reports', filter, 'report_date DESC, created_at DESC');

    // Apply date range filter if provided
    let filteredReports = reports;
    if (startDate || endDate) {
      filteredReports = reports.filter((report: Record<string, unknown>) => {
        const reportDate = report.report_date as string;
        if (startDate && reportDate < startDate) return false;
        if (endDate && reportDate > endDate) return false;
        return true;
      });
    }

    // Get task counts for each report
    const reportsWithCounts = await Promise.all(
      filteredReports.map(async (report: Record<string, unknown>) => {
        const taskItems = await db.all('task_report_items', { report_id: report.id }, '');
        const taskCount = taskItems.length;

        let subtaskCount = 0;
        for (const taskItem of taskItems) {
          const subtasks = await db.all('subtask_report_items', { report_item_id: (taskItem as Record<string, unknown>).id }, '');
          subtaskCount += subtasks.length;
        }

        return {
          ...report,
          task_count: taskCount,
          subtask_count: subtaskCount,
        };
      })
    );

    return NextResponse.json({
      reports: reportsWithCounts,
      message: 'Reports fetched successfully'
    });
  } catch (error) {
    logger.error('Error fetching reports', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reports
 * Update a report (only draft reports can be updated)
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userId = decoded.userId;

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if report exists and belongs to user
    const report = await db.get('task_reports', { id });
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const reportData = report as Record<string, unknown>;
    if (reportData.user_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Not your report' },
        { status: 403 }
      );
    }

    // Only allow updating draft reports
    if (reportData.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot update sent reports' },
        { status: 400 }
      );
    }

    // Update report
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await db.update('task_reports', updateData, { id });

    return NextResponse.json({
      message: 'Report updated successfully'
    });
  } catch (error) {
    logger.error('Error updating report', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports
 * Delete a report (only draft reports can be deleted)
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userId = decoded.userId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if report exists and belongs to user
    const report = await db.get('task_reports', { id });
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const reportData = report as Record<string, unknown>;
    if (reportData.user_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Not your report' },
        { status: 403 }
      );
    }

    // Only allow deleting draft reports
    if (reportData.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot delete sent reports' },
        { status: 400 }
      );
    }

    // Delete report (CASCADE will delete related task_report_items and subtask_report_items)
    await db.delete('task_reports', { id });

    return NextResponse.json({
      message: 'Report deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting report', error);
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    );
  }
}
