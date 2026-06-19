'use client';

import React from 'react';
import styles from './Sidebar.module.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const isGuestList = pathname === '/guest-list';
  const isCrm = pathname === '/crm';
  const isUsers = pathname === '/users';
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    const roleCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('unievent_role='))
      ?.split('=')[1];
    if (roleCookie) {
      setRole(decodeURIComponent(roleCookie));
    }

    // Auto-sync polling logic across all pages
    let isMounted = true;
    const intervalId = setInterval(async () => {
      try {
        const { syncGuestsFromSheet } = await import('@/lib/googleSheets');
        const sheetGuests = await syncGuestsFromSheet();
        
        if (isMounted && sheetGuests && sheetGuests.length > 0) {
          const newGuestsStr = JSON.stringify(sheetGuests);
          const oldGuestsStr = localStorage.getItem('unievent_guests');
          
          if (newGuestsStr !== oldGuestsStr) {
            localStorage.setItem('unievent_guests', newGuestsStr);
            // Trigger storage event so that dashboard and guest list can update their states
            window.dispatchEvent(new StorageEvent('storage', { 
              key: 'unievent_guests', 
              newValue: newGuestsStr 
            }));
          }
        }
      } catch (error: any) {
        if (error.name !== 'TypeError' && error.message !== 'Failed to fetch') {
          console.warn('Auto-sync error:', error);
        }
      }
    }, 10000); // 10 seconds polling

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const isReceptionist = role === 'Receptionist';
  const isKaprodi = role?.toLowerCase() === 'kaprodi';

  let brandClass = styles.brandOriginal;
  let logoClass = styles.logoOriginal;
  let brandTextClass = styles.brandTextOriginal;
  let brandTitleClass = styles.brandTitleOriginal;
  let brandSubtitleClass = styles.brandSubtitleOriginal;
  let navItemClass = styles.navItemOriginal;

  if (isGuestList) {
    brandClass = styles.brandGuestList;
    logoClass = styles.logoGuestList;
    brandTextClass = styles.brandTextGuestList;
    brandTitleClass = styles.brandTitleGuestList;
    brandSubtitleClass = styles.brandSubtitleGuestList;
    navItemClass = styles.navItemGuestList;
  } else if (isCrm || isUsers) {
    brandClass = styles.brandCrm;
    logoClass = styles.logoCrm;
    brandTextClass = styles.brandTextCrm;
    brandTitleClass = styles.brandTitleCrm;
    brandSubtitleClass = styles.brandSubtitleCrm;
    navItemClass = styles.navItemCrm;
  }

  return (
    <aside className={styles.sidebar}>
      <div className={brandClass}>
        <div className={logoClass}>
          {isCrm || isUsers ? (
            'U'
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          )}
        </div>
        <div className={brandTextClass}>
          <span className={brandTitleClass}>
            UniEvent {isGuestList ? '' : 'Admin'}
          </span>
          <span className={brandSubtitleClass}>
            {isGuestList ? (
              <>University<br/>Management</>
            ) : (
              'Management System'
            )}
          </span>
        </div>
      </div>

      {isUsers && (
        <div className={styles.topBtnContainer}>
          <button className={styles.newEventBtnTop}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Grant Access
          </button>
        </div>
      )}

      <nav className={styles.nav}>
        <Link 
          href="/dashboard" 
          className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''} ${navItemClass}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Dashboard
        </Link>
        
        {!isKaprodi && (
          <Link 
            href="/guest-list" 
            className={`${styles.navItem} ${pathname === '/guest-list' ? styles.active : ''} ${navItemClass}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Guest List
          </Link>
        )}
        
        {!isReceptionist && (
          <Link 
            href="/analytics" 
            className={`${styles.navItem} ${pathname === '/analytics' ? styles.active : ''} ${navItemClass}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            Analytics
          </Link>
        )}
        
        {!isReceptionist && !isKaprodi && (
          <Link 
            href="/users" 
            className={`${styles.navItem} ${pathname === '/users' ? styles.active : ''} ${navItemClass}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Users
          </Link>
        )}
        
        {!isReceptionist && !isKaprodi && (
          <Link 
            href="/crm" 
            className={`${styles.navItem} ${pathname === '/crm' ? styles.active : ''} ${navItemClass}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            CRM
          </Link>
        )}
      </nav>


    </aside>
  );
}
