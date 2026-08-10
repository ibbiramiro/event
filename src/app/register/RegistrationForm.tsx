'use client';

import React, { useState } from 'react';
import styles from './register.module.css';
import { submitRegistration } from './actions';

// SVG Icons for Majors
const MonitorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
);
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);
const PaletteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>
);
const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);
const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
);
const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
);

const majors = [
  { id: 'cs', title: 'Computer Science', desc: 'Technology & Software', icon: <MonitorIcon />, iconClass: styles.iconCs },
  { id: 'is', title: 'Information Systems', desc: 'Business & Tech Logic', icon: <SettingsIcon />, iconClass: styles.iconIs },
  { id: 'dkv', title: 'DKV', desc: 'Visual Communication Design', icon: <PaletteIcon />, iconClass: styles.iconDkv },
  { id: 'db', title: 'Digital Business', desc: 'Business & E-Commerce', icon: <BriefcaseIcon />, iconClass: styles.iconDb },
  { id: 'it', title: 'International Trade', desc: 'Global Market Strategy', icon: <GlobeIcon />, iconClass: styles.iconIt },
];

interface RegistrationFormProps {
  onSuccess: (data: any) => void;
}

export default function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedMajor) {
      alert("Please select a major interest");
      return;
    }
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    formData.append('majorInterest', majors.find(m => m.id === selectedMajor)?.title || selectedMajor);
    
    const result = await submitRegistration(formData);
    setLoading(false);

    if (result.success) {
      onSuccess(result.data);
    } else {
      alert(result.error || "An error occurred");
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>Welcome to the Event, Please Check In</div>
        <div className={styles.subtitle}>Fill in your details below to finalize your registration and appear on the wall.</div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="fullName">Full Name</label>
          <input required type="text" id="fullName" name="fullName" className={styles.input} placeholder="e.g. Alex Johnson" />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="kelas">Kelas</label>
          <input required type="text" id="kelas" name="kelas" className={styles.input} placeholder="e.g. 12 IPA 1" />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="asalSekolah">Asal Sekolah</label>
          <input required type="text" id="asalSekolah" name="asalSekolah" className={styles.input} placeholder="e.g. SMA Negeri 1 Jakarta" />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="phone">Nomor Telepon</label>
          <input required type="tel" id="phone" name="phone" className={styles.input} placeholder="e.g. 081234567890" />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Select Your Major Interest</label>
          <div className={styles.majorList}>
            {majors.map((major) => (
              <div 
                key={major.id} 
                className={`${styles.majorCard} ${selectedMajor === major.id ? styles.majorCardSelected : ''}`}
                onClick={() => setSelectedMajor(major.id)}
              >
                <div className={`${styles.iconWrapper} ${major.iconClass}`}>
                  {major.icon}
                </div>
                <div className={styles.majorInfo}>
                  <span className={styles.majorName}>{major.title}</span>
                  <span className={styles.majorDesc}>{major.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading || !selectedMajor}>
          {loading ? 'Processing...' : 'Complete Check-In'} <ArrowRightIcon />
        </button>

      </form>
    </div>
  );
}
