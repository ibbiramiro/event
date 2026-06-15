import React from 'react';
import CrmContent from './CrmContent';
import { createClient } from '@supabase/supabase-js';
export default async function CrmPage() {

  let initialStaffData: any[] = [];

  try {
    // We use the service role key to fetch all roles since auth.users and user_roles might be restricted
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: roles, error } = await adminClient
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching roles:', error);
    } else if (roles) {
      initialStaffData = roles.map(role => ({
        id: role.id,
        init: role.email.substring(0, 2).toUpperCase(),
        email: role.email,
        role: role.role,
        date: new Date(role.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      }));
    }
  } catch (err) {
    console.error(err);
  }

  return <CrmContent initialStaffData={initialStaffData} />;
}
