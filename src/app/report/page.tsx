'use client';

import React, { useState, useEffect } from 'react';
import styles from './report.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopNav from '@/components/TopNav/TopNav';
import { Guest } from '@/lib/data';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function ReportPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [anomalyFilter, setAnomalyFilter] = useState<'all' | 'registered' | 'walkin'>('all');
  const [flowInterval, setFlowInterval] = useState<number>(5);
  const [eventName, setEventName] = useState('Graduation Ceremony 2024');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
    const stored = localStorage.getItem('unievent_guests');
    if (stored) {
      setGuests(JSON.parse(stored));
    }

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const json = await res.json();
          const data = json.data || [];
          const eventRow = data.find((r: any) => r.key === 'EventName');
          if (eventRow && eventRow.value) {
            setEventName(eventRow.value);
          }
        }
      } catch (e) {
        console.error('Error fetching config:', e);
      }
    };
    fetchConfig();

    const handleStorageChange = () => {
      const updated = localStorage.getItem('unievent_guests');
      if (updated) {
        setGuests(JSON.parse(updated));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSaveEventName = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ EventName: eventName })
      });
    } catch (e) {
      console.error('Error saving event name:', e);
    }
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('report-content');
    if (!element) {
      alert("Element report-content tidak ditemukan.");
      return;
    }
    
    setIsDownloading(true);
    try {
      // Dynamic imports to prevent Next.js SSR issues
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      
      const jsPDFModule = await import('jspdf');
      const JsPDFClass = jsPDFModule.jsPDF || (jsPDFModule as any).default || jsPDFModule;
      
      // Small delay for UI updates
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc' // match background
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdf = new JsPDFClass('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const width = pdfWidth;
      const height = (imgHeight * pdfWidth) / imgWidth;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
      
      let heightLeft = height - pdfHeight;
      let position = 0;
      
      while (heightLeft > 0) {
        position = heightLeft - height; // shift image up
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, width, height);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`${eventName || 'Analytics_Report'}.pdf`);
    } catch (err: any) {
      console.error('Error generating PDF', err);
      alert(`Gagal men-download PDF. Error: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Helpers
  const isCheckedIn = (g: Guest) => g.method === 'Self Check-in' || g.method === 'Manual Input' || (g.time && g.time !== '');

  // 1. Metrics Calculation
  let totalExpected = 0;
  let totalActual = 0;
  let walkIns = 0;
  
  let totalRegistered = 0;
  let registeredNoShows = 0;

  guests.forEach(g => {
    const rsvp = g.totalRSVP || 0;
    const hadir = g.totalHadir || 0;
    
    totalExpected += rsvp;
    totalActual += hadir;
    
    if (g.status && g.status.trim() === 'Walk-In') {
      walkIns += hadir;
    }

    const reg = g.registrationNumber?.trim() || '';
    if (reg !== '' && reg !== '-') {
      totalRegistered++;
      if (!isCheckedIn(g)) {
        registeredNoShows++;
      }
    }
  });

  let noShowRatio = 0;
  if (totalRegistered > 0) {
    noShowRatio = (registeredNoShows / totalRegistered) * 100;
  }
  const noShowRate = noShowRatio.toFixed(1);

  const expectedWidth = '100%';
  const rsvpActual = totalActual - walkIns;
  const actualWidth = totalExpected > 0 ? `${Math.min(100, (rsvpActual / totalExpected) * 100)}%` : '0%';

  // 3. Check-in Flow (5 minute intervals)
  const flowMap = new Map<string, number>();
  guests.filter(isCheckedIn).forEach(g => {
    if (!g.time || g.time === 'Checked In') return; // Skip if no specific time
    // Try to parse time "10:45:22 AM" or similar
    try {
      let hours = 0;
      let mins = 0;
      let valid = false;

      // Handle ISO strings from Google Sheets (e.g., 1899-12-30T08:50:44.000Z)
      if (g.time.includes('T')) {
        const d = new Date(g.time);
        if (!isNaN(d.getTime())) {
          hours = d.getHours();
          mins = d.getMinutes();
          valid = true;
        }
      }

      if (!valid) {
        const timeStr = g.time.toLowerCase();
        let match = timeStr.match(/(\d+):(\d+)/);
        if (match) {
          hours = parseInt(match[1]);
          mins = parseInt(match[2]);
          if (timeStr.includes('pm') && hours < 12) hours += 12;
          if (timeStr.includes('am') && hours === 12) hours = 0;
          valid = true;
        }
      }

      if (valid) {
        // Round down to nearest interval
        let roundedMins = Math.floor(mins / flowInterval) * flowInterval;
        let finalHours = hours;
        
        // Handle edge case if interval somehow pushes it (e.g. if we ever use interval 60)
        if (roundedMins >= 60) {
          finalHours += Math.floor(roundedMins / 60);
          roundedMins = roundedMins % 60;
        }
        
        const key = `${finalHours.toString().padStart(2, '0')}:${roundedMins.toString().padStart(2, '0')}`;
        flowMap.set(key, (flowMap.get(key) || 0) + 1);
      }
    } catch(e) {}
  });
  
  const flowData = Array.from(flowMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, count]) => ({ time, checkins: count }));

  // 4. Demographics by Major
  const majorMapping: Record<string, string> = {
    'Information Systems': 'IS',
    'Digital Business': 'DB',
    'International Trade': 'InT',
    'Visual Communication Design': 'DKV',
    'Computer Science': 'CS'
  };
  
  const demoMap = new Map<string, number>();
  guests.filter(isCheckedIn).forEach(g => {
    const abbr = majorMapping[g.major] || g.major || 'Unknown';
    demoMap.set(abbr, (demoMap.get(abbr) || 0) + 1);
  });
  
  const demoData = Array.from(demoMap.entries()).map(([name, value]) => ({ name, value }));
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#facc15', '#10b981'];

  // 5. Watchlist Anomalies
  const anomalies = guests.filter(g => {
    const rsvp = g.totalRSVP || 0;
    const hadir = g.totalHadir || 0;
    
    const reg = g.registrationNumber?.trim() || '';
    const isWalkIn = reg === '' || reg === '-';

    if (anomalyFilter === 'registered' && isWalkIn) return false;
    if (anomalyFilter === 'walkin' && !isWalkIn) return false;

    // Only flag if they actually checked in, otherwise it's just a no-show, not an anomaly
    if (!isCheckedIn(g)) return false;
    
    return Math.abs(rsvp - hadir) >= 2;
  });

  return (
    <div className={`${styles.layout} ${isSidebarOpen ? '' : styles.sidebarClosed}`}>
      <div className={`${styles.sidebarWrapper} ${isSidebarOpen ? '' : styles.closed} ${styles.printHide}`}>
        <Sidebar />
      </div>
      {isSidebarOpen && (
        <div 
          className={styles.mobileOverlay} 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className={styles.mainContent}>
        <div className={styles.printHide}>
          <TopNav onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        </div>
        
        <main className={styles.contentWrapper} id="report-content" style={{ padding: '32px' }}>
          <div className={styles.pageHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h1 className={styles.pageTitle}>Analytics & Report</h1>
              <input 
                type="text" 
                className={styles.eventNameInput}
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                onBlur={handleSaveEventName}
                placeholder="Enter event name..."
                title="Click to edit event name"
              />
            </div>
            <button 
              className={`${styles.downloadPdfBtn} ${styles.printHide}`}
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              data-html2canvas-ignore="true"
              style={{ opacity: isDownloading ? 0.7 : 1, cursor: isDownloading ? 'wait' : 'pointer' }}
            >
              {isDownloading ? (
                <>
                  <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }}>
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>

          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>Total Expected Heads</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
              </div>
              <span className={styles.metricValue}>{totalExpected.toLocaleString()}</span>
              <span className={styles.metricSub}>RSVPs</span>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>Total Actual Heads</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <polyline points="23 11 16 18 13 15"></polyline>
                </svg>
              </div>
              <span className={styles.metricValue}>{totalActual.toLocaleString()}</span>
              <span className={styles.metricSub}>Checked In</span>
            </div>

            <div className={`${styles.metricCard} ${styles.walkinAccent}`}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle} style={{ color: '#d97706' }}>Walk-In Heads</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <span className={styles.metricValue}>{walkIns.toLocaleString()}</span>
              <span className={styles.metricSub}>Unplanned arrivals</span>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>No-show Rate</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <span className={styles.metricValue}>{noShowRate}%</span>
              <span className={styles.metricSub}>Below 10% target</span>
            </div>
          </div>

          <div className={styles.chartCard}>
            <h2 className={styles.cardTitle}>Headcount Discrepancy</h2>
            
            <div className={styles.discrepancyRow}>
              <div className={styles.discrepancyLabel}>
                <span>RSVP (Expected)</span>
                <span>{totalExpected}</span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFillDark} style={{ width: expectedWidth }}></div>
              </div>
            </div>

            <div className={styles.discrepancyRow}>
              <div className={styles.discrepancyLabel}>
                <span>RSVP (Actual)</span>
                <span>{rsvpActual}</span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFillLight} style={{ width: actualWidth }}></div>
              </div>
            </div>

            <div className={styles.noteBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Note: Discrepancy includes {walkIns} walk-in(s) minus no-shows.</span>
            </div>
          </div>

          <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className={styles.cardTitle} style={{ margin: 0 }}>Check-in Flow</h2>
                <select 
                  value={flowInterval}
                  onChange={(e) => setFlowInterval(Number(e.target.value))}
                  style={{ 
                    padding: '4px 8px', 
                    borderRadius: '6px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={5}>5 Min</option>
                  <option value={10}>10 Min</option>
                  <option value={15}>15 Min</option>
                  <option value={30}>30 Min</option>
                </select>
              </div>
              <div style={{ width: '100%', height: 250 }}>
                {flowData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={flowData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                      />
                      <Line isAnimationActive={false} type="monotone" dataKey="checkins" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    Not enough time data available
                  </div>
                )}
              </div>
            </div>

            <div className={styles.chartCard}>
              <h2 className={styles.cardTitle}>Demographics by Major</h2>
              <div style={{ width: '100%', height: 250 }}>
                {demoData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={demoData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {demoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    No demographic data
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <div className={styles.tableHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className={styles.tableTitle}>Watchlist (Anomalies)</h2>
              <select 
                value={anomalyFilter}
                onChange={(e) => setAnomalyFilter(e.target.value as 'all' | 'registered' | 'walkin')}
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Guests</option>
                <option value="registered">Registered</option>
                <option value="walkin">Walk-in</option>
              </select>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Registration Number</th>
                  <th>Registrant Name</th>
                  <th>Expected Guests</th>
                  <th>Arrived Guests</th>
                  <th>Alert Status</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.length > 0 ? anomalies.map(g => {
                  const rsvp = g.totalRSVP ?? 1;
                  const hadir = g.totalHadir ?? 1;
                  const diff = hadir - rsvp;
                  const isExtra = diff > 0;
                  
                  return (
                    <tr key={g.id}>
                      <td>{g.registrationNumber || '-'}</td>
                      <td>{g.name}</td>
                      <td>{rsvp}</td>
                      <td>{hadir}</td>
                      <td>
                        <span className={styles.alertBadge}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                          {isExtra ? `+${diff} Guests` : `${diff} Guests`}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No anomalies detected
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </main>
      </div>
    </div>
  );
}
