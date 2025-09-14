import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/supabase';
import { Task } from '@/types/attendance';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

interface DbTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  due_date: string | null;
  status: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userId = decoded.userId;

    // Get tasks for the current user
    const database = getDb();
    const tasks = await database.all('tasks', { user_id: userId });

    return NextResponse.json({ 
      tasks: tasks || [],
      message: 'Tasks retrieved successfully' 
    });

  } catch (error) {
    console.error('Get tasks API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userId = decoded.userId;

    const body = await request.json();
    const { title, description, priority, due_date, status } = body;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create new task
    const database = getDb();
    const taskData = {
      user_id: userId,
      title: title.trim(),
      description: description?.trim() || '',
      priority: priority || 'medium',
      due_date: due_date || null,
      status: status || 'pending'
    };

    const task = await database.insert('tasks', taskData);

    return NextResponse.json({ 
      task,
      message: 'Task created successfully' 
    });

  } catch (error) {
    console.error('Create task API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userId = decoded.userId;

    const body = await request.json();
    const { id, title, description, priority, due_date, status } = body;

    // Convert frontend status values to database values
    const mapStatusToDb = (status: string) => {
      const statusMap: { [key: string]: string } = {
        'pending': 'pending',
        'in_progress': 'in_progress',
        'completed': 'completed',
        'blocked': 'blocked',
        'archived': 'archived'
      };
      return statusMap[status] || status;
    };

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify task belongs to user
    const database = getDb();
    const existingTask = await database.get<DbTask>('tasks', { id, user_id: userId });
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task
    const updateData = {
      title: title?.trim() || existingTask.title,
      description: description?.trim() || existingTask.description,
      priority: priority || existingTask.priority,
      due_date: due_date !== undefined ? due_date : existingTask.due_date,
      status: status ? mapStatusToDb(status) : existingTask.status
    };

    const updatedTask = await database.update('tasks', updateData, { id, user_id: userId });

    return NextResponse.json({ 
      task: updatedTask,
      message: 'Task updated successfully' 
    });

  } catch (error) {
    console.error('Update task API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userId = decoded.userId;

    const url = new URL(request.url);
    const taskId = url.searchParams.get('id');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify task belongs to user
    const database = getDb();
    const existingTask = await database.get<DbTask>('tasks', { id: taskId, user_id: userId });
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Delete task
    await database.delete('tasks', { id: taskId, user_id: userId });

    return NextResponse.json({ 
      message: 'Task deleted successfully' 
    });

  } catch (error) {
    console.error('Delete task API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}