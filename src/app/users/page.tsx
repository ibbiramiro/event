import React from 'react';
import CrmContent from './CrmContent';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CrmPage() {
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get('unievent_role')?.value;
  const role = roleCookie ? decodeURIComponent(roleCookie) : null;
  
  if (role === 'Receptionist' || role?.toLowerCase() === 'kaprodi' || role === 'Marketing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>Akses Ditolak</h1>
        <p style={{ color: '#64748b', marginBottom: '24px', textAlign: 'center', maxWidth: '400px' }}>Maaf, Anda tidak memiliki izin untuk mengakses halaman manajemen User ini.</p>
        <a href="/dashboard" style={{ backgroundColor: '#0b1930', color: 'white', padding: '10px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, transition: 'background-color 0.2s' }}>
          Kembali ke Dashboard
        </a>
      </div>
    );
  }

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
