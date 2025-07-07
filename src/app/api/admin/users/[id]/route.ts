// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'user']).optional(),
  is_active: z.boolean().optional(),
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

// ========================================
// GET - Get specific user (Admin only)
// ========================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const auth = await verifyAdminAuth(request);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get user by ID
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, is_active, created_at, updated_at, message_count, last_login')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching user:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========================================
// PATCH - Update user (Admin only)
// ========================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const auth = await verifyAdminAuth(request);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const { id } = params;

    // Parse and validate request body
    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      );
    }

    // Prevent admin from deactivating themselves
    if (updateData.is_active === false && existingUser.id === auth.userId) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, email, name, role, is_active, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Log admin action
    console.log(`Admin ${auth.userId} updated user ${existingUser.email}:`, updateData);

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========================================
// DELETE - Delete user (Admin only)
// ========================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const auth = await verifyAdminAuth(request);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if user exists and get their info
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      );
    }

    // Prevent admin from deleting themselves
    if (existingUser.id === auth.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if this is the last admin
    if (existingUser.role === 'admin') {
      const { data: adminCount, error: countError } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact' })
        .eq('role', 'admin')
        .eq('is_active', true);

      if (countError) {
        console.error('Error counting admins:', countError);
        return NextResponse.json(
          { error: 'Failed to verify admin count' },
          { status: 500 }
        );
      }

      if ((adminCount?.length || 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin account' },
          { status: 400 }
        );
      }
    }

    // Delete user (this will cascade to related records due to foreign key constraints)
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    // Log admin action
    console.log(`Admin ${auth.userId} deleted user ${existingUser.email}`);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========================================
// Error handler for unsupported methods
// ========================================

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use PATCH for updates.' },
    { status: 405 }
  );
}