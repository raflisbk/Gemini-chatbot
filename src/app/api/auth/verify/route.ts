// src/app/api/auth/verify/route.ts - NEW FILE FOR TOKEN VERIFICATION

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserById } from '@/lib/supabase';

interface VerifyResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    isActive: boolean;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<VerifyResponse>> {
  try {
    // Get token from Authorization header or body
    const authorization = request.headers.get('authorization');
    let token = authorization?.replace('Bearer ', '');

    if (!token) {
      const body = await request.json().catch(() => ({}));
      token = body.token;
    }

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No token provided' 
        },
        { status: 401 }
      );
    }

    // Verify JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Server configuration error' 
        },
        { status: 500 }
      );
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

      // Get user from database
      const user = await getUserById(decoded.userId);

      if (!user) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'User not found' 
          },
          { status: 404 }
        );
      }

      if (!user.is_active) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Account is deactivated' 
          },
          { status: 403 }
        );
      }

      // Return user data
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'admin' | 'user',
          isActive: user.is_active,
        },
      });

    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired token' 
        },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests' 
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests' 
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests' 
    },
    { status: 405 }
  );
}