'use client';

import React, { useState, useEffect } from 'react';
import styles from '../analytics/analytics.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopNav from '@/components/TopNav/TopNav';
import { Guest } from '@/lib/data';

export default function CrmPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [regNumbers, setRegNumbers] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<string>('System');
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
    const storedFullName = localStorage.getItem('unievent_full_name');
    if (storedFullName) {
      setCurrentUser(storedFullName);
      return;
    }

    const emailCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('unievent_email='))
      ?.split('=')[1];
      
    if (emailCookie) {
      const emailPrefix = decodeURIComponent(emailCookie).split('@')[0];
      const formatted = emailPrefix.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
      setCurrentUser(formatted);
    } else {
      const storedEmail = localStorage.getItem('unievent_email');
      if (storedEmail) setCurrentUser(storedEmail.split('@')[0]);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, paymentFilter]);

  useEffect(() => {
    const stored = localStorage.getItem('unievent_guests');
    if (stored) {
      setGuests(JSON.parse(stored));
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'unievent_guests' && e.newValue) {
        setGuests(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const filteredGuests = guests.filter(g => {
    const searchLower = searchQuery.toLowerCase();
    const safeName = String(g.name || '');
    const nameMatch = safeName.toLowerCase().includes(searchLower);
    if (searchQuery && !nameMatch) return false;

    const isPaid = String(g.paymentStatus || '').toLowerCase() === 'paid' || String(g.paymentStatus || '').toLowerCase() === 'lunas';
    if (paymentFilter === 'Paid' && !isPaid) return false;
    if (paymentFilter === 'Unpaid' && isPaid) return false;

    return true;
  });

  const itemsPerPage = 25;
  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedGuests = filteredGuests.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  const handleProcessPayment = async (guestId: string, name: string) => {
    const reg = regNumbers[guestId];
    if (!reg) {
      alert("Please enter a Registration Number.");
      return;
    }

    setIsProcessing(prev => ({ ...prev, [guestId]: true }));
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'payment',
          rowNumber: Number(guestId),
          registrationNumber: reg,
          verifiedBy: currentUser
        })
      });

      if (!res.ok) throw new Error("Payment failed");
      
      // Optimistic update
      setGuests(prev => prev.map(g => g.id === guestId ? { ...g, paymentStatus: 'Paid', registrationNumber: reg, verifiedBy: currentUser } : g));
      // Update localStorage so other tabs sync
      const updatedGuests = guests.map(g => g.id === guestId ? { ...g, paymentStatus: 'Paid', registrationNumber: reg, verifiedBy: currentUser } : g);
      localStorage.setItem('unievent_guests', JSON.stringify(updatedGuests));
      window.dispatchEvent(new Event('storage'));
      
      alert(`Payment for ${name} processed successfully! Registration number saved.`);
    } catch (err) {
      console.error(err);
      alert("Error processing payment. Please check your API.");
    } finally {
      setIsProcessing(prev => ({ ...prev, [guestId]: false }));
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
              <h1 className={styles.pageTitle}>CRM & Payment Tracking</h1>
              <p className={styles.pageSubtitle}>Monitor guest payments and verification details.</p>
            </div>
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
                  placeholder="Search by student name..." 
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className={styles.tableActions} style={{ position: 'relative' }}>
                <select 
                  className={styles.btnOutline} 
                  style={{ padding: '8px 12px', cursor: 'pointer', appearance: 'none', backgroundColor: 'transparent' }}
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value as any)}
                >
                  <option value="All">All Payments</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
                <span className={styles.showingText}>Showing {filteredGuests.length > 0 ? (safeCurrentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(safeCurrentPage * itemsPerPage, filteredGuests.length)} of {filteredGuests.length} entries</span>
              </div>
            </div>

            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                <tr>
                  <th>REG. NUMBER</th>
                  <th>STUDENT NAME</th>
                  <th>MAJOR</th>
                  <th>PAYMENT STATUS</th>
                  <th>VERIFIED BY (MARKETING)</th>
                  <th style={{ width: '200px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGuests.length > 0 ? paginatedGuests.map((row) => {
                  const isPaid = String(row.paymentStatus || '').toLowerCase() === 'paid' || String(row.paymentStatus || '').toLowerCase() === 'lunas';
                  const dotClass = isPaid ? styles.dotGreen : styles.dotYellow;
                  
                  let avatarBg = styles.bgBlue;
                  if (row.major.includes('Information') || row.major === 'IS') {
                    avatarBg = styles.bgBrown;
                  } else if (row.major.includes('Visual') || row.major === 'DKV') {
                    avatarBg = styles.bgOrange;
                  }
                  const safeRowName = String(row.name || '');
                  const initials = safeRowName.substring(0, 2).toUpperCase();

                  return (
                    <tr key={row.id}>
                      <td style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{row.registrationNumber || '-'}</td>
                      <td>
                        <div className={styles.studentCell}>
                          <div className={`${styles.avatar} ${avatarBg}`}>
                            {initials}
                          </div>
                          {row.name}
                        </div>
                      </td>
                      <td>{row.major}</td>
                      <td>
                        <div className={styles.statusCell}>
                          <div className={`${styles.statusDot} ${dotClass}`}></div>
                          {row.paymentStatus || 'Unpaid'}
                        </div>
                      </td>
                      <td>
                        {isPaid ? (
                          <span style={{ fontWeight: 500, color: '#0f172a' }}>
                            {row.verifiedBy || 'System'}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td>
                        {isPaid ? (
                          <span style={{ color: '#94a3b8', fontWeight: 500 }}>
                            -
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Reg Number"
                              value={regNumbers[row.id] || ''}
                              onChange={(e) => setRegNumbers(prev => ({ ...prev, [row.id]: e.target.value }))}
                              style={{ width: '100px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', outline: 'none' }}
                            />
                            <button
                              onClick={() => handleProcessPayment(row.id, row.name)}
                              disabled={isProcessing[row.id]}
                              style={{
                                backgroundColor: '#0b1930', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 500, cursor: isProcessing[row.id] ? 'not-allowed' : 'pointer', opacity: isProcessing[row.id] ? 0.7 : 1
                              }}
                            >
                              {isProcessing[row.id] ? '...' : 'Pay'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

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
