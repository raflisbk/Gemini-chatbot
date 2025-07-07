// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'user']).default('user'),
});

// ========================================
// HELPER FUNCTIONS
// ========================================

async function verifyAdminAuth(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    const cookieToken = request.cookies.get('auth-session')?.value;
    
    const token = authorization?.replace('Bearer ', '') || cookieToken;
    
    if (!token) {
      return { isValid: false, error: 'No authentication token' };
    }

    if (!process.env.JWT_SECRET) {
      return { isValid: false, error: 'JWT secret not configured' };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    if (decoded.role !== 'admin') {
      return { isValid: false, error: 'Admin access required' };
    }

    return { isValid: true, userId: decoded.userId };
  } catch (error) {
    return { isValid: false, error: 'Invalid token' };
  }
}

async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

// ========================================
// GET - List all users (Admin only)
// ========================================

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await verifyAdminAuth(request);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    // Get all users
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, is_active, created_at, updated_at, message_count')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: users || []
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========================================
// POST - Create new user (Admin only)
// ========================================

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await verifyAdminAuth(request);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { email, name, password, role } = validation.data;

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: email.toLowerCase(),
        name,
        password_hash: passwordHash,
        role,
        is_active: true,
        message_count: 0,
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, email, name, role, is_active, created_at')
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Log admin action
    console.log(`Admin ${auth.userId} created user ${newUser.email} with role ${role}`);

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: newUser
    }, { status: 201 });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========================================
// Error handlers for unsupported methods
// ========================================

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Use /api/admin/users/[id] for deleting specific users' },
    { status: 405 }
  );
}