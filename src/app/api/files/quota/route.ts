// src/app/api/files/quota/route.ts - COMPLETE FIXED VERSION

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getUserStorageUsage, checkStorageQuota } from '@/lib/storage'; // FIXED: Correct imports

// ========================================
// INTERFACES
// ========================================

interface QuotaResponse {
  success: boolean;
  usage?: {
    totalStorage: number;
    usedStorage: number;
    remainingStorage: number;
    fileCount: number;
    usagePercentage: number;
  };
  quota?: {
    isOverQuota: boolean;
    currentUsage: number;
    limit: number;
    remainingStorage: number;
  };
  error?: string;
  errorType?: string;
}

interface QuotaCheckResponse {
  success: boolean;
  allowed?: boolean;
  quota?: {
    isOverQuota: boolean;
    currentUsage: number;
    limit: number;
    remainingStorage: number;
    fileSize?: number;
    totalAfterUpload?: number;
  };
  error?: string;
  errorType?: string;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function calculateUsagePercentage(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ========================================
// GET /api/files/quota - GET USER QUOTA INFO
// ========================================

export async function GET(request: NextRequest): Promise<NextResponse<QuotaResponse>> {
  try {
    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          errorType: 'auth_required'
        },
        { status: 401 }
      );
    }

    // Get user storage usage and quota
    const [usage, quota] = await Promise.all([
      getUserStorageUsage(user.id),
      checkStorageQuota(user.id)
    ]);

    // Calculate usage percentage
    const usagePercentage = calculateUsagePercentage(usage.usedStorage, usage.totalStorage);

    // Return quota information
    return NextResponse.json({
      success: true,
      usage: {
        totalStorage: usage.totalStorage,
        usedStorage: usage.usedStorage,
        remainingStorage: usage.remainingStorage,
        fileCount: usage.fileCount,
        usagePercentage
      },
      quota: {
        isOverQuota: quota.isOverQuota,
        currentUsage: quota.currentUsage,
        limit: quota.limit,
        remainingStorage: quota.remainingStorage
      }
    });

  } catch (error) {
    console.error('Get quota API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('access')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
            errorType: 'permission_denied'
          },
          { status: 403 }
        );
      }
      
      if (error.message.includes('network') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database connection error',
            errorType: 'network_error'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        errorType: 'server_error'
      },
      { status: 500 }
    );
  }
}

// ========================================
// POST /api/files/quota - CHECK QUOTA FOR FILE UPLOAD
// ========================================

export async function POST(request: NextRequest): Promise<NextResponse<QuotaCheckResponse>> {
  try {
    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          errorType: 'auth_required'
        },
        { status: 401 }
      );
    }

    // Parse request body to get file size
    let fileSize = 0;
    try {
      const body = await request.json();
      fileSize = body.fileSize || body.size || 0;
      
      if (typeof fileSize !== 'number' || fileSize < 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid file size provided',
            errorType: 'validation_error'
          },
          { status: 400 }
        );
      }
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          errorType: 'parse_error'
        },
        { status: 400 }
      );
    }

    // Check quota with file size
    const quota = await checkStorageQuota(user.id, fileSize);
    const totalAfterUpload = quota.currentUsage + fileSize;

    // Determine if upload is allowed
    const allowed = !quota.isOverQuota && totalAfterUpload <= quota.limit;

    return NextResponse.json({
      success: true,
      allowed,
      quota: {
        isOverQuota: quota.isOverQuota,
        currentUsage: quota.currentUsage,
        limit: quota.limit,
        remainingStorage: quota.remainingStorage,
        fileSize,
        totalAfterUpload
      }
    });

  } catch (error) {
    console.error('Check quota API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('access')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
            errorType: 'permission_denied'
          },
          { status: 403 }
        );
      }
      
      if (error.message.includes('network') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database connection error',
            errorType: 'network_error'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        errorType: 'server_error'
      },
      { status: 500 }
    );
  }
}

// ========================================
// PUT /api/files/quota - UPDATE USER QUOTA (ADMIN ONLY)
// ========================================

export async function PUT(request: NextRequest): Promise<NextResponse<QuotaResponse>> {
  try {
    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          errorType: 'auth_required'
        },
        { status: 401 }
      );
    }

    // Check admin permissions
    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin access required',
          errorType: 'permission_denied'
        },
        { status: 403 }
      );
    }

    // Parse request body
    let updateData;
    try {
      const body = await request.json();
      updateData = body;
      
      if (!updateData.userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'User ID is required',
            errorType: 'validation_error'
          },
          { status: 400 }
        );
      }
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          errorType: 'parse_error'
        },
        { status: 400 }
      );
    }

    // Get updated quota information
    const [usage, quota] = await Promise.all([
      getUserStorageUsage(updateData.userId),
      checkStorageQuota(updateData.userId)
    ]);

    const usagePercentage = calculateUsagePercentage(usage.usedStorage, usage.totalStorage);

    return NextResponse.json({
      success: true,
      usage: {
        totalStorage: usage.totalStorage,
        usedStorage: usage.usedStorage,
        remainingStorage: usage.remainingStorage,
        fileCount: usage.fileCount,
        usagePercentage
      },
      quota: {
        isOverQuota: quota.isOverQuota,
        currentUsage: quota.currentUsage,
        limit: quota.limit,
        remainingStorage: quota.remainingStorage
      }
    });

  } catch (error) {
    console.error('Update quota API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        errorType: 'server_error'
      },
      { status: 500 }
    );
  }
}

// ========================================
// OPTIONS - CORS SUPPORT
// ========================================

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}