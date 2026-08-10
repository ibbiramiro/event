'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';


// Initialize with service role key to bypass RLS for admin operations
function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase env vars');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Verify that the person making the request is a Super Admin
async function verifySuperAdmin() {
  const cookieStore = await import('next/headers').then(m => m.cookies());
  const email = cookieStore.get('unievent_session')?.value;
  if (!email) return false;

  const adminClient = getAdminClient();
  const { data } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('email', email)
    .single();

  return data?.role === 'Super Admin';
}

export async function grantAccess(formData: FormData) {
  try {
    const isSuperAdmin = await verifySuperAdmin();
    if (!isSuperAdmin) {
      return { error: 'Unauthorized: Only Super Admins can grant access.' };
    }

    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const pin = formData.get('pin') as string;

    if (!email || !role || role === 'Select Role...' || !pin) {
      return { error: 'Email, Role, and PIN are required.' };
    }

    const adminClient = getAdminClient();

    // Check if user already exists
    const { data: existingUser } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('email', email)
      .single();

    let res;
    if (existingUser) {
      // Update role and PIN
      res = await adminClient
        .from('user_roles')
        .update({ role, pin })
        .eq('email', email);
    } else {
      // Insert new role and PIN
      res = await adminClient
        .from('user_roles')
        .insert([{ email, role, pin }]);
    }

    if (res.error) throw res.error;

    revalidatePath('/crm');
    return { success: true };
  } catch (err: any) {
    console.error('Grant Access Error:', err);
    return { error: err.message || 'Failed to grant access' };
  }
}

export async function removeAccess(email: string) {
  try {
    const isSuperAdmin = await verifySuperAdmin();
    if (!isSuperAdmin) {
      return { error: 'Unauthorized: Only Super Admins can remove access.' };
    }

    const adminClient = getAdminClient();
    const res = await adminClient
      .from('user_roles')
      .delete()
      .eq('email', email);

    if (res.error) throw res.error;

    revalidatePath('/crm');
    return { success: true };
  } catch (err: any) {
    console.error('Remove Access Error:', err);
    return { error: err.message || 'Failed to remove access' };
  }
}
