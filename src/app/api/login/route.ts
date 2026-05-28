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
    const { email, password } = await request.json();

    if (!email || !password) {
      return corsResponse({ error: 'MISSING_PARAMS', message: 'Email and password are required.' }, 400);
    }

    if (!isSupabaseConfigured || !supabase) {
      // Mock fallback for local testing
      if (email.includes('admin') || email.includes('parts')) {
        return corsResponse({
          success: true,
          user: { id: 'mock-user-id', email, role: 'user', password_reset_required: false },
          licenseKey: 'mock-license-key',
          dealerAccount: { id: 'mock-dealer-id', name: 'Mock Dealer Auto Group' }
        });
      }
      return corsResponse({ error: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' }, 401);
    }

    // 1. Check if user exists in public.users by email first
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    // 2. Check if they are logging in with a valid temporary passcode
    const isTempLogin = !!(userProfile && userProfile.temp_password && userProfile.temp_password === password);

    let finalUserProfile = userProfile;

    if (isTempLogin && userProfile) {
      // Temp login is valid! We skip Supabase Auth check and will require password reset.
    } else {
      // 3. Standard login via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        return corsResponse({ error: 'INVALID_CREDENTIALS', message: authError?.message || 'Invalid credentials.' }, 401);
      }

      // If we didn't fetch userProfile yet (or if email mismatch), fetch it now
      if (!finalUserProfile) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .ilike('email', authData.user.email || '')
          .maybeSingle();
        finalUserProfile = profile;
      }
    }

    if (!finalUserProfile) {
      return corsResponse({ error: 'USER_NOT_FOUND', message: 'User profile not found in database. Contact your dealer administrator.' }, 404);
    }

    // 4. Fetch dealer account
    const dealerId = finalUserProfile.dealer_account_id;
    const isMockDealer = dealerId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealerId);
    let dealer = null;

    if (dealerId && !isMockDealer) {
      const { data } = await supabase
        .from('dealer_accounts')
        .select('*')
        .eq('id', dealerId)
        .maybeSingle();
      dealer = data;
    } else if (dealerId && isMockDealer) {
      dealer = { id: dealerId, name: 'Hendrick Automotive Group' };
    }

    // 5. Fetch assigned license for the user (using profile ID, not auth UUID)
    const userId = finalUserProfile.id;
    const isMockUser = userId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    let license = null;

    if (userId && !isMockUser) {
      const { data } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      license = data;
    } else if (userId && isMockUser) {
      license = { id: `lic-mock-${userId}`, dealer_account_id: dealerId, user_id: userId };
    }

    if (!license) {
      return corsResponse({ error: 'NO_LICENSE_ASSIGNED', message: 'No license seat is assigned to this user profile. Please contact your dealer administrator.' }, 403);
    }

    return corsResponse({
      success: true,
      user: {
        id: finalUserProfile.id,
        email: finalUserProfile.email,
        role: finalUserProfile.role,
        password_reset_required: finalUserProfile.password_reset_required || isTempLogin
      },
      licenseKey: license.id,
      dealerAccount: dealer ? { id: dealer.id, name: dealer.name } : null
    });

  } catch (err: any) {
    console.error('API login error:', err);
    return corsResponse({ error: 'SERVER_ERROR', message: err.message }, 500);
  }
}
