'use client';

import React from 'react';
import styles from './LiveArrivals.module.css';
import { Guest } from '@/lib/data';

interface Props {
  guests: Guest[];
}

export default function LiveArrivals({ guests }: Props) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getTagClass = (major: string) => {
    switch (major) {
      case 'Computer Science':
        return styles.tagCS;
      case 'Visual Communication Design':
        return styles.tagDKV;
      case 'Information Systems':
        return styles.tagIS;
      case 'Digital Business':
        return styles.tagDB;
      case 'International Trade':
        return styles.tagIT;
      default:
        return '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Live Arrivals</h2>
          <p className={styles.subtitle}>Real-time guest check-in stream</p>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Guests</span>
            <span className={styles.statValue}>{138 + guests.length}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Target</span>
            <span className={styles.statValue}>250</span>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Guest Name</th>
              <th>Time</th>
              <th>Major</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest, index) => (
              <tr key={guest.id}>
                <td>
                  <div className={styles.guestNameCell}>
                    <div className={`${styles.avatar} ${index > 0 ? styles.avatarLight : ''}`}>
                      {getInitials(guest.name)}
                    </div>
                    <span className={styles.guestName}>{guest.name}</span>
                  </div>
                </td>
                <td className={styles.timeText}>{guest.time}</td>
                <td>
                  <span className={`${styles.tag} ${getTagClass(guest.major)}`}>{guest.major}</span>
                </td>
                <td>
                  <div className={`${styles.methodCell} ${guest.method === 'Self Check-in' ? styles.methodSelf : styles.methodManual}`}>
                    {guest.method === 'Self Check-in' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                      </svg>
                    )}
                    {guest.method}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className={styles.viewAllBtn}>View All Arrivals</button>
      </div>
    </div>
  );
}
