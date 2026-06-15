'use client';

import React, { useState, useRef } from 'react';
import styles from './login.module.css';
import { loginAction } from './actions';

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailRef = useRef<HTMLInputElement>(null);

  // Modal State
  const [modalState, setModalState] = useState<'hidden' | 'confirm' | 'loading' | 'success' | 'error'>('hidden');
  const [modalMessage, setModalMessage] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const handleResetPin = async () => {
    const email = emailRef.current?.value;
    if (!email) {
      setModalState('error');
      setModalMessage('Silakan masukkan Binus Email Anda terlebih dahulu sebelum mereset PIN.');
      return;
    }
    
    setResetEmail(email);
    setModalState('confirm');
  };

  const confirmResetPin = async () => {
    setModalState('loading');
    try {
      const newPin = Math.floor(100000 + Math.random() * 900000).toString();
      const res = await fetch('/api/profile/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, newPin })
      });
      
      if (res.ok) {
        setModalState('success');
        setModalMessage(`Berhasil! PIN baru telah dikirimkan ke email ${resetEmail}. Silakan periksa inbox Anda.`);
      } else {
        const data = await res.json();
        setModalState('error');
        setModalMessage(data.error || 'Terjadi kesalahan saat mereset PIN.');
      }
    } catch (err) {
      setModalState('error');
      setModalMessage('Terjadi kesalahan jaringan atau server saat mereset PIN.');
    }
  };

  const closeDialog = () => {
    setModalState('hidden');
  };

  const handlePinChange = (index: number, value: string) => {
    // allow alphanumeric, keep only last char
    if (value.length > 1) {
      value = value.slice(-1);
    }
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // move to next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && pin[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\s/g, '').slice(0, 6);
    if (!pastedData) return;
    
    const newPin = [...pin];
    for (let i = 0; i < pastedData.length; i++) {
      newPin[i] = pastedData[i];
    }
    setPin(newPin);
    
    const nextIndex = Math.min(pastedData.length, 5);
    if (nextIndex < 6) {
      inputRefs.current[nextIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginAction(formData);
      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      }
    } catch (err) {
      // If it redirects, it might throw an error we catch here
      console.error(err);
    }
  }

  return (
    <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label htmlFor="email" style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Binus Email</label>
        <input 
          type="email" 
          id="email"
          name="email"
          ref={emailRef}
          placeholder="your.name@binus.ac.id" 
          required
          style={{ 
            padding: '12px 16px', 
            borderRadius: '8px', 
            border: '1px solid #cbd5e1',
            outline: 'none',
            fontSize: '15px'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>PIN</label>
          <button 
            type="button" 
            onClick={handleResetPin}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#0b1930', 
              fontSize: '13px', 
              fontWeight: '600', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Forgot PIN?
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
          {pin.map((digit, index) => (
            <input
              key={index}
              type="password"
              inputMode="text"
              maxLength={1}
              value={digit}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              style={{
                width: '100%',
                aspectRatio: '1/1',
                padding: '0',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '20px',
                textAlign: 'center',
                fontWeight: '600'
              }}
              required
            />
          ))}
        </div>
        {/* Hidden input to pass the combined PIN to the server action */}
        <input type="hidden" name="pin" value={pin.join('')} />
      </div>

      <button 
        type="submit"
        disabled={isLoading}
        style={{ 
          padding: '12px 16px', 
          backgroundColor: '#0b1930', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px',
          fontWeight: '600',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          marginTop: '8px',
          opacity: isLoading ? 0.8 : 1
        }}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '14px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Professional Modal UI */}
      {modalState !== 'hidden' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px',
            width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center',
            textAlign: 'center', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            
            {modalState === 'confirm' && (
              <>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#0b1930', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#0b1930', fontSize: '20px' }}>Reset PIN Admin?</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
                    Apakah Anda yakin ingin mengirimkan PIN baru ke email <strong>{resetEmail}</strong>? PIN lama Anda akan hangus.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                  <button type="button" onClick={closeDialog} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                  <button type="button" onClick={confirmResetPin} style={{ flex: 1, padding: '12px', backgroundColor: '#0b1930', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Kirim PIN</button>
                </div>
              </>
            )}

            {modalState === 'loading' && (
              <>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#0b1930', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 1.5s linear infinite' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#0b1930', fontSize: '20px' }}>Memproses...</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Sedang mengirimkan PIN ke email Anda.</p>
                </div>
              </>
            )}

            {modalState === 'success' && (
              <>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#0b1930', fontSize: '20px' }}>Terkirim!</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>{modalMessage}</p>
                </div>
                <button type="button" onClick={closeDialog} style={{ width: '100%', padding: '12px', backgroundColor: '#0b1930', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>Tutup</button>
              </>
            )}

            {modalState === 'error' && (
              <>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#0b1930', fontSize: '20px' }}>Gagal</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>{modalMessage}</p>
                </div>
                <button type="button" onClick={closeDialog} style={{ width: '100%', padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>Tutup</button>
              </>
            )}

          </div>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}
