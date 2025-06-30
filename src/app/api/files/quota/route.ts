import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getUserStorageUsage, checkStorageQuota } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const [usage, quota] = await Promise.all([
      getUserStorageUsage(user.id),
      checkStorageQuota(user.id)
    ]);

    return NextResponse.json({
      success: true,
      usage,
      quota
    });
  } catch (error) {
    console.error('Get quota API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}