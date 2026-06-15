'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './dashboard.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import Link from 'next/link';
import { Guest } from '@/lib/data';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [totalCheckedIn, setTotalCheckedIn] = useState(0);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [fullName, setFullName] = useState('Admin User');

  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Custom spreadsheet setting states
  const [showSettings, setShowSettings] = useState(false);
  const [webAppUrl, setWebAppUrl] = useState('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [tempWebAppUrl, setTempWebAppUrl] = useState('');
  const [tempSpreadsheetUrl, setTempSpreadsheetUrl] = useState('');

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

    const savedWebAppUrl = localStorage.getItem('unievent_web_app_url') || defaultWebAppUrl;
    const savedSpreadsheetUrl = localStorage.getItem('unievent_spreadsheet_url') || defaultSpreadsheetUrl;

    setWebAppUrl(savedWebAppUrl);
    setSpreadsheetUrl(savedSpreadsheetUrl);
    setTempWebAppUrl(savedWebAppUrl);
    setTempSpreadsheetUrl(savedSpreadsheetUrl);

    // Load initial count to avoid toasting on first load
    const storedGuests = localStorage.getItem('unievent_guests');
    if (storedGuests) {
      const parsed = JSON.parse(storedGuests) as Guest[];
      setGuests(parsed);
      setTotalCheckedIn(parsed.filter(g => g.method === 'Self Check-in' || g.method === 'Manual Input').length);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'unievent_guests' && e.newValue) {
        const parsed = JSON.parse(e.newValue) as Guest[];
        setGuests(parsed);
        setTotalCheckedIn(parsed.filter(g => g.method === 'Self Check-in' || g.method === 'Manual Input').length);
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
        setTotalCheckedIn(sheetGuests.filter(g => g.method === 'Self Check-in' || g.method === 'Manual Input').length);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('unievent_web_app_url', tempWebAppUrl);
    localStorage.setItem('unievent_spreadsheet_url', tempSpreadsheetUrl);
    setWebAppUrl(tempWebAppUrl);
    setSpreadsheetUrl(tempSpreadsheetUrl);
    setShowSettings(false);
    
    // Auto-sync data with the newly updated sheet
    setTimeout(() => {
      handleSyncWithUrl(tempWebAppUrl);
    }, 100);
  };

  const handleResetSettings = () => {
    const defaultWebAppUrl = 'https://script.google.com/macros/s/AKfycbwrirN7U5KKkFFkgPajn7_BOE2eKoP9fvClFgMwhZEHU7cFD-_o1w21urMuAWdY373YjQ/exec';
    const defaultSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1Q5Nnzi4FRMP7nuBj2XurxA2oGvWSmrz2Vfg-UfifX9vkpkvz6eWNs9jh/edit';
    
    localStorage.removeItem('unievent_web_app_url');
    localStorage.removeItem('unievent_spreadsheet_url');
    setWebAppUrl(defaultWebAppUrl);
    setSpreadsheetUrl(defaultSpreadsheetUrl);
    setTempWebAppUrl(defaultWebAppUrl);
    setTempSpreadsheetUrl(defaultSpreadsheetUrl);
    setShowSettings(false);
    
    setTimeout(() => {
      handleSyncWithUrl(defaultWebAppUrl);
    }, 100);
  };

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
                <span className={styles.statValue}>{guests.length}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Checked In</span>
                <span className={styles.statValue} style={{ color: 'var(--success-color)' }}>{totalCheckedIn}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Pending</span>
                <span className={styles.statValue}>{Math.max(0, guests.length - totalCheckedIn)}</span>
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
                    <div className={styles.settingsActions}>
                      <button className={styles.saveBtn} onClick={handleSaveSettings}>Save &amp; Sync</button>
                      <button className={styles.resetBtn} onClick={handleResetSettings}>Reset to Defaults</button>
                      <button className={styles.cancelBtn} onClick={() => {
                        setTempSpreadsheetUrl(spreadsheetUrl);
                        setTempWebAppUrl(webAppUrl);
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
                      <th>STUDENT NAME</th>
                      <th>MAJOR INT.</th>
                      <th>METHOD</th>
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
                          <td className={styles.parentName}>{row.method}</td>
                          <td className={styles.timeText} style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {row.time ? (
                                <span className={styles.timeText}>
                                  {row.time.includes('T') ? row.time.split('T')[1].split('.')[0] : row.time}
                                </span>
                              ) : (
                                role?.toLowerCase() !== 'kaprodi' && (
                                  <button 
                                    className={styles.actionBtn}
                                    onClick={async () => {
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
                                        
                                        // Update checked in count
                                        setTotalCheckedIn(updatedGuests.filter(g => g.method === 'Self Check-in' || g.method === 'Manual Input').length);
                                        
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
                                        setTotalCheckedIn(updatedGuests.filter(g => g.method === 'Self Check-in' || g.method === 'Manual Input').length);
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

    </div>
  );
}
