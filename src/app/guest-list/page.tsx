'use client';

import React, { useState, useEffect } from 'react';
import styles from './guestList.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopNav from '@/components/TopNav/TopNav';
import { Guest } from '@/lib/data';

export default function GuestListPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [totalCheckedIn, setTotalCheckedIn] = useState(0);
  const [qrUrl, setQrUrl] = useState('');
  const [toasts, setToasts] = useState<{ id: number; name: string; major: string }[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [checkinDisabled, setCheckinDisabled] = useState(false);

  useEffect(() => {
    let lastGuestCount = 0;
    let lastCheckedInCount = 0;
    // Load initial count
    const storedGuests = localStorage.getItem('unievent_guests');
    if (storedGuests) {
      const parsed = JSON.parse(storedGuests) as Guest[];
      setGuests(parsed);
      lastGuestCount = parsed.length;
      lastCheckedInCount = parsed.filter(g => g.method === 'Self Check-in' || g.method === 'Manual Input').length;
      setTotalCheckedIn(lastCheckedInCount);
    }

    if (typeof window !== 'undefined') {
      const checkinUrl = `${window.location.origin}/checkin`;
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkinUrl)}`);
    }

    const handleStorageChange = (e: StorageEvent) => {
      // ... same logic
      if (e.key === 'unievent_guests' && e.newValue) {
        const parsed = JSON.parse(e.newValue) as Guest[];
        setGuests(parsed);
        const newCheckedInCount = parsed.filter(g => g.method === 'Self Check-in' || g.method === 'Manual Input').length;
        setTotalCheckedIn(newCheckedInCount);

        lastGuestCount = parsed.length;
        lastCheckedInCount = newCheckedInCount;
      }
      
      if (e.key === 'unievent_new_toast' && e.newValue) {
        try {
          const newToast = JSON.parse(e.newValue);
          setToasts((prev) => [...prev, newToast]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
          }, 4000); // Hide after 4 seconds
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Fetch global checkin status
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => setCheckinDisabled(data.checkinDisabled))
      .catch(console.error);

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkedInGuests = guests
    .filter(g => g.method === 'Self Check-in' || g.method === 'Manual Input' || (g.time && g.time !== ''))
    .sort((a, b) => {
      const parseTime = (t: string) => {
        if (!t || t === 'Checked In') return 0;
        
        // Google Sheets sometimes sends time as a Date string like "1899-12-30T09:56:17.000Z"
        if (t.includes('T')) {
          const timePart = t.split('T')[1].split('.')[0]; // "09:56:17"
          const parts = timePart.split(':');
          if (parts.length >= 2) {
             // Add a massive offset so it's always strictly positive and > 0
             return 1000000 + parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + (parseInt(parts[2]) || 0);
          }
        }

        // Try parsing HH:MM:SS AM/PM string directly (from toLocaleTimeString)
        let isPM = t.toLowerCase().includes('pm');
        let isAM = t.toLowerCase().includes('am');
        let cleanTime = t.replace(/am|pm/i, '').trim();
        const parts = cleanTime.split(':');
        if (parts.length >= 2) {
          let hours = parseInt(parts[0]);
          if (isPM && hours < 12) hours += 12;
          if (isAM && hours === 12) hours = 0;
          return 1000000 + hours * 3600 + parseInt(parts[1]) * 60 + (parseInt(parts[2]) || 0);
        }
        
        // Fallback Date parsing
        const d = new Date(t);
        if (!isNaN(d.getTime())) {
           return 1000000 + d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
        }
        
        return 0;
      };
      
      const valA = parseTime(a.time);
      const valB = parseTime(b.time);
      
      if (valA !== valB) return valB - valA; // Descending (latest time first)
      
      // Fallback to row ID (newest row first)
      return Number(b.id) - Number(a.id);
    });

  const handleToggleCheckin = async () => {
    const isDisabling = !checkinDisabled;
    const msg = isDisabling 
      ? "Apakah Anda yakin ingin mematikan fitur Check-in? Guest tidak akan bisa mengakses form check-in." 
      : "Apakah Anda yakin ingin menyalakan kembali fitur Check-in?";
    if (!window.confirm(msg)) return;

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinDisabled: isDisabling })
      });
      if (res.ok) {
        setCheckinDisabled(isDisabling);
      } else {
        alert("Gagal mengubah status checkin.");
      }
    } catch (error) {
      console.error(error);
      alert("Gagal mengubah status checkin.");
    }
  };

  return (
    <div className={`${styles.layout} ${isSidebarOpen ? '' : styles.sidebarClosed}`}>
      <div className={`${styles.sidebarWrapper} ${isSidebarOpen ? styles.open : styles.closed}`}>
        <Sidebar />
      </div>
      <div className={styles.mainContent}>
        <div style={{ padding: '20px 40px 0', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#0b1930', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 'bold' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            Menu
          </button>
        </div>
        <main className={styles.contentWrapper}>
          <div className={styles.pageHeader}>
            <div className={styles.headerText}>
              <h1 className={styles.pageTitle}>Guest List</h1>
              <p className={styles.pageSubtitle}>List of guests who have successfully checked in.</p>
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Checked In</span>
                <span className={styles.statValue} style={{ color: 'var(--success-color)' }}>{totalCheckedIn}</span>
              </div>
            </div>
          </div>

          <div className={styles.grid}>
            {/* Left Column - Guest Access */}
            <div className={`${styles.card} ${styles.guestAccessCard}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle} style={{ fontSize: '18px' }}>Guest Access</h2>
              </div>
              <p className={styles.instructionText}>
                Scan QR code for self-service registration
              </p>

              <div className={styles.qrPlaceholder}>
                {qrUrl ? (
                  <img src={qrUrl} alt="Check-in QR Code" style={{ width: '280px', height: '280px', borderRadius: '8px' }} />
                ) : (
                  <svg className={styles.qrIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                    <path d="M9 3v4"></path><path d="M15 3v4"></path>
                    <path d="M9 15v4"></path><path d="M15 15v4"></path>
                  </svg>
                )}
              </div>

              <button 
                onClick={handleToggleCheckin}
                className={styles.openFormBtn}
                style={{ 
                  backgroundColor: checkinDisabled ? '#10b981' : '#ef4444', 
                  border: 'none', 
                  cursor: 'pointer',
                  width: '100%' 
                }}
              >
                {checkinDisabled ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Enable Check-in
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Disable Check-in
                  </>
                )}
              </button>
            </div>

            {/* Right Column - Real-time Arrivals Table */}
            <div className={styles.card}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>STUDENT NAME</th>
                    <th>MAJOR INT.</th>
                  </tr>
                </thead>
                <tbody>
                  {checkedInGuests.length > 0 ? checkedInGuests.map((row) => {
                    const safeName = String(row.name || '');
                    const initials = safeName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
                    let majorTagClass = styles.tagUndecided;
                    if (row.major === 'Computer Science') majorTagClass = styles.tagCS;
                    else if (row.major === 'Information Systems') majorTagClass = styles.tagIS;
                    else if (row.major === 'Visual Communication Design') majorTagClass = styles.tagDKV;
                    else if (row.major === 'Digital Business') majorTagClass = styles.tagDB;
                    else if (row.major === 'International Trade') majorTagClass = styles.tagIT;

                    let avatarClass = styles.bgLightGray;
                    if (row.major === 'Computer Science') avatarClass = styles.bgBlue;
                    else if (row.major === 'Information Systems') avatarClass = styles.bgOrange;
                    else if (row.major === 'Visual Communication Design') avatarClass = styles.bgLightPurple;
                    else if (row.major === 'Digital Business') avatarClass = styles.bgGreen;
                    else if (row.major === 'International Trade') avatarClass = styles.bgPink;

                    return (
                      <tr key={row.id}>
                        <td style={{ fontSize: '20px', fontWeight: '600', padding: '20px 32px' }}>
                          <div className={styles.studentCell}>
                            <div className={`${styles.avatar} ${avatarClass}`} style={{ width: '48px', height: '48px', fontSize: '18px' }}>
                              {initials}
                            </div>
                            <div className={styles.studentInfo}>
                              <span className={styles.studentName}>{row.name}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px 32px' }}>
                          <span className={`${styles.tag} ${majorTagClass}`} style={{ fontSize: '16px', padding: '8px 16px' }}>{row.major}</span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        No guests have checked in yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className={styles.toastContainer}>
          {toasts.map((toast) => (
            <div key={toast.id} className={styles.toast}>
              <div className={styles.toastIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className={styles.toastContent}>
                <span className={styles.toastTitle}>Check-in Successful!</span>
                <span className={styles.toastDesc}>Welcome, {toast.name}</span>
                {toast.major && (
                  <div className={styles.toastMajor}>
                    <span className={styles.toastMajorIcon}>
                      {toast.major === 'Computer Science' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                          <line x1="8" y1="21" x2="16" y2="21"></line>
                          <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                      )}
                      {toast.major === 'Information Systems' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                      )}
                      {toast.major === 'Visual Communication Design' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="13.5" cy="5.5" r="2.5"></circle>
                          <circle cx="20.5" cy="11.5" r="2.5"></circle>
                          <circle cx="17.5" cy="19.5" r="2.5"></circle>
                          <circle cx="10.5" cy="20.5" r="2.5"></circle>
                          <path d="M5.1 14c-.6-1.5-1.1-3.2-1.1-4.8 0-4.4 3.6-8.2 8-8.2s8 3.6 8 8-3.6 8-8 8H7.2"></path>
                        </svg>
                      )}
                      {toast.major === 'Digital Business' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                      )}
                      {toast.major === 'International Trade' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="2" y1="12" x2="22" y2="12"></line>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                      )}
                    </span>
                    <span>{toast.major}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
