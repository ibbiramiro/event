'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './TopNav.module.css';
import { usePathname, useRouter } from 'next/navigation';

export default function TopNav({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [fullName, setFullName] = useState('Admin User');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
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
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setIsProfileOpen(false);
    router.push('/login');
  };

  const isGuestList = pathname === '/guest-list';
  const isCrm = pathname === '/crm';

  return (
    <header className={styles.topNav}>
      <button className={styles.menuBtn} aria-label="Menu" onClick={onToggleSidebar} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#0b1930', fontWeight: 'bold', fontSize: '16px' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        Menu
      </button>

      {isGuestList ? (
        // Layout for Guest List
        <div className={styles.searchContainer}>
          <div className={styles.searchIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="Search..." 
            className={styles.searchInput}
          />
        </div>
      ) : (
        // Layout for Dashboard, Analytics, and CRM
        <div></div>
      )}
      
      <div className={styles.actions}>
        {isGuestList && <span className={styles.staffPortal}>Staff Portal</span>}
        
        <div className={styles.iconGroup}>

          {isGuestList && (
            <button className={styles.iconBtn} aria-label="Calendar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </button>
          )}
        </div>
        
        <div className={styles.profileContainer} ref={dropdownRef}>
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
                Profile Account
              </button>
              
              <div className={styles.dropdownDivider}></div>
              
              <button 
                className={styles.dropdownItem} 
                onClick={handleSignOut}
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
    </header>
  );
}
