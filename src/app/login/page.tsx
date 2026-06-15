import React from 'react';
import styles from './login.module.css';
import { Metadata } from 'next';
import Link from 'next/link';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In - UniEvent Admin',
  description: 'Access your administrative dashboard',
};

export default function LoginPage() {
  return (
    <div className={styles.container}>
      {/* Left Column - Branding */}
      <div className={styles.leftColumn}>
        <div className={styles.leftContent}>
          <div className={styles.brand}>
            <div className={styles.logo}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className={styles.brandName}>UniEvent Admin</span>
          </div>

          <h1 className={styles.headline}>Empowering Campus Engagement.</h1>
          
          <p className={styles.description}>
            The centralized platform for academic event coordination, guest management, and departmental analytics. Built for the modern university ecosystem.
          </p>

          <div className={styles.securityCard}>
            <div className={styles.securityHeader}>
              <div className={styles.shieldIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
              </div>
              <div className={styles.securityText}>
                <span className={styles.securityTitle}>Enterprise Security</span>
                <span className={styles.securitySubtitle}>Azure AD Integrated</span>
              </div>
            </div>
            <div className={styles.progressBarContainer}>
              <div className={styles.progressBar}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className={styles.rightColumn}>
        <div className={styles.formContainer}>
          <h2 className={styles.formTitle}>Sign In</h2>
          <p className={styles.formDesc}>
            Access your administrative dashboard using your university credentials.
          </p>

          <LoginForm />

          <div className={styles.secureBanner}>
            <div className={styles.secureBannerIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <span className={styles.secureBannerText}>
              This is a secure system. All access attempts are logged for security auditing.
            </span>
          </div>

          <div className={styles.footer}>
            <div className={styles.footerLinks}>
              <Link href="#" className={styles.footerLink}>Privacy Policy</Link>
              <Link href="#" className={styles.footerLink}>IT Support</Link>
            </div>
            <span>© 2026 Binus@Medan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
