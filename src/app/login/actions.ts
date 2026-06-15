'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const pin = formData.get('pin') as string;

  if (!email || !pin) {
    return { error: 'Email and PIN are required.' };
  }

  // Validate Binus Email
  if (!email.toLowerCase().endsWith('@binus.ac.id') && !email.toLowerCase().endsWith('@binus.edu')) {
    return { error: 'Please use a valid @binus.ac.id or @binus.edu email address.' };
  }

  // Fetch user role and PIN from user_roles
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase keys missing');
    return { error: 'System configuration error.' };
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role, pin, full_name')
    .eq('email', email)
    .single();

  if (!userRole) {
    return { error: 'User not found or unauthorized.' };
  }

  if (userRole.pin !== pin) {
    return { error: 'Invalid PIN.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('unievent_session', email.toLowerCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });

  // Also set a role cookie (not httpOnly) so client components can adjust UI
  cookieStore.set('unievent_role', userRole.role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  // Store email for client components (e.g. Profile, CRM actions)
  cookieStore.set('unievent_email', email.toLowerCase(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  if (userRole.full_name) {
    cookieStore.set('unievent_full_name', userRole.full_name, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  } else {
    // Generate formatted name from email prefix (e.g. budi.santoso -> Budi Santoso)
    const emailPrefix = email.split('@')[0];
    const formattedName = emailPrefix.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    
    // Update Supabase to set the default permanently
    await supabase
      .from('user_roles')
      .update({ full_name: formattedName })
      .eq('email', email);
      
    // Set the cookie
    cookieStore.set('unievent_full_name', formattedName, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  }

  // Redirect to dashboard on successful login
  redirect('/dashboard');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('unievent_session');
  cookieStore.delete('unievent_role');
  cookieStore.delete('unievent_email');
  cookieStore.delete('unievent_full_name');
  redirect('/login');
}
