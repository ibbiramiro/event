'use client';

import React from 'react';
import styles from './analytics.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopNav from '@/components/TopNav/TopNav';

import { useState, useEffect } from 'react';
import { Guest } from '@/lib/data';

export default function AnalyticsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Checked-in' | 'Pending'>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMajor, statusFilter]);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
    const stored = localStorage.getItem('unievent_guests');
    if (stored) {
      setGuests(JSON.parse(stored));
    }
  }, []);

  const totalRegistrants = guests.length;
  const checkedInGuests = guests.filter(g => g.method === 'Self Check-in' || g.method === 'Manual Input' || (g.time && g.time !== ''));
  const checkedIn = checkedInGuests.length;
  const attendanceRate = totalRegistrants > 0 ? ((checkedIn / totalRegistrants) * 100).toFixed(1) : 0;

  // Get all unique majors
  const uniqueMajors = Array.from(new Set(guests.map(g => g.major).filter(Boolean)));
  
  const majorStats = uniqueMajors.map(major => {
    return {
      name: major,
      count: checkedInGuests.filter(g => g.major === major).length
    };
  }).sort((a, b) => b.count - a.count).slice(0, 5); // top 5

  const maxMajor = Math.max(1, ...majorStats.map(m => m.count));
  const colorClasses = [styles.blue, styles.brown, styles.orange, styles.green, styles.purple];

  const filteredGuests = guests.filter(g => {
    // Search
    const searchLower = searchQuery.toLowerCase();
    const safeName = String(g.name || '');
    const safeId = String(g.id || '');
    const nameMatch = safeName.toLowerCase().includes(searchLower);
    const idMatch = safeId.toLowerCase().includes(searchLower);
    if (searchQuery && !nameMatch && !idMatch) return false;

    // Major
    if (selectedMajor && g.major !== selectedMajor) return false;

    // Status
    const isCheckedIn = g.method === 'Self Check-in' || g.method === 'Manual Input' || (g.time && g.time !== '');
    if (statusFilter === 'Checked-in' && !isCheckedIn) return false;
    if (statusFilter === 'Pending' && isCheckedIn) return false;

    return true;
  });

  const itemsPerPage = 25;
  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedGuests = filteredGuests.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      const webAppUrl = localStorage.getItem('unievent_web_app_url') || 'https://script.google.com/macros/s/AKfycbwrirN7U5KKkFFkgPajn7_BOE2eKoP9fvClFgMwhZEHU7cFD-_o1w21urMuAWdY373YjQ/exec';
      const { syncGuestsFromSheet } = await import('@/lib/googleSheets');
      const sheetGuests = await syncGuestsFromSheet(webAppUrl);
      if (sheetGuests && sheetGuests.length > 0) {
        setGuests(sheetGuests);
        localStorage.setItem('unievent_guests', JSON.stringify(sheetGuests));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      console.error(error);
      alert('Failed to refresh data');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportExcel = async () => {
    if (filteredGuests.length === 0) {
      alert("No data to export");
      return;
    }

    try {
      const XLSX = await import('xlsx');
      
      const rows = filteredGuests.map(g => {
        const status = (g.method === 'Self Check-in' || g.method === 'Manual Input' || (g.time && g.time !== '')) ? 'Checked-in' : 'Pending';
        return {
          "Row ID": g.id,
          "Student Name": g.name,
          "Major": g.major,
          "Status": status,
          "Method": g.method,
          "Time": g.time || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics Export");
      
      XLSX.writeFile(workbook, "UniEvent_Analytics_Export.xlsx");
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export to Excel.");
    }
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
        <TopNav onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className={styles.contentWrapper}>
          
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Event Attendee Profiling</h1>
              <p className={styles.pageSubtitle}>Deep dive into registration trends and major breakdown for Semester Analytics 2024.</p>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.btnOutline} onClick={handleExportExcel}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export Excel
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={handleRefresh}
                disabled={isSyncing}
                style={{ opacity: isSyncing ? 0.7 : 1, cursor: isSyncing ? 'not-allowed' : 'pointer' }}
              >
                {isSyncing ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>

          <div className={styles.statsGrid}>
            {/* Stat 1 */}
            <div className={styles.statCard}>
              <div className={`${styles.statIconBox} ${styles.blue}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>TOTAL REGISTRANTS</span>
                <span className={styles.statValue}>{totalRegistrants.toLocaleString()}</span>
                <span className={`${styles.statSubtext} ${styles.textGreen}`}>
                  Data synced with Spreadsheet
                </span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className={styles.statCard}>
              <div className={`${styles.statIconBox} ${styles.gray}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>TOTAL CHECKED-IN</span>
                <span className={styles.statValue}>{checkedIn.toLocaleString()}</span>
                <span className={`${styles.statSubtext} ${styles.textGray}`}>
                  Real-time tracking enabled
                </span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className={styles.statCard}>
              <div className={`${styles.statIconBox} ${styles.orange}`}>
                <span style={{ fontSize: '24px', fontWeight: 'bold' }}>%</span>
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>ATTENDANCE RATE</span>
                <span className={styles.statValue}>{attendanceRate}%</span>
                <div className={styles.progressBarContainer}>
                  <div className={styles.progressBarFill} style={{ width: `${attendanceRate}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>Breakdown by Major</h2>
            </div>

            {majorStats.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                No checked-in data available yet.
              </div>
            )}
            
            {majorStats.map((major, index) => {
              const width = `${(major.count / maxMajor) * 100}%`;
              const colorClass = colorClasses[index % colorClasses.length];
              
              return (
                <div 
                  className={styles.barRow} 
                  key={index}
                  onClick={() => setSelectedMajor(selectedMajor === major.name ? null : major.name)}
                  style={{ cursor: 'pointer', opacity: selectedMajor && selectedMajor !== major.name ? 0.3 : 1, transition: 'opacity 0.2s ease' }}
                >
                  <div className={styles.barHeader}>
                    <span className={styles.barLabel}>{major.name}</span>
                    <span className={styles.barValue}>{major.count} <span>Students</span></span>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={`${styles.barFill} ${colorClass}`} style={{ width }}></div>
                  </div>
                </div>
              );
            })}


          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <div className={styles.searchContainer}>
                <div className={styles.searchIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search by student name or NIM..." 
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className={styles.tableActions} style={{ position: 'relative' }}>
                <button 
                  className={styles.btnOutline} 
                  style={{ padding: '8px 12px' }}
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14"></line>
                    <line x1="4" y1="10" x2="4" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12" y2="3"></line>
                    <line x1="20" y1="21" x2="20" y2="16"></line>
                    <line x1="20" y1="12" x2="20" y2="3"></line>
                    <line x1="1" y1="14" x2="7" y2="14"></line>
                    <line x1="9" y1="8" x2="15" y2="8"></line>
                    <line x1="17" y1="16" x2="23" y2="16"></line>
                  </svg>
                  Filters {statusFilter !== 'All' ? `(${statusFilter})` : ''}
                </button>
                {showFilterDropdown && (
                  <div style={{ position: 'absolute', top: '100%', right: '0', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', zIndex: 10, minWidth: '150px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                    <div style={{ padding: '8px', cursor: 'pointer', fontWeight: statusFilter === 'All' ? 'bold' : 'normal' }} onClick={() => { setStatusFilter('All'); setShowFilterDropdown(false); }}>All</div>
                    <div style={{ padding: '8px', cursor: 'pointer', fontWeight: statusFilter === 'Checked-in' ? 'bold' : 'normal' }} onClick={() => { setStatusFilter('Checked-in'); setShowFilterDropdown(false); }}>Checked-in</div>
                    <div style={{ padding: '8px', cursor: 'pointer', fontWeight: statusFilter === 'Pending' ? 'bold' : 'normal' }} onClick={() => { setStatusFilter('Pending'); setShowFilterDropdown(false); }}>Pending</div>
                  </div>
                )}
                {selectedMajor && (
                  <button 
                    onClick={() => setSelectedMajor(null)}
                    style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', color: '#64748b' }}
                  >
                    Clear Major
                  </button>
                )}
                <span className={styles.showingText}>Showing {filteredGuests.length > 0 ? (safeCurrentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(safeCurrentPage * itemsPerPage, filteredGuests.length)} of {filteredGuests.length} entries</span>
              </div>
            </div>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STUDENT NAME</th>
                  <th>PAYMENT STATUS</th>
                  <th>MAJOR</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGuests.length > 0 ? paginatedGuests.map((row) => {
                  const isCheckedIn = row.method === 'Self Check-in' || row.method === 'Manual Input' || (row.time && row.time !== '');
                  const status = isCheckedIn ? 'Checked-in' : 'Pending';
                  const dotClass = isCheckedIn ? styles.dotGreen : styles.dotYellow;
                  
                  let avatarBg = styles.bgBlue;
                  let pillClass = styles.pillCS;
                  let majorText = 'CS';
                  
                  if (row.major.includes('Information') || row.major === 'IS') {
                    avatarBg = styles.bgBrown;
                    pillClass = styles.pillIS;
                    majorText = 'IS';
                  } else if (row.major.includes('Visual') || row.major === 'DKV') {
                    avatarBg = styles.bgOrange;
                    pillClass = styles.pillDKV;
                    majorText = 'DKV';
                  }

                  const safeRowName = String(row.name || '');
                  const initials = safeRowName.substring(0, 2).toUpperCase();

                  return (
                    <tr key={row.id}>
                      <td>
                        <div className={styles.studentCell}>
                          <div className={`${styles.avatar} ${avatarBg}`}>
                            {initials}
                          </div>
                          {row.name}
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          color: (row.paymentStatus?.toLowerCase() === 'paid' || row.paymentStatus?.toLowerCase() === 'lunas') ? '#10b981' : '#f59e0b',
                          fontWeight: 500
                        }}>
                          {row.paymentStatus || 'Unpaid'}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.pill} ${pillClass}`}>{row.major}</span>
                      </td>
                      <td>
                        <div className={styles.statusCell}>
                          <div className={`${styles.statusDot} ${dotClass}`}></div>
                          {status}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No data found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <span 
                  className={styles.pageText} 
                  style={{ cursor: safeCurrentPage === 1 ? 'default' : 'pointer', opacity: safeCurrentPage === 1 ? 0.5 : 1 }}
                  onClick={() => safeCurrentPage > 1 && setCurrentPage(safeCurrentPage - 1)}
                >
                  Previous
                </span>
                <div className={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    if (page === 1 || page === totalPages || (page >= safeCurrentPage - 1 && page <= safeCurrentPage + 1)) {
                      return (
                        <div 
                          key={page} 
                          className={`${styles.pageNumber} ${safeCurrentPage === page ? styles.active : ''}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </div>
                      );
                    } else if (page === safeCurrentPage - 2 || page === safeCurrentPage + 2) {
                      return <div key={page} className={styles.pageNumber} style={{ cursor: 'default' }}>...</div>;
                    }
                    return null;
                  })}
                </div>
                <span 
                  className={styles.pageText} 
                  style={{ cursor: safeCurrentPage === totalPages ? 'default' : 'pointer', opacity: safeCurrentPage === totalPages ? 0.5 : 1, color: '#0b1930' }}
                  onClick={() => safeCurrentPage < totalPages && setCurrentPage(safeCurrentPage + 1)}
                >
                  Next
                </span>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
