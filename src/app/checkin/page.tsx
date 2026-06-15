'use client';

import React, { useState } from 'react';
import styles from './page.module.css';
import { Guest } from '@/lib/data';
import Link from 'next/link';

export default function MobileCheckIn() {
  const [formData, setFormData] = useState({ name: '', contact: '', major: '' });
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.major) return;

    setIsLoading(true);

    // Build the guest object
    const newGuest: Guest = {
      id: Date.now().toString(),
      name: formData.name,
      time: new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      major: formData.major,
      method: 'Self Check-in',
    };

    // Load existing guests from localStorage
    const existingGuests: Guest[] = JSON.parse(localStorage.getItem('unievent_guests') || '[]');
    
    // Check if the guest already exists locally by name and major
    const existingIndex = existingGuests.findIndex(
      g => g.name.toLowerCase() === formData.name.toLowerCase() && g.major === formData.major
    );

    let response;
    try {
      if (existingIndex !== -1) {
        // Guest exists, check them in
        const { checkInGuestToSheet } = await import('@/lib/googleSheets');
        response = await checkInGuestToSheet(existingGuests[existingIndex].id, undefined);
      } else {
        // Guest does not exist, register new
        const { registerGuestToSheet, checkInGuestToSheet, syncGuestsFromSheet } = await import('@/lib/googleSheets');
        await registerGuestToSheet(formData, undefined);
        
        // Wait 1.5 seconds to ensure Google Sheets has fully committed the new row
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Fetch fresh guests to find the row number of the newly registered guest
        const freshGuests = await syncGuestsFromSheet(undefined);
        // Find the last matching guest (in case of duplicates)
        const newlyAdded = [...freshGuests].reverse().find(g => g.name.toLowerCase() === formData.name.toLowerCase() && g.major === formData.major);
        
        if (newlyAdded) {
          newGuest.id = newlyAdded.id;
          // Immediately check them in since this is the Check-In page!
          await checkInGuestToSheet(newGuest.id, undefined);
        }
      }
    } catch (error) {
      console.error('Failed to sync to spreadsheet', error);
      // Still proceed to show success locally if API fails
    }

    let updatedGuests;
    if (existingIndex !== -1) {
      // Update existing guest
      const existing = existingGuests[existingIndex];
      existing.time = newGuest.time;
      existing.method = 'Self Check-in';
      
      // Move to top
      existingGuests.splice(existingIndex, 1);
      updatedGuests = [existing, ...existingGuests];
    } else {
      // Add as new guest
      updatedGuests = [newGuest, ...existingGuests];
    }

    localStorage.setItem('unievent_guests', JSON.stringify(updatedGuests));
    
    // Dispatch event to update other tabs immediately
    window.dispatchEvent(new Event('storage'));

    setIsLoading(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className={styles.mobileContainer}>
        <div className={styles.successOverlay}>
          <div className={styles.successCheck}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 className={styles.headerTitle} style={{ fontSize: '24px' }}>You're Checked In!</h2>
          <p className={styles.headerSubtitle}>Thank you, {formData.name}. Please proceed to the main hall.</p>
          {formData.major && (
            <div style={{ marginTop: '16px', display: 'inline-block', backgroundColor: '#f1f5f9', padding: '8px 24px', borderRadius: '24px', color: '#0b1930', fontWeight: '600', fontSize: '15px' }}>
              Program: {formData.major}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mobileContainer}>
      <div className={styles.content}>
        <div className={styles.qrIconBox}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
            <path d="M9 3v4"></path><path d="M15 3v4"></path>
            <path d="M9 15v4"></path><path d="M15 15v4"></path>
          </svg>
        </div>
        
        <h1 className={styles.headerTitle}>Welcome to the Event, Please Check In</h1>
        <p className={styles.headerSubtitle}>Fill in your details below to finalize your registration and appear on the wall.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="e.g. Alex Johnson"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email or Phone Number</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="alex@uni.edu or +123456789"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup} style={{ marginTop: '8px' }}>
            <label className={styles.label}>Select Your Major Interest</label>
            <div className={styles.majorSelection}>
              
              <div 
                className={`${styles.majorCard} ${formData.major === 'Computer Science' ? styles.active : ''}`}
                onClick={() => setFormData({ ...formData, major: 'Computer Science' })}
              >
                <div className={`${styles.majorIcon} ${styles.iconCS}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="12" rx="2" ry="2"></rect>
                    <rect x="9" y="20" width="6" height="2"></rect>
                    <line x1="12" y1="16" x2="12" y2="20"></line>
                  </svg>
                </div>
                <div className={styles.majorText}>
                  <span className={styles.majorTitle}>Computer Science</span>
                  <span className={styles.majorDesc}>Technology & Software</span>
                </div>
              </div>

              <div 
                className={`${styles.majorCard} ${formData.major === 'Information Systems' ? styles.active : ''}`}
                onClick={() => setFormData({ ...formData, major: 'Information Systems' })}
              >
                <div className={`${styles.majorIcon} ${styles.iconIS}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </div>
                <div className={styles.majorText}>
                  <span className={styles.majorTitle}>Information Systems</span>
                  <span className={styles.majorDesc}>Business & Tech Logic</span>
                </div>
              </div>

              <div 
                className={`${styles.majorCard} ${formData.major === 'Visual Communication Design' ? styles.active : ''}`}
                onClick={() => setFormData({ ...formData, major: 'Visual Communication Design' })}
              >
                <div className={`${styles.majorIcon} ${styles.iconDKV}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="13.5" cy="5.5" r="2.5"></circle>
                    <circle cx="20.5" cy="11.5" r="2.5"></circle>
                    <circle cx="17.5" cy="19.5" r="2.5"></circle>
                    <circle cx="10.5" cy="20.5" r="2.5"></circle>
                    <path d="M5.1 14c-.6-1.5-1.1-3.2-1.1-4.8 0-4.4 3.6-8.2 8-8.2s8 3.6 8 8-3.6 8-8 8H7.2"></path>
                  </svg>
                </div>
                <div className={styles.majorText}>
                  <span className={styles.majorTitle}>DKV</span>
                  <span className={styles.majorDesc}>Visual Communication Design</span>
                </div>
              </div>

              <div 
                className={`${styles.majorCard} ${formData.major === 'Digital Business' ? styles.active : ''}`}
                onClick={() => setFormData({ ...formData, major: 'Digital Business' })}
              >
                <div className={`${styles.majorIcon} ${styles.iconDB}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                </div>
                <div className={styles.majorText}>
                  <span className={styles.majorTitle}>Digital Business</span>
                  <span className={styles.majorDesc}>Business & E-Commerce</span>
                </div>
              </div>

              <div 
                className={`${styles.majorCard} ${formData.major === 'International Trade' ? styles.active : ''}`}
                onClick={() => setFormData({ ...formData, major: 'International Trade' })}
              >
                <div className={`${styles.majorIcon} ${styles.iconIT}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </div>
                <div className={styles.majorText}>
                  <span className={styles.majorTitle}>International Trade</span>
                  <span className={styles.majorDesc}>Global Market Strategy</span>
                </div>
              </div>

            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Checking in...' : 'Complete Check-In'}
            {!isLoading && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            )}
          </button>
        </form>

        <div className={styles.divider}>UNIEVENT MANAGEMENT</div>
        
        {/* Placeholder for the hall image */}
        <div className={styles.heroImage}></div>

      </div>
    </div>
  );
}
