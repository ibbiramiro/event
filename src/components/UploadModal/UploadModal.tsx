'use client';

import React from 'react';
import styles from './UploadModal.module.css';

interface Props {
  onClose: () => void;
  onUpload: () => void;
}

export default function UploadModal({ onClose, onUpload }: Props) {
  // Prevent clicks inside the modal from bubbling up and closing the overlay
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleUploadClick = () => {
    // In a real app we would read the file here.
    // For now, we simulate success and call onUpload to reset the event.
    onUpload();
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={handleModalClick}>
        
        <div className={styles.header}>
          <h2 className={styles.title}>Upload Data Tamu</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.infoBox}>
            <div className={styles.infoIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div className={styles.infoContent}>
              <span className={styles.infoText}>
                Pastikan format file Anda sesuai dengan standar sistem (CSV atau Excel).
              </span>
              <span className={styles.warningText}>
                Peringatan: Upload data tamu baru akan membuat event baru dan menghapus seluruh data tamu sebelumnya. Download data Anda sebelum melanjutkan!
              </span>
              <a href="#" className={styles.downloadLink}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download template if needed
              </a>
            </div>
          </div>

          <div className={styles.uploadZone}>
            <div className={styles.uploadIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <span className={styles.uploadTitle}>Pilih file atau tarik ke sini</span>
            <span className={styles.uploadSubtitle}>Hanya file .csv, .xlsx, .xls (Maks. 10MB)</span>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.btnUpload} onClick={handleUploadClick}>
            Upload Data
          </button>
        </div>

      </div>
    </div>
  );
}
