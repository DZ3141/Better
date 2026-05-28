import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function corsResponse(data: any, status = 200) {
  const response = NextResponse.json(data, { status });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function POST(request: Request) {
  try {
    const { email, password, newPassword } = await request.json();

    if (!email || !password || !newPassword) {
      return corsResponse({ error: 'MISSING_PARAMS', message: 'Email, current passcode, and new password are required.' }, 400);
    }

    if (!isSupabaseConfigured || !supabase) {
      return corsResponse({ success: true, message: 'Mock password updated successfully.' });
    }

    // 1. Authenticate with temp password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return corsResponse({ error: 'INVALID_CREDENTIALS', message: 'Failed to authenticate with current passcode.' }, 401);
    }

    // 2. Update password in Supabase Auth using client instance
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return corsResponse({ error: 'UPDATE_FAILED', message: updateError.message }, 400);
    }

    // 3. Clear temp password and password_reset_required in public.users
    const userId = authData.user.id;
    await supabase
      .from('users')
      .update({
        temp_password: null,
        password_reset_required: false
      })
      .eq('id', userId);

    return corsResponse({ success: true, message: 'Password updated successfully. You can now use the extension.' });

  } catch (err: any) {
    console.error('Password reset API error:', err);
    return corsResponse({ error: 'SERVER_ERROR', message: err.message }, 500);
  }
}
