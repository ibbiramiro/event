'use client';

import React, { useState } from 'react';
import styles from './ManualRegistration.module.css';
import { Guest } from '@/lib/data';

interface Props {
  onAddGuest: (guest: Guest) => void;
  onOpenUploadModal?: () => void;
}

export default function ManualRegistration({ onAddGuest, onOpenUploadModal }: Props) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    major: 'Computer Science',
    status: 'Student',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const newGuest: Guest = {
      id: Date.now().toString(),
      name: formData.name,
      time: new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      major: formData.major,
      method: 'Manual Input',
    };

    onAddGuest(newGuest);
    setIsSuccess(true);
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', major: 'Computer Science', status: 'Student' });
    setIsSuccess(false);
  };

  return (
    <div className={styles.container}>
      <button className={styles.uploadBtn} onClick={onOpenUploadModal}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Upload Data Tamu
      </button>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Manual Registration</h2>
          <p className={styles.cardSubtitle}>On-site guest intake form</p>
        </div>

        <div className={styles.cardBody}>
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className={styles.formGroup}>
              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label className={styles.label}>Full Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label className={styles.label}>Phone Number</label>
                <input
                  type="tel"
                  className={styles.input}
                  placeholder="+62 812-3456-7890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className={styles.row} style={{ marginBottom: '24px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Selected Major</label>
                  <select
                    className={styles.select}
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Visual Communication Design">Visual Communication Design</option>
                    <option value="Digital Business">Digital Business</option>
                    <option value="International Trade">International Trade</option>
                    <option value="Information Systems">Information Systems</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Status</label>
                  <select
                    className={styles.select}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Student">Student</option>
                    <option value="Guest">Guest</option>
                  </select>
                </div>
              </div>

              <button type="submit" className={styles.submitBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <polyline points="17 11 19 13 23 9"></polyline>
                </svg>
                Complete Check-in
              </button>
            </form>
          ) : (
            <div className={styles.successContainer}>
              <div className={styles.successIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 className={styles.successTitle}>Registration Successful</h3>
              <p className={styles.successDesc}>The guest has been added to the live arrivals feed.</p>

              <div className={styles.summaryBox}>
                <div className={styles.summaryTitle}>GUEST SUMMARY</div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Guest</span>
                  <span className={styles.summaryValue}>{formData.name}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Major</span>
                  <span className={styles.summaryValue}>
                    {formData.major}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Status</span>
                  <span className={styles.summaryValue}>{formData.status}</span>
                </div>
              </div>

              <button onClick={resetForm} className={styles.submitBtn}>
                Register Another Guest
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.supportBanner}>
        <div className={styles.supportIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </div>
        <div className={styles.supportText}>
          <span className={styles.supportTitle}>Receptionist Support</span>
          <span className={styles.supportDesc}>Contact technical support for scanner issues.</span>
        </div>
      </div>
    </div>
  );
}
