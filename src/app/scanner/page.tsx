'use client';

import React, { useEffect, useState, useRef } from 'react';
import styles from './scanner.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import { Guest } from '@/lib/data';
import { Html5Qrcode } from 'html5-qrcode';
import { syncGuestsFromSheet, checkInGuestToSheet } from '@/lib/googleSheets';

export default function ScannerPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [scannedGuest, setScannedGuest] = useState<Guest | null>(null);
  const [totalHadir, setTotalHadir] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
    
    // Load guests for lookup
    const stored = localStorage.getItem('unievent_guests');
    if (stored) {
      setGuests(JSON.parse(stored));
    }
    
    syncGuestsFromSheet().then(fresh => {
      if (fresh && fresh.length > 0) {
        setGuests(fresh);
        localStorage.setItem('unievent_guests', JSON.stringify(fresh));
      }
    }).catch(console.error);

  }, []);

  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    if (!scanResult) {
      html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: {width: 250, height: 250}, aspectRatio: 1.0 },
        onScanSuccess,
        onScanFailure
      ).catch(console.error);
    }
    
    return () => {
      if (html5QrCode) {
        try {
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
          }).catch(() => {
            try { html5QrCode.clear(); } catch(e) {}
          });
        } catch (e) {
          try { html5QrCode.clear(); } catch(e) {}
        }
      }
    };
  }, [scanResult]);

  const onScanSuccess = (decodedText: string) => {
    setScanResult(decodedText);
    
    // Look up guest
    const found = guests.find(g => g.registrationNumber === decodedText);
    if (found) {
      setScannedGuest(found);
      setTotalHadir(found.totalRSVP || 1); // Default to their RSVP count
      setErrorMsg('');
    } else {
      setScannedGuest(null);
      setErrorMsg(`Guest with Registration Number ${decodedText} not found.`);
    }
  };

  const onScanFailure = (error: any) => {
    // Ignore frequent scan failures
  };

  const handleSubmit = async () => {
    if (!scannedGuest) return;
    
    setIsSubmitting(true);
    try {
      await checkInGuestToSheet(scannedGuest.id, undefined, totalHadir);
      
      // Update local state
      const updatedGuests = guests.map(g => {
        if (g.id === scannedGuest.id) {
          return { 
            ...g, 
            time: new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
            method: 'Self Check-in',
            totalHadir: totalHadir 
          };
        }
        return g;
      });
      setGuests(updatedGuests as any);
      localStorage.setItem('unievent_guests', JSON.stringify(updatedGuests));
      window.dispatchEvent(new Event('storage'));
      
      // Show success modal
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        handleReset();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Failed to check in guest. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setScannedGuest(null);
    setTotalHadir(1);
    setErrorMsg('');
  };

  return (
    <div className={`${styles.layout} ${isSidebarOpen ? '' : styles.sidebarClosed}`}>
      <div className={`${styles.sidebarWrapper} ${isSidebarOpen ? '' : styles.closed}`}>
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
            <h1 className={styles.pageTitle}>QR Scanner</h1>
            <p className={styles.pageSubtitle}>Scan guest QR code to check them in.</p>
          </div>

          <div className={styles.scannerContainer}>
            <div className={styles.readerWrapper} style={{ display: scanResult ? 'none' : 'block' }}>
              <div id="reader" style={{ width: '100%', minHeight: '300px', borderRadius: '16px', overflow: 'hidden', border: 'none' }}></div>
            </div>

            {scanResult && !scannedGuest && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ color: '#ef4444', marginBottom: '16px', fontWeight: 'bold' }}>
                  {errorMsg}
                </div>
                <button className={styles.rescanBtn} onClick={handleReset}>
                  Scan Again
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {scanResult && scannedGuest && !showSuccess && (
        <div className={styles.modalOverlay}>
          <div className={styles.scanModalContent}>
            <h3 className={styles.modalTitle}>Guest Found</h3>
            
            <div className={styles.guestInfo}>
              <div className={styles.guestName}>{scannedGuest.name}</div>
              <div className={styles.guestDetail}>Registration: {scannedGuest.registrationNumber}</div>
              <div className={styles.guestDetail}>Major: {scannedGuest.major}</div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Total Hadir (Guests Arrived)</label>
              <input 
                type="number" 
                className={styles.input}
                value={totalHadir}
                onChange={(e) => setTotalHadir(Number(e.target.value))}
                min={1}
              />
            </div>

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={handleReset} disabled={isSubmitting}>
                Cancel
              </button>
              <button className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Checking in...' : 'Confirm Check-in'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && scannedGuest && (
        <div className={styles.modalOverlay}>
          <div className={styles.scanModalContent} style={{ textAlign: 'center', padding: '40px 20px', maxWidth: '400px' }}>
            <div style={{ color: '#10b981', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className={styles.modalTitle} style={{ marginBottom: '8px', fontSize: '24px' }}>Check-in Successful!</h3>
            <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.5' }}>
              <strong style={{ color: '#0f172a' }}>{scannedGuest.name}</strong><br />has been successfully checked in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
