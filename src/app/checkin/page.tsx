'use client';

import { FormEvent, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import styles from './page.module.css';

const PROGRAMS = [
  { name: 'Computer Science', code: 'CS', description: 'Technology, software, and intelligent systems' },
  { name: 'Visual Communication Design', code: 'VCD', description: 'Visual stories, branding, and creative media' },
  { name: 'Information System', code: 'IS', description: 'Business processes and digital solutions' },
  { name: 'Digital Business', code: 'DB', description: 'Innovation, entrepreneurship, and e-commerce' },
  { name: 'International Trade', code: 'IT', description: 'Global markets and international commerce' },
] as const;

type ParticipantType = '' | 'BINUSIAN' | 'NON_BINUSIAN';

type FormData = {
  participantType: ParticipantType;
  fullName: string;
  email: string;
  whatsapp: string;
  program: string;
  binusianId: string;
  institution: string;
  consent: boolean;
};

type Registration = {
  id: string;
  registrationNumber: string;
  participantType: Exclude<ParticipantType, ''>;
  fullName: string;
  email: string;
  whatsapp: string;
  program: string;
  binusianId: string | null;
  institution: string | null;
  createdAt: string;
};

const EMPTY_FORM: FormData = {
  participantType: '',
  fullName: '',
  email: '',
  whatsapp: '',
  program: '',
  binusianId: '',
  institution: '',
  consent: false,
};

function createSubmissionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export default function EventRegistrationPage() {
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [submissionId, setSubmissionId] = useState(createSubmissionId);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistrationDisabled, setIsRegistrationDisabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy number');

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/settings', { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        const settings = Array.isArray(payload.data) ? payload.data : [];
        const setting = settings.find((item: { key?: string }) => item.key === 'CheckinDisabled');
        setIsRegistrationDisabled(setting?.value === 'Y');
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Unable to read registration availability:', error);
        }
      });

    return () => controller.abort();
  }, []);

  const updateField = <Field extends keyof FormData>(field: Field, value: FormData[Field]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrorMessage('');
  };

  const chooseParticipantType = (participantType: Exclude<ParticipantType, ''>) => {
    setFormData((current) => ({
      ...current,
      participantType,
      email: '',
      binusianId: '',
      institution: '',
    }));
    setErrorMessage('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (!formData.participantType) {
      setErrorMessage('Choose a participant category to continue.');
      return;
    }
    if (!formData.program) {
      setErrorMessage('Choose your study program.');
      return;
    }
    if (formData.participantType === 'BINUSIAN' && !formData.email.toLowerCase().endsWith('@binus.ac.id')) {
      setErrorMessage('Use your official @binus.ac.id email address.');
      return;
    }
    if (formData.participantType === 'BINUSIAN' && !/^\d{10}$/.test(formData.binusianId)) {
      setErrorMessage('BINUSIAN ID must contain exactly 10 digits.');
      return;
    }
    if (formData.participantType === 'NON_BINUSIAN' && formData.institution.trim().length < 2) {
      setErrorMessage('Enter your institution, school, or community.');
      return;
    }
    if (!formData.consent) {
      setErrorMessage('You must agree to the registration terms.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, idempotencyKey: submissionId }),
      });
      const payload = (await response.json()) as { registration?: Registration; error?: string };

      if (!response.ok || !payload.registration) {
        throw new Error(payload.error || 'Registration could not be completed.');
      }

      setRegistration(payload.registration);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration could not be completed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyRegistrationNumber = async () => {
    if (!registration) return;

    try {
      await navigator.clipboard.writeText(registration.registrationNumber);
      setCopyLabel('Copied');
      window.setTimeout(() => setCopyLabel('Copy number'), 1800);
    } catch {
      setCopyLabel(registration.registrationNumber);
    }
  };

  const startAnotherRegistration = () => {
    setFormData(EMPTY_FORM);
    setSubmissionId(createSubmissionId());
    setRegistration(null);
    setErrorMessage('');
    setCopyLabel('Copy number');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (registration) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.successCard} aria-labelledby="registration-success-title">
          <div className={styles.successMark} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m5 12 4 4L19 6" />
            </svg>
          </div>
          <p className={styles.eyebrow}>Registration successful</p>
          <h1 id="registration-success-title">Your event pass is ready.</h1>
          <p className={styles.successLead}>
            Welcome, <strong>{registration.fullName}</strong>. Keep this QR code available when you arrive at the event.
          </p>

          <div className={styles.ticket}>
            <div className={styles.ticketHeader}>
              <div>
                <span className={styles.ticketBrand}>DFC EVENT</span>
                <span className={styles.ticketType}>
                  {registration.participantType === 'BINUSIAN' ? 'BINUSIAN' : 'Non-BINUSIAN'} pass
                </span>
              </div>
              <span className={styles.ticketStatus}>Confirmed</span>
            </div>

            <div className={styles.qrFrame}>
              <QRCode
                aria-label={`QR code for registration ${registration.registrationNumber}`}
                className={styles.qrCode}
                bgColor="#ffffff"
                fgColor="#111a3a"
                level="M"
                role="img"
                size={256}
                value={registration.registrationNumber}
              />
            </div>

            <span className={styles.registrationLabel}>Registration number</span>
            <strong className={styles.registrationNumber}>{registration.registrationNumber}</strong>
            <p className={styles.scanHint}>Present this code to the event team for scanning.</p>

            <div className={styles.ticketDetails}>
              <div>
                <span>Study program</span>
                <strong>{registration.program}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{registration.email}</strong>
              </div>
            </div>
          </div>

          <div className={styles.successActions}>
            <button className={styles.secondaryButton} onClick={copyRegistrationNumber} type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copyLabel}
            </button>
            <button className={styles.primaryButton} onClick={() => window.print()} type="button">
              Save / print pass
            </button>
          </div>
          <button className={styles.textButton} onClick={startAnotherRegistration} type="button">
            Register another participant
          </button>
        </section>
      </main>
    );
  }

  if (isRegistrationDisabled) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.closedCard}>
          <div className={styles.closedIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
          <p className={styles.eyebrow}>Registration unavailable</p>
          <h1>Event registration is currently closed.</h1>
          <p>Please contact the event team or check this page again later.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageShell}>
      <div className={styles.pageGrid}>
        <aside className={styles.eventPanel}>
          <div className={styles.brandMark} aria-hidden="true">DFC</div>
          <p className={styles.eyebrow}>Event registration</p>
          <h1>Join the next generation of digital creators.</h1>
          <p className={styles.eventIntro}>
            Register your attendance and receive a personal QR event pass in less than two minutes.
          </p>
          <div className={styles.eventHighlights}>
            <div>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" /></svg>
              <span><strong>Fast registration</strong>Your QR pass appears instantly</span>
            </div>
            <div>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
              <span><strong>Secure details</strong>Stored safely in Supabase</span>
            </div>
          </div>
          <p className={styles.panelFootnote}>One registration provides one unique DFC event pass.</p>
        </aside>

        <section className={styles.formCard} aria-labelledby="registration-title">
          <header className={styles.formHeader}>
            <span className={styles.stepBadge}>Registration form</span>
            <h2 id="registration-title">Tell us about yourself.</h2>
            <p>All fields marked with an asterisk (*) are required.</p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            <fieldset className={styles.section}>
              <legend>Participant category *</legend>
              <p className={styles.sectionHelp}>Choose the category that matches your current status.</p>
              <div className={styles.categoryGrid}>
                <button
                  aria-pressed={formData.participantType === 'BINUSIAN'}
                  className={`${styles.categoryCard} ${formData.participantType === 'BINUSIAN' ? styles.categorySelected : ''}`}
                  onClick={() => chooseParticipantType('BINUSIAN')}
                  type="button"
                >
                  <span className={`${styles.categoryIcon} ${styles.binusianIcon}`} aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="m3 10 9-5 9 5-9 5-9-5Z" /><path d="M7 12.5V17c3 2 7 2 10 0v-4.5M21 10v6" /></svg>
                  </span>
                  <span><strong>BINUSIAN</strong><small>Active BINUS University student</small></span>
                  <span className={styles.selectedCheck} aria-hidden="true">✓</span>
                </button>

                <button
                  aria-pressed={formData.participantType === 'NON_BINUSIAN'}
                  className={`${styles.categoryCard} ${formData.participantType === 'NON_BINUSIAN' ? styles.categorySelected : ''}`}
                  onClick={() => chooseParticipantType('NON_BINUSIAN')}
                  type="button"
                >
                  <span className={`${styles.categoryIcon} ${styles.guestIcon}`} aria-hidden="true">
                    <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a5 5 0 0 1 10 0v2M16 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v2" /></svg>
                  </span>
                  <span><strong>Non-BINUSIAN</strong><small>School student, external student, or public</small></span>
                  <span className={styles.selectedCheck} aria-hidden="true">✓</span>
                </button>
              </div>
            </fieldset>

            {formData.participantType && (
              <>
                <fieldset className={styles.section}>
                  <legend>{formData.participantType === 'BINUSIAN' ? 'Academic identity' : 'Participant identity'}</legend>
                  <div className={styles.inputGrid}>
                    <label className={styles.field}>
                      <span>Full name *</span>
                      <input
                        autoComplete="name"
                        maxLength={100}
                        onChange={(event) => updateField('fullName', event.target.value)}
                        placeholder="Enter your full name"
                        required
                        type="text"
                        value={formData.fullName}
                      />
                      <small>Use the name shown on your official identification.</small>
                    </label>

                    {formData.participantType === 'BINUSIAN' ? (
                      <label className={styles.field}>
                        <span>BINUSIAN ID (NIM) *</span>
                        <input
                          autoComplete="off"
                          inputMode="numeric"
                          maxLength={10}
                          onChange={(event) => updateField('binusianId', event.target.value.replace(/\D/g, ''))}
                          pattern="[0-9]{10}"
                          placeholder="Example: 2601234567"
                          required
                          type="text"
                          value={formData.binusianId}
                        />
                        <small>Enter your 10-digit active student ID.</small>
                      </label>
                    ) : (
                      <label className={styles.field}>
                        <span>Institution / school / community *</span>
                        <input
                          autoComplete="organization"
                          maxLength={150}
                          onChange={(event) => updateField('institution', event.target.value)}
                          placeholder="Enter your institution"
                          required
                          type="text"
                          value={formData.institution}
                        />
                        <small>For example: SMAN 70, university, company, or community.</small>
                      </label>
                    )}

                    <label className={styles.field}>
                      <span>{formData.participantType === 'BINUSIAN' ? 'BINUS email' : 'Active email'} *</span>
                      <input
                        autoComplete="email"
                        maxLength={254}
                        onChange={(event) => updateField('email', event.target.value)}
                        placeholder={formData.participantType === 'BINUSIAN' ? 'name@binus.ac.id' : 'name@example.com'}
                        required
                        type="email"
                        value={formData.email}
                      />
                      <small>We will use this email for event information.</small>
                    </label>

                    <label className={styles.field}>
                      <span>WhatsApp number *</span>
                      <input
                        autoComplete="tel"
                        inputMode="tel"
                        maxLength={25}
                        onChange={(event) => updateField('whatsapp', event.target.value)}
                        pattern="\+?[0-9][0-9 ()-]{7,24}"
                        placeholder="Example: +62 812 3456 789"
                        required
                        type="tel"
                        value={formData.whatsapp}
                      />
                      <small>Use an active number for urgent event updates.</small>
                    </label>
                  </div>
                </fieldset>

                <fieldset className={styles.section}>
                  <legend>Study program *</legend>
                  <p className={styles.sectionHelp}>Choose the program that best matches your interest.</p>
                  <div className={styles.programGrid}>
                    {PROGRAMS.map((program) => (
                      <label
                        className={`${styles.programCard} ${formData.program === program.name ? styles.programSelected : ''}`}
                        key={program.name}
                      >
                        <input
                          checked={formData.program === program.name}
                          name="program"
                          onChange={() => updateField('program', program.name)}
                          required
                          type="radio"
                          value={program.name}
                        />
                        <span className={styles.programCode}>{program.code}</span>
                        <span className={styles.programText}>
                          <strong>{program.name}</strong>
                          <small>{program.description}</small>
                        </span>
                        <span className={styles.radioMark} aria-hidden="true" />
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className={styles.consentRow}>
                  <input
                    checked={formData.consent}
                    onChange={(event) => updateField('consent', event.target.checked)}
                    required
                    type="checkbox"
                  />
                  <span>
                    I confirm that the information above is correct and agree that it may be used for event registration and communication. *
                  </span>
                </label>

                {errorMessage && (
                  <div className={styles.errorAlert} role="alert">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 17h.01" /></svg>
                    {errorMessage}
                  </div>
                )}

                <button className={styles.submitButton} disabled={isSubmitting} type="submit">
                  {isSubmitting ? (
                    <><span className={styles.spinner} aria-hidden="true" />Creating your pass...</>
                  ) : (
                    <>Register and get QR pass<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>
                  )}
                </button>
                <p className={styles.submitNote}>Your unique QR pass will appear immediately after registration.</p>
              </>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
