'use client';

import React, { useState, useEffect } from 'react';
import styles from './crm.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopNav from '@/components/TopNav/TopNav';
import { grantAccess, removeAccess } from './actions';

export default function CrmContent({ initialStaffData }: { initialStaffData: any[] }) {
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const filteredStaff = initialStaffData.filter(staff => 
    staff.email.toLowerCase().includes(filter.toLowerCase()) || 
    staff.role.toLowerCase().includes(filter.toLowerCase())
  );

  const getPillClass = (role: string) => {
    switch(role) {
      case 'Super Admin': return styles.pillSuperAdmin;
      case 'Marketing': return styles.pillMarketing;
      case 'Receptionist': return styles.pillReceptionist;
      case 'Kaprodi': return styles.pillKaprodi;
      default: return styles.pillSuperAdmin;
    }
  };

  const getAvatarClass = (role: string) => {
    switch(role) {
      case 'Super Admin': return styles.bgBlue;
      case 'Marketing': return styles.bgPurple;
      case 'Receptionist': return styles.bgBrown;
      case 'Kaprodi': return styles.bgLightPurple;
      default: return styles.bgBlue;
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
            <h1 className={styles.pageTitle}>User Authority Management</h1>
            <p className={styles.pageSubtitle}>Manage staff access levels and organizational roles within the UniEvent ecosystem.</p>
          </div>

          {/* Card 1: Grant New Access */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Grant New Access</h2>
            </div>
            
            <form action={async (formData) => {
              setIsLoading(true);
              const res = await grantAccess(formData);
              if (res.error) alert(res.error);
              setIsLoading(false);
            }}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>User Email Address</label>
                  <input 
                    name="email"
                    type="email" 
                    placeholder="staff@university.edu" 
                    className={styles.formInput}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Assign Role</label>
                  <select name="role" className={styles.formSelect} required>
                    <option value="">Select Role...</option>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Kaprodi">Kaprodi</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Set User PIN</label>
                  <input 
                    name="pin"
                    type="text" 
                    placeholder="e.g. 123456" 
                    className={styles.formInput}
                    required
                  />
                </div>
                <button type="submit" className={styles.btnPrimary} disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Grant Access'}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Authorized Staff */}
          <div className={styles.card}>
            <div className={`${styles.cardHeader} ${styles.tableHeader}`}>
              <h2 className={styles.cardTitle}>Authorized Staff</h2>
              <div className={styles.searchContainer}>
                <div className={styles.searchIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Filter users..." 
                  className={styles.searchInput}
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                <tr>
                  <th>USER EMAIL</th>
                  <th>ASSIGNED ROLE</th>
                  <th>DATE ADDED</th>
                  <th style={{ textAlign: 'right', paddingRight: '32px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={`${styles.avatar} ${getAvatarClass(row.role)}`}>
                          {row.init}
                        </div>
                        {row.email}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.pill} ${getPillClass(row.role)}`}>{row.role}</span>
                    </td>
                    <td>{row.date}</td>
                    <td style={{ textAlign: 'right', paddingRight: '32px' }}>
                      <button 
                        className={styles.actionBtn}
                        onClick={async () => {
                          if (confirm(`Remove access for ${row.email}?`)) {
                            const res = await removeAccess(row.email);
                            if (res.error) alert(res.error);
                          }
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

        </main>
      </div>
    </div>
  );
}
