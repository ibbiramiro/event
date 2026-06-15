'use client';

import React, { useState, useEffect } from 'react';
import styles from '../analytics/analytics.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopNav from '@/components/TopNav/TopNav';

export default function ProfilePage() {
  const [role, setRole] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('Staff User');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Extract role from cookie
    const roleCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('unievent_role='))
      ?.split('=')[1];
      
    if (roleCookie) {
      setRole(decodeURIComponent(roleCookie));
    }
    
    const emailCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('unievent_email='))
      ?.split('=')[1];
      
    const storedFullName = localStorage.getItem('unievent_full_name');

    if (emailCookie) {
      setEmail(decodeURIComponent(emailCookie));
      if (storedFullName) {
        setFullName(storedFullName);
      } else {
        try {
          const namePart = decodeURIComponent(emailCookie).split('@')[0];
          const formattedName = namePart.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
          setFullName(formattedName);
          localStorage.setItem('unievent_full_name', formattedName);
        } catch (e) {}
      }
    } else {
      // Look for any auth info in localStorage as fallback
      const storedEmail = localStorage.getItem('unievent_email') || 'staff@university.edu';
      setEmail(storedEmail);
      if (storedFullName) setFullName(storedFullName);
    }
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFullName(val);
    // Don't auto-save to localStorage until they click Save, or we can keep it
    localStorage.setItem('unievent_full_name', val);
  };

  const handleSaveProfile = async () => {
    setIsSavingName(true);
    setResetMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName })
      });
      if (!response.ok) throw new Error('Failed to save profile');
      
      // Update cookie
      document.cookie = `unievent_full_name=${encodeURIComponent(fullName)}; path=/; max-age=${60 * 60 * 24 * 7}`;
      
      setResetMessage({ type: 'success', text: 'Profile saved successfully!' });
    } catch (error) {
      console.error(error);
      setResetMessage({ type: 'error', text: 'Failed to save profile.' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePin = async () => {
    if (newPin.length !== 6 || currentPin.length !== 6 || confirmPin.length !== 6) return;
    
    if (newPin !== confirmPin) {
      setResetMessage({ type: 'error', text: 'PIN Baru dan Konfirmasi PIN tidak cocok!' });
      return;
    }

    setIsResetting(true);
    setResetMessage({ type: '', text: '' });
    
    try {
      const response = await fetch('/api/profile/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, currentPin, newPin })
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update PIN');
      }
      
      setResetMessage({ type: 'success', text: 'PIN changed successfully! A security alert email has been sent.' });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error: any) {
      console.error(error);
      setResetMessage({ type: 'error', text: error.message || 'Failed to change PIN. Check console for errors.' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.mainContent}>
        <TopNav />
        <main className={styles.contentWrapper}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Profile Settings</h1>
              <p className={styles.pageSubtitle}>Manage your account details and security settings.</p>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '32px', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Full Name</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={handleNameChange} 
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '15px', outline: 'none' }} 
                />
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSavingName}
                  style={{ backgroundColor: '#0b1930', color: 'white', border: 'none', borderRadius: '6px', padding: '0 20px', fontWeight: 500, cursor: isSavingName ? 'not-allowed' : 'pointer', opacity: isSavingName ? 0.7 : 1 }}
                >
                  {isSavingName ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Email Address</label>
              <input 
                type="text" 
                value={email} 
                readOnly 
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '15px', backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }} 
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Assigned Role</label>
              <div style={{ display: 'inline-flex', padding: '6px 12px', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>
                {role || 'Unknown'}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />
            
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: '0 0 8px 0' }}>Security (Change PIN)</h3>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' }}>Ubah 6-digit PIN keamanan Anda secara manual. Email notifikasi akan dikirimkan demi keamanan.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '300px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>PIN Terkini</label>
                  <input 
                    type="password" 
                    value={currentPin} 
                    onChange={e => setCurrentPin(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6))}
                    placeholder="------"
                    maxLength={6}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '16px', outline: 'none', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>PIN Baru</label>
                  <input 
                    type="password" 
                    value={newPin} 
                    onChange={e => setNewPin(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6))}
                    placeholder="------"
                    maxLength={6}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '16px', outline: 'none', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Konfirmasi PIN Baru</label>
                  <input 
                    type="password" 
                    value={confirmPin} 
                    onChange={e => setConfirmPin(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6))}
                    placeholder="------"
                    maxLength={6}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '16px', outline: 'none', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }} 
                  />
                </div>
                
                <button 
                  onClick={handleChangePin}
                  disabled={isResetting || currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
                  style={{ backgroundColor: '#0b1930', color: 'white', border: 'none', borderRadius: '6px', padding: '12px 20px', fontWeight: 600, cursor: (isResetting || currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6) ? 'not-allowed' : 'pointer', opacity: (isResetting || currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6) ? 0.7 : 1, marginTop: '8px' }}
                >
                  {isResetting ? 'Menyimpan...' : 'Ganti PIN Sekarang'}
                </button>
              </div>
              
              {resetMessage.text && (
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px 16px', 
                  backgroundColor: resetMessage.type === 'error' ? '#fee2e2' : '#f0fdf4', 
                  border: `1px solid ${resetMessage.type === 'error' ? '#fca5a5' : '#bbf7d0'}`, 
                  color: resetMessage.type === 'error' ? '#991b1b' : '#166534', 
                  borderRadius: '6px', 
                  fontSize: '14px' 
                }}>
                  {resetMessage.text}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
