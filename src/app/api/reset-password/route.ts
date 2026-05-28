import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

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

    const client = supabaseAdmin || supabase;

    if (!supabaseAdmin) {
      console.warn('[RESET PASSWORD API] supabaseAdmin client is not initialized. Database queries might be restricted by RLS.');
    }

    // 1. Fetch user profile from public.users to check the temporary passcode
    const { data: userProfile, error: profileError } = await client
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (profileError || !userProfile) {
      return corsResponse({ error: 'USER_NOT_FOUND', message: 'User profile not found in database.' }, 404);
    }

    const isTempPassword = userProfile.temp_password && userProfile.temp_password === password;

    if (isTempPassword) {
      // 2a. Update password in Supabase Auth using the supabaseAdmin client (server-side only)
      if (supabaseAdmin) {
        // List users to see if they exist in auth schema
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          return corsResponse({ error: 'ADMIN_ERROR', message: listError.message }, 500);
        }
        
        const existingAuthUser = listData?.users.find(u => u.email ? u.email.toLowerCase() === email.toLowerCase() : false);

        if (existingAuthUser) {
          // Update password for existing user in auth.users
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingAuthUser.id,
            { password: newPassword }
          );
          if (updateError) {
            return corsResponse({ error: 'UPDATE_FAILED', message: updateError.message }, 400);
          }
        } else {
          // Provision/Create the user in auth.users automatically
          const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: newPassword,
            email_confirm: true
          });
          if (createError) {
            return corsResponse({ error: 'PROVISION_FAILED', message: createError.message }, 400);
          }
        }
      } else {
        return corsResponse({ error: 'CONFIG_ERROR', message: 'Service role key is not configured on the server. Cannot provision Auth user.' }, 500);
      }
    } else {
      // 2b. Standard fallback: Authenticate with the current password first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        return corsResponse({ error: 'INVALID_CREDENTIALS', message: 'Failed to authenticate with current password.' }, 401);
      }

      // Update password using client instance
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        return corsResponse({ error: 'UPDATE_FAILED', message: updateError.message }, 400);
      }
    }

    // 3. Clear temp password and password_reset_required in public.users (match by email/id)
    const { error: updateProfileError } = await client
      .from('users')
      .update({
        temp_password: null,
        password_reset_required: false
      })
      .eq('id', userProfile.id);

    if (updateProfileError) {
      console.error('[RESET PASSWORD API] Failed to clear user temp_password:', updateProfileError);
      return corsResponse({ error: 'DB_ERROR', message: 'Failed to update user profile flags.' }, 500);
    }

    return corsResponse({ success: true, message: 'Password updated successfully. You can now use the extension.' });

  } catch (err: any) {
    console.error('Password reset API error:', err);
    return corsResponse({ error: 'SERVER_ERROR', message: err.message }, 500);
  }
}
