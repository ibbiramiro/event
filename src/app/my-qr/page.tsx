'use client';

import React, { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import styles from './page.module.css';
import { verifyRegistration } from './actions';

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);

const QrIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
);

const SpinnerIcon = () => (
  <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
);

export default function MyQRPage() {
  const [regNumber, setRegNumber] = useState('');
  const [ticketData, setTicketData] = useState<{ name: string; totalRSVP: string; regNumber: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedReg = regNumber.trim();
    if (!trimmedReg) return;

    if (trimmedReg.length < 10) {
      setErrorMsg('Nomor registrasi harus terdiri dari minimal 10 karakter/angka.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setTicketData(null);

    const result = await verifyRegistration(trimmedReg);

    if (result.success && result.data) {
      setTicketData(result.data);
    } else {
      setErrorMsg(result.error || 'Gagal memverifikasi');
    }
    setLoading(false);
  };

  const handleDownloadPdf = async () => {
    if (!ticketRef.current || !ticketData) return;
    
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
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
      
      const marginY = 20;
      
      pdf.addImage(imgData, 'PNG', 10, marginY, pdfWidth - 20, pdfHeight - (20 * canvas.height / canvas.width));
      pdf.save(`${ticketData.regNumber}-Ticket.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.title}>Get Your QR Code</div>
        <div className={styles.subtitle}>Enter your registration number to retrieve your pass</div>

        {!ticketData ? (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="regNumber" className={styles.label}>Registration Number</label>
              <input 
                id="regNumber"
                type="text" 
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. 1244"
                className={styles.input}
                disabled={loading}
                required
              />
            </div>
            
            {errorMsg && <div className={styles.errorText}>{errorMsg}</div>}
            
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? (
                <><SpinnerIcon /> Verifying...</>
              ) : (
                <><QrIcon /> Show QR Code</>
              )}
            </button>
          </form>
        ) : (
          <div className={styles.qrContainer}>
            <div className={styles.ticket} ref={ticketRef}>
              <div className={styles.ticketName}>{ticketData.name}</div>
              <div className={styles.ticketRsvpBadge}>RSVP: {ticketData.totalRSVP} {parseInt(ticketData.totalRSVP) > 1 ? 'Orang' : 'Orang'}</div>
              
              <div className={styles.qrWrapper}>
                <QRCode value={ticketData.regNumber} size={180} level="H" />
              </div>
              
              <div className={styles.ticketId}>{ticketData.regNumber}</div>
              <div className={styles.ticketLabel}>Registration ID</div>
            </div>
            
            <button onClick={handleDownloadPdf} className={styles.downloadButton}>
              <DownloadIcon /> Download PDF
            </button>
            
            <button 
              className={styles.resetLink}
              onClick={() => {
                setTicketData(null);
                setRegNumber('');
                setErrorMsg(null);
              }}
            >
              Enter another number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
