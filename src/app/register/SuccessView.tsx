'use client';

import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import styles from './register.module.css';

// Re-using same icons for display
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

const TicketIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16"></path><path d="M4 17h16"></path><path d="M7 22v-2"></path><path d="M17 22v-2"></path><path d="M7 4V2"></path><path d="M17 4V2"></path><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><path d="M12 12h.01"></path></svg>
)

interface SuccessViewProps {
  data: {
    id: string;
    fullName: string;
    kelas: string;
    asalSekolah: string;
    phone: string;
    majorInterest: string;
  };
}

export default function SuccessView({ data }: SuccessViewProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!ticketRef.current) return;
    
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Calculate centering
      const marginY = 20;
      
      pdf.addImage(imgData, 'PNG', 10, marginY, pdfWidth - 20, pdfHeight - (20 * canvas.height / canvas.width));
      pdf.save(`${data.id}-Ticket.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  const handleBackToHome = () => {
    window.location.reload();
  };

  return (
    <div className={styles.successCard}>
      
      <div className={styles.successHeader}>
        <div className={styles.checkIconWrapper}>
          <div className={styles.checkIcon}>
            <CheckIcon />
          </div>
        </div>
        <div className={styles.title} style={{ fontSize: '1.5rem', color: '#0f172a' }}>Registration Successful!</div>
        <div className={styles.subtitle} style={{ marginTop: '0.5rem' }}>Your digital pass is ready. Please present this QR code at the entrance.</div>
      </div>

      {/* The Ticket (This part gets rendered to PDF) */}
      <div className={styles.ticketCard} ref={ticketRef}>
        <div style={{ textAlign: 'center' }}>
          <div className={styles.ticketTag}>
            <TicketIcon /> VIP PASS
          </div>
          <div className={styles.ticketTitle}>Nexus Open House</div>
        </div>

        <div className={styles.qrContainer}>
          <QRCode value={data.id} size={150} level="H" />
        </div>
        
        <div className={styles.idBadge}>
          ID: {data.id}
        </div>

        <div className={styles.divider}></div>

        <div className={styles.summaryTitle}>REGISTRATION SUMMARY</div>
        
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <div className={styles.summaryLabel}>Full Name</div>
            <div className={styles.summaryValue}>{data.fullName}</div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryLabel}>Kelas (Grade)</div>
            <div className={styles.summaryValue}>{data.kelas}</div>
          </div>
          <div className={styles.summaryItem} style={{ gridColumn: 'span 2' }}>
            <div className={styles.summaryLabel}>Asal Sekolah (School)</div>
            <div className={styles.summaryValue}>{data.asalSekolah}</div>
          </div>
        </div>

        <div className={styles.summaryItem} style={{ marginTop: '0.5rem' }}>
          <div className={styles.summaryLabel}>Major Interest</div>
          <div className={styles.summaryMajor}>
            <div className={styles.summaryMajorIcon}>
              <SettingsIcon />
            </div>
            <div className={styles.summaryMajorText}>{data.majorInterest}</div>
          </div>
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button onClick={handleDownloadPdf} className={styles.downloadBtn}>
          <DownloadIcon /> Download PDF
        </button>
        <button onClick={handleBackToHome} className={styles.homeBtn}>
          Back to Home
        </button>
      </div>

    </div>
  );
}
