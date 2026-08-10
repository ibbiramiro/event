'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './dashboard.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import Link from 'next/link';
import { Guest } from '@/lib/data';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [fullName, setFullName] = useState('Admin User');
  
  // QR Code Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedGuestForQr, setSelectedGuestForQr] = useState<Guest | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Custom spreadsheet setting states
  const [showSettings, setShowSettings] = useState(false);
  const [webAppUrl, setWebAppUrl] = useState('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [tempWebAppUrl, setTempWebAppUrl] = useState('');
  const [tempSpreadsheetUrl, setTempSpreadsheetUrl] = useState('');
  const [pmr, setPmr] = useState(false);
  const [tempPmr, setTempPmr] = useState(false);
  const [checkinDisable, setCheckinDisable] = useState(false);
  const [tempCheckinDisable, setTempCheckinDisable] = useState(false);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }

    const roleCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('unievent_role='))
      ?.split('=')[1];
    if (roleCookie) {
      setRole(decodeURIComponent(roleCookie));
    }

    const storedName = localStorage.getItem('unievent_full_name');
    if (storedName) {
      setFullName(storedName);
    } else {
      const emailCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('unievent_email='))
        ?.split('=')[1];
      if (emailCookie) {
        const namePart = decodeURIComponent(emailCookie).split('@')[0];
        const formattedName = namePart.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
        setFullName(formattedName);
      }
    }

    const defaultWebAppUrl = 'https://script.google.com/macros/s/AKfycbwrirN7U5KKkFFkgPajn7_BOE2eKoP9fvClFgMwhZEHU7cFD-_o1w21urMuAWdY373YjQ/exec';
    const defaultSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1Q5Nnzi4FRMP7nuBj2XurxA2oGvWSmrz2Vfg-UfifX9vkpkvz6eWNs9jh/edit';

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to fetch config');
        const json = await res.json();
        const data = json.data || [];
        
        if (data && data.length > 0) {
          const webAppRow = data.find((r: any) => r.key === 'web_app_url');
          const sheetRow = data.find((r: any) => r.key === 'spreadsheet_url');
          const pmrRow = data.find((r: any) => r.key === 'PMR');
          const checkinDisableRow = data.find((r: any) => r.key === 'CheckinDisabled');

          setWebAppUrl(webAppRow?.value || '');
          setSpreadsheetUrl(sheetRow?.value || '');
          setTempWebAppUrl(webAppRow?.value || '');
          setTempSpreadsheetUrl(sheetRow?.value || '');
          
          const isPmr = pmrRow?.value === 'Y';
          setPmr(isPmr);
          setTempPmr(isPmr);
          
          const isCheckinDisable = checkinDisableRow?.value === 'Y';
          setCheckinDisable(isCheckinDisable);
          setTempCheckinDisable(isCheckinDisable);
        }
      } catch (err) {
        console.error('Error fetching config from API:', err);
      }
    };
    
    fetchConfig();

    // Load initial count to avoid toasting on first load
    const storedGuests = localStorage.getItem('unievent_guests');
    if (storedGuests) {
      const parsed = JSON.parse(storedGuests) as Guest[];
      setGuests(parsed);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'unievent_guests' && e.newValue) {
        const parsed = JSON.parse(e.newValue) as Guest[];
        setGuests(parsed);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSync = async () => {
    await handleSyncWithUrl('');
  };

  const handleSyncWithUrl = async (url: string) => {
    setIsSyncing(true);
    try {
      const { syncGuestsFromSheet } = await import('@/lib/googleSheets');
      const sheetGuests = await syncGuestsFromSheet(url || undefined);
      if (sheetGuests && sheetGuests.length > 0) {
        setGuests(sheetGuests);
        localStorage.setItem('unievent_guests', JSON.stringify(sheetGuests));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          web_app_url: tempWebAppUrl,
          spreadsheet_url: tempSpreadsheetUrl,
          'PMR': tempPmr,
          'CheckinDisabled': tempCheckinDisable
        })
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      setWebAppUrl(tempWebAppUrl);
      setSpreadsheetUrl(tempSpreadsheetUrl);
      setPmr(tempPmr);
      setCheckinDisable(tempCheckinDisable);
      setShowSettings(false);
      
      // Auto-sync data with the newly updated sheet
      setTimeout(() => {
        handleSyncWithUrl(tempWebAppUrl);
      }, 100);
    } catch (err) {
      console.error('Error saving settings', err);
      alert('Failed to save settings.');
    }
  };

  const handleResetSettings = async () => {
    // Reset to defaults will now simply discard temporary changes and reload from Supabase
    setTempWebAppUrl(webAppUrl);
    setTempSpreadsheetUrl(spreadsheetUrl);
    setTempPmr(pmr);
    setTempCheckinDisable(checkinDisable);
    setShowSettings(false);
  };

  const registeredGuests = guests.filter(g => {
    const reg = g.registrationNumber?.trim() || '';
    return reg !== '' && reg !== '-';
  });

  const totalRsvpCount = registeredGuests.length;
  const checkedInCount = registeredGuests.filter(g => g.method === 'Self Check-in' || g.method === 'Manual Input' || (g.time && g.time.trim() !== '')).length;
  const pendingCount = Math.max(0, totalRsvpCount - checkedInCount);

  return (
    <div className={`${styles.layout} ${isSidebarOpen ? '' : styles.sidebarClosed}`}>
      <div className={`${styles.sidebarWrapper} ${isSidebarOpen ? styles.open : styles.closed}`}>
        <Sidebar />
      </div>
      {isSidebarOpen && (
        <div 
          className={styles.mobileOverlay} 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className={styles.mainContent}>
        <div style={{ padding: '20px 40px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          
          <div className={styles.profileContainer} ref={profileRef}>
            <div 
              className={styles.profileAvatar}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              style={{ overflow: 'hidden', cursor: 'pointer' }}
            >
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0b1930&color=fff`} 
                alt={fullName} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            
            {isProfileOpen && (
              <div className={styles.dropdownMenu}>
                <button 
                  className={styles.dropdownItem}
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push('/profile');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profile Settings
                </button>
                
                <div className={styles.dropdownDivider}></div>
                
                <button 
                  className={styles.dropdownItem} 
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push('/login');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span className={styles.signOutText}>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <main className={styles.contentWrapper}>
          <div className={styles.pageHeader}>
            <div className={styles.headerText}>
              <h1 className={styles.pageTitle}>Reception Desk</h1>
              <p className={styles.pageSubtitle}>Manage walk-in registrations and track real-time arrivals.</p>
            </div>
            
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Total RSVPs</span>
                <span className={styles.statValue}>{totalRsvpCount}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Checked In</span>
                <span className={styles.statValue} style={{ color: 'var(--success-color)' }}>{checkedInCount}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Pending</span>
                <span className={styles.statValue}>{pendingCount}</span>
              </div>
            </div>
          </div>



            {/* Right Column - Real-time Arrivals */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle} style={{ fontSize: '18px' }}>Real-time Guest Arrivals</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button 
                    className={styles.openFormBtn} 
                    style={{ backgroundColor: '#e2e8f0', color: '#0f172a', border: '1px solid #cbd5e1', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    {isSyncing ? 'Syncing...' : 'Sync Spreadsheet'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                  </button>
                  
                  {role?.toLowerCase() !== 'kaprodi' && (
                    <>
                      <a href={spreadsheetUrl} target="_blank" rel="noopener noreferrer" className={styles.openFormBtn} style={{ backgroundColor: '#10b981' }}>
                        Open Sheet
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                      <button
                        className={styles.openFormBtn}
                        style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '12px', width: 'auto', margin: '0' }}
                        onClick={() => {
                          setTempSpreadsheetUrl(spreadsheetUrl);
                          setTempWebAppUrl(webAppUrl);
                          setTempPmr(pmr);
                          setTempCheckinDisable(checkinDisable);
                          setShowSettings(!showSettings);
                        }}
                        title="Spreadsheet Settings"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                      </button>
                    </>
                  )}
                  <div className={styles.livePill}>
                    <div className={styles.pulseDot}></div>
                    LIVE UPDATES
                  </div>
                </div>
              </div>

              {/* Spreadsheet Settings Panel */}
              {showSettings && (
                <div className={styles.settingsPanel}>
                  <div className={styles.settingsHeader}>
                    <h3 className={styles.settingsTitle}>Spreadsheet Integration Settings</h3>
                    <p className={styles.settingsDesc}>Configure dynamic Google Sheets connection details.</p>
                  </div>
                  <div className={styles.settingsForm}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Google Sheets URL (Link View)</label>
                      <input 
                        type="text" 
                        className={styles.settingsInput}
                        value={tempSpreadsheetUrl} 
                        onChange={(e) => setTempSpreadsheetUrl(e.target.value)} 
                        placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                      />
                      <span className={styles.inputHelp}>Link Google Sheets yang dibuka saat tombol &quot;Open Sheet&quot; diklik.</span>
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Apps Script Web App URL (Sync API)</label>
                      <input 
                        type="text" 
                        className={styles.settingsInput}
                        value={tempWebAppUrl} 
                        onChange={(e) => setTempWebAppUrl(e.target.value)} 
                        placeholder="https://script.google.com/macros/s/your-deployment-id/exec"
                      />
                      <span className={styles.inputHelp}>Deployment URL dari Google Apps Script Web App (doGet / doPost).</span>
                    </div>
                    <div className={styles.inputGroup} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                      <label className={styles.inputLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={tempPmr}
                          onChange={(e) => setTempPmr(e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        Enable PMR
                      </label>
                      <label className={styles.inputLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={tempCheckinDisable}
                          onChange={(e) => setTempCheckinDisable(e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        Disable Check-in
                      </label>
                    </div>
                    <div className={styles.settingsActions} style={{ marginTop: '24px' }}>
                      <button className={styles.saveBtn} onClick={handleSaveSettings}>Save &amp; Sync</button>
                      <button className={styles.resetBtn} onClick={handleResetSettings}>Discard Changes</button>
                      <button className={styles.cancelBtn} onClick={() => {
                        setTempSpreadsheetUrl(spreadsheetUrl);
                        setTempWebAppUrl(webAppUrl);
                        setTempPmr(pmr);
                        setTempCheckinDisable(checkinDisable);
                        setShowSettings(false);
                      }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>REG. NUMBER</th>
                      <th>STUDENT NAME</th>
                      <th>MAJOR INT.</th>
                      <th>QR CODE</th>
                      <th style={{ textAlign: 'right' }}>CHECK-IN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.length > 0 ? (showAll ? [...guests].reverse() : [...guests].reverse().slice(0, 5)).map((row) => {
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
                          <td style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{row.registrationNumber || '-'}</td>
                          <td>
                            <div className={styles.studentCell}>
                              <div className={`${styles.avatar} ${avatarClass}`}>
                                {initials}
                              </div>
                              <div className={styles.studentInfo}>
                                <span className={styles.studentName}>{row.name}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.tag} ${majorTagClass}`}>{row.major}</span>
                          </td>
                          <td className={styles.parentName}>
                            <button 
                              className={styles.viewQrBtn}
                              onClick={() => {
                                setSelectedGuestForQr(row);
                                setQrModalOpen(true);
                              }}
                              title="Show QR Code"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                                <path d="M9 3v4"></path><path d="M15 3v4"></path>
                                <path d="M9 15v4"></path><path d="M15 15v4"></path>
                              </svg>
                              View QR
                            </button>
                          </td>
                          <td className={styles.timeText} style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {row.time ? (
                                <span className={styles.timeText}>
                                  {(() => {
                                    if (row.time.includes('T')) {
                                      const d = new Date(row.time);
                                      if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-GB');
                                    }
                                    const floatVal = parseFloat(row.time);
                                    if (!isNaN(floatVal) && floatVal >= 0 && floatVal < 1 && !row.time.includes(':')) {
                                      const totalSeconds = Math.round(floatVal * 24 * 3600);
                                      const d = new Date();
                                      d.setHours(0, 0, totalSeconds, 0);
                                      return d.toLocaleTimeString('en-GB');
                                    }
                                    return row.time;
                                  })()}
                                </span>
                              ) : (
                                role?.toLowerCase() !== 'kaprodi' && (
                                  <button 
                                    className={styles.actionBtn}
                                    disabled={checkinDisable}
                                    style={checkinDisable ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    onClick={async () => {
                                      if (checkinDisable) return;
                                      try {
                                        const { checkInGuestToSheet } = await import('@/lib/googleSheets');
                                        await checkInGuestToSheet(row.id, webAppUrl);
                                        // Update local state to reflect check-in
                                        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                        const updatedGuests = guests.map(g => {
                                          if (g.id === row.id) {
                                            return { ...g, time: timeStr, method: 'Self Check-in' };
                                          }
                                          return g;
                                        });
                                        setGuests(updatedGuests as any);
                                        localStorage.setItem('unievent_guests', JSON.stringify(updatedGuests));
                                        
                                        // Trigger storage event so dashboard updates
                                        window.dispatchEvent(new Event('storage'));
                                      } catch (e) {
                                        console.error(e);
                                        alert('Failed to check in');
                                      }
                                    }}
                                  >
                                    Check In
                                  </button>
                                )
                              )}
                              
                              {role?.toLowerCase() !== 'kaprodi' && (
                                <button
                                  className={styles.deleteBtn}
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete ${row.name}? This will remove the guest from the list and spreadsheet.`)) {
                                      try {
                                        const { removeGuestFromSheet } = await import('@/lib/googleSheets');
                                        await removeGuestFromSheet(row.id, webAppUrl);
                                        const updatedGuests = guests.filter(g => g.id !== row.id);
                                        setGuests(updatedGuests as any);
                                        localStorage.setItem('unievent_guests', JSON.stringify(updatedGuests));
                                        window.dispatchEvent(new Event('storage'));
                                      } catch (e) {
                                        console.error(e);
                                        alert('Failed to remove guest');
                                      }
                                    }
                                  }}
                                  title="Remove Guest"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        No guests loaded. Click "Sync Spreadsheet" to load.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
              
              {guests.length > 5 && (
                <button 
                  className={styles.viewAllBtn}
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? 'Show Less' : 'View All'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAll ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              )}
            </div>
        </main>
      </div>

      {qrModalOpen && selectedGuestForQr && (
        <div className={styles.modalOverlay} onClick={() => setQrModalOpen(false)}>
          <div className={styles.qrModalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => setQrModalOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h3 className={styles.qrModalTitle}>Invitation QR Code</h3>
            <p className={styles.qrModalSubtitle}>{selectedGuestForQr.name}</p>
            <div className={styles.qrBox} id="print-qr-area">
              <QRCode 
                value={selectedGuestForQr.registrationNumber || '-'} 
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
              <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                {selectedGuestForQr.registrationNumber}
              </div>
            </div>
            <div className={styles.qrModalActions}>
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                className={styles.printBtn}
                style={{ flex: 1 }}
                onClick={() => {
                  const printContent = document.getElementById('print-qr-area');
                  const svgElement = printContent?.querySelector('svg');
                  const svgHtml = svgElement ? svgElement.outerHTML : '';
                  const windowUrl = 'about:blank';
                  const uniqueName = new Date();
                  const windowName = 'Print' + uniqueName.getTime();
                  const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');
                  
                  if (printWindow && printContent) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Print QR - ${selectedGuestForQr.name}</title>
                          <style>
                            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; }
                            .qr-container { text-align: center; }
                            .halo { font-size: 22px; color: #334155; margin-bottom: 8px; }
                            .reg { font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 8px; }
                            .use { font-size: 22px; color: #334155; margin-bottom: 24px; }
                            .reg-num { font-size: 34px; font-weight: bold; color: #991b1b; margin-top: 24px; }
                            .qr-box { background: white; padding: 15px; border-radius: 12px; display: inline-block; }
                            svg { width: 300px; height: 300px; }
                          </style>
                        </head>
                        <body>
                          <div class="qr-container">
                            <div class="halo">Halo ${selectedGuestForQr.name},</div>
                            <div class="reg">Registrasi yang dapat</div>
                            <div class="use">kamu gunakan.</div>
                            <div class="qr-box">${svgHtml}</div>
                            <div class="reg-num">${selectedGuestForQr.registrationNumber || '-'}</div>
                          </div>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 250);
                  }
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Print Invitation
              </button>
              
              <button 
                className={styles.copyBtn}
                title="Copy QR Image"
                onClick={() => {
                  const svg = document.querySelector('#print-qr-area svg');
                  if (svg) {
                    try {
                      const svgData = new XMLSerializer().serializeToString(svg);
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const img = new Image();
                      img.onload = () => {
                        canvas.width = 400;
                        canvas.height = 550;
                        if(ctx) {
                          ctx.fillStyle = '#f8fafc';
                          ctx.fillRect(0, 0, canvas.width, canvas.height);
                          ctx.textAlign = 'center';
                          ctx.font = '22px Arial, sans-serif';
                          ctx.fillStyle = '#334155';
                          ctx.fillText(`Halo ${selectedGuestForQr.name},`, 200, 60);
                          ctx.font = 'bold 24px Arial, sans-serif';
                          ctx.fillStyle = '#0f172a';
                          ctx.fillText('Registrasi yang dapat', 200, 95);
                          ctx.font = '22px Arial, sans-serif';
                          ctx.fillStyle = '#334155';
                          ctx.fillText('kamu gunakan.', 200, 130);
                          
                          const qrSize = 260;
                          const qrX = (canvas.width - qrSize) / 2;
                          const qrY = 170;
                          ctx.fillStyle = '#ffffff';
                          ctx.fillRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30);
                          ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
                          
                          ctx.fillStyle = '#991b1b';
                          ctx.font = 'bold 34px Arial, sans-serif';
                          ctx.fillText(selectedGuestForQr.registrationNumber || '-', 200, qrY + qrSize + 60);

                          canvas.toBlob((blob) => {
                            if (blob && navigator.clipboard && navigator.clipboard.write) {
                              const ClipboardItemConstructor = (window as any).ClipboardItem;
                              if (ClipboardItemConstructor) {
                                navigator.clipboard.write([new ClipboardItemConstructor({ 'image/png': blob })]).then(() => {
                                  alert('✅ QR Code Image berhasil dicopy!');
                                }).catch(e => console.error(e));
                              }
                            }
                          }, 'image/png');
                        }
                      };
                      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                    } catch(e) {}
                  }
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
              
              <button 
                className={styles.whatsappBtn}
                onClick={() => {
                  let phone = selectedGuestForQr.contact || '';
                  // Remove non-numeric characters
                  phone = phone.replace(/\D/g, '');
                  // Format for Indonesia (change 0 to 62)
                  if (phone.startsWith('0')) {
                    phone = '62' + phone.substring(1);
                  }
                  
                  if (!phone) {
                    alert('Nomor kontak tidak tersedia untuk tamu ini.');
                    return;
                  }
                  
                  const message = `Halo ${selectedGuestForQr.name},\n\nIni adalah undangan event kami. Nomor registrasi Anda: *${selectedGuestForQr.registrationNumber}*.\n\nSilakan tunjukkan QR code atau sebutkan nomor registrasi Anda saat check-in. Terima kasih!`;
                  
                  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                  
                  // Copy styled QR to clipboard for pasting in WhatsApp Web
                  const svg = document.querySelector('#print-qr-area svg');
                  if (svg) {
                    try {
                      const svgData = new XMLSerializer().serializeToString(svg);
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const img = new Image();
                      img.onload = () => {
                        canvas.width = 400;
                        canvas.height = 550;
                        if(ctx) {
                          // Background
                          ctx.fillStyle = '#f8fafc';
                          ctx.fillRect(0, 0, canvas.width, canvas.height);
                          
                          // Top text
                          ctx.textAlign = 'center';
                          ctx.fillStyle = '#334155';
                          
                          ctx.font = '22px Arial, sans-serif';
                          ctx.fillText(`Halo ${selectedGuestForQr.name},`, 200, 60);
                          
                          ctx.font = 'bold 24px Arial, sans-serif';
                          ctx.fillStyle = '#0f172a';
                          ctx.fillText('Registrasi yang dapat', 200, 95);
                          
                          ctx.font = '22px Arial, sans-serif';
                          ctx.fillStyle = '#334155';
                          ctx.fillText('kamu gunakan.', 200, 130);
                          
                          // Draw QR Code
                          const qrSize = 260;
                          const qrX = (canvas.width - qrSize) / 2;
                          const qrY = 170;
                          
                          // QR White background
                          ctx.fillStyle = '#ffffff';
                          ctx.fillRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30);
                          ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
                          
                          // Registration Number
                          ctx.fillStyle = '#991b1b'; // Dark red color
                          ctx.font = 'bold 34px Arial, sans-serif';
                          ctx.fillText(selectedGuestForQr.registrationNumber || '-', 200, qrY + qrSize + 60);

                          canvas.toBlob((blob) => {
                            if (blob && navigator.clipboard && navigator.clipboard.write) {
                              const ClipboardItemConstructor = (window as any).ClipboardItem;
                              if (ClipboardItemConstructor) {
                                navigator.clipboard.write([new ClipboardItemConstructor({ 'image/png': blob })]).then(() => {
                                  // Navigate to WhatsApp AFTER successful copy
                                  window.open(waUrl, '_blank');
                                  setTimeout(() => {
                                    alert('INFO: Gambar QR Code telah otomatis di-copy!\n\nSilakan tekan Paste (Ctrl+V) di kolom chat WhatsApp untuk melampirkannya.');
                                  }, 500);
                                }).catch(e => {
                                  console.error('Clipboard write failed:', e);
                                  window.open(waUrl, '_blank');
                                });
                              } else {
                                window.open(waUrl, '_blank');
                              }
                            } else {
                              window.open(waUrl, '_blank');
                            }
                          }, 'image/png');
                        } else {
                          window.open(waUrl, '_blank');
                        }
                      };
                      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                    } catch(e) {
                      console.error('Error copying QR', e);
                      window.open(waUrl, '_blank');
                    }
                  } else {
                    window.open(waUrl, '_blank');
                  }
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
