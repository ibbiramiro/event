'use client';

import React from 'react';
import styles from './programs.module.css';
import Link from 'next/link';

export default function ProgramsPage() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        
        <div className={styles.illustration}>
          🎓
        </div>

        <h1 className={styles.title}>Faculty & Program Study</h1>
        <p className={styles.subtitle}>
          Our programs are designed to shape future leaders. Explore our programs below.
        </p>

        <div className={styles.buttonGrid}>
          <div className={styles.buttonRow}>
            <Link href="/checkin" className={styles.programButton}>
              Computer Science (@Medan)
            </Link>
            <Link href="/checkin" className={styles.programButton}>
              Visual Communication Design (@Medan)
            </Link>
          </div>
          
          <div className={styles.buttonRow}>
            <Link href="/checkin" className={styles.programButton}>
              Digital Business (@Medan)
            </Link>
            <Link href="/checkin" className={styles.programButton}>
              International Trade (@Medan)
            </Link>
          </div>
          
          <div className={styles.buttonRow}>
            <Link href="/checkin" className={styles.programButton}>
              Information Systems (@Medan)
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
