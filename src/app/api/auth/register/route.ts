import { NextRequest, NextResponse } from 'next/server';
import { registerUser, validatePassword } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['user', 'admin']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, password, name, role } = validation.data;

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, error: 'Password does not meet requirements', details: passwordValidation.errors },
        { status: 400 }
      );
    }

    const result = await registerUser({ email, password, name, role });

    if (result.success) {
      return NextResponse.json({
        success: true,
        user: result.user,
        token: result.token,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}