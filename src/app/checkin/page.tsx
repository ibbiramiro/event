'use client';

import { FormEvent, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import styles from './page.module.css';

const PROGRAMS = [
  'Computer Science',
  'Visual Communication Design',
  'Information System',
  'Digital Business',
  'International Trade',
] as const;

const EVENT_OPTIONS = [
  {
    id: 'SEMINAR_TALKSHOW',
    title: 'Seminar / Talkshow',
    tag: 'Keynote Sessions',
    description: 'Keynote tech talks with global industry experts, leading AI practitioners, and Indonesian unicorn founders.',
  },
  {
    id: 'BAZAAR',
    title: 'Bazaar',
    tag: 'Culinary & Merch',
    description: 'Culinary center, limited-edition festival merchandise, and creative booths from the campus community.',
  },
  {
    id: 'BOOTH_EXHIBITION',
    title: 'Booth & Exhibition',
    tag: 'Showcase Demo',
    description: 'Showcases of AI innovation, indie games, IoT hardware, and student tech capstone projects.',
  },
  {
    id: 'NETWORKING',
    title: 'Networking',
    tag: 'Career & Connect',
    description: 'Open sessions with collaborators, developer communities, tech recruiters, and industry mentors.',
  },
  {
    id: 'FULL_EVENT',
    title: 'Join the full DIGIFEST CAMP 2026 experience',
    tag: 'VIP All-Access',
    description: 'All-pass access to talkshows, exclusive workshops, the booth expo, and evening networking sessions.',
  },
  {
    id: 'OTHER',
    title: 'Other',
    tag: 'Tell us more',
    description: 'Choose this if you have a specific interest that is not listed above.',
  },
] as const;

type ParticipantType = '' | 'BINUSIAN' | 'NON_BINUSIAN';
type EventInterest = (typeof EVENT_OPTIONS)[number]['id'];

type FormData = {
  participantType: ParticipantType;
  fullName: string;
  email: string;
  whatsapp: string;
  program: string;
  binusianId: string;
  institution: string;
  eventInterests: EventInterest[];
  otherInterest: string;
  attendeeCount: number;
  consent: boolean;
};

type Registration = {
  id: string;
  registrationNumber: string;
  participantType: Exclude<ParticipantType, ''>;
  fullName: string;
  email: string;
  whatsapp: string | null;
  program: string | null;
  binusianId: string | null;
  institution: string | null;
  eventInterests: EventInterest[];
  otherInterest: string | null;
  attendeeCount: number;
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
  eventInterests: [],
  otherInterest: '',
  attendeeCount: 1,
  consent: false,
};

function createSubmissionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();

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
      whatsapp: '',
      program: '',
      binusianId: '',
      institution: '',
    }));
    setErrorMessage('');
  };

  const toggleInterest = (interest: EventInterest) => {
    setFormData((current) => {
      const isSelected = current.eventInterests.includes(interest);
      const eventInterests = isSelected
        ? current.eventInterests.filter((item) => item !== interest)
        : [...current.eventInterests, interest];

      return {
        ...current,
        eventInterests,
        otherInterest: interest === 'OTHER' && isSelected ? '' : current.otherInterest,
      };
    });
    setErrorMessage('');
  };

  const changeAttendeeCount = (value: number) => {
    updateField('attendeeCount', Math.min(20, Math.max(1, value || 1)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (!formData.participantType) {
      setErrorMessage('Choose a participant category to continue.');
      return;
    }
    if (formData.participantType === 'BINUSIAN' && !formData.program) {
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
    if (formData.eventInterests.length === 0) {
      setErrorMessage('Choose at least one DIGIFEST CAMP 2026 activity.');
      return;
    }
    if (formData.eventInterests.includes('OTHER') && formData.otherInterest.trim().length < 2) {
      setErrorMessage('Tell us about your other event interest.');
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
            <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
          </div>
          <p className={styles.eyebrow}>Registration successful</p>
          <h1 id="registration-success-title">Your event pass is ready.</h1>
          <p className={styles.successLead}>
            Welcome, <strong>{registration.fullName}</strong>. Keep this QR code available when you arrive at the event.
          </p>

          <div className={styles.ticket}>
            <div className={styles.ticketHeader}>
              <div>
                <span className={styles.ticketBrand}>DIGIFEST CAMP 2026</span>
                <span className={styles.ticketType}>
                  {registration.participantType === 'BINUSIAN' ? 'BINUSIAN' : 'Non-BINUSIAN'} event pass
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
                <span>Participant</span>
                <strong>{registration.fullName}</strong>
              </div>
              <div>
                <span>Attendees</span>
                <strong>{registration.attendeeCount} {registration.attendeeCount === 1 ? 'person' : 'people'}</strong>
              </div>
              <div>
                <span>{registration.program ? 'Study program' : 'Institution'}</span>
                <strong>{registration.program || registration.institution}</strong>
              </div>
              <div>
                <span>Selected activities</span>
                <strong>{registration.eventInterests.length} selected</strong>
              </div>
            </div>
          </div>

          <div className={styles.successActions}>
            <button className={styles.secondaryButton} onClick={copyRegistrationNumber} type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              {copyLabel}
            </button>
            <button className={styles.primaryButton} onClick={() => window.print()} type="button">Save / print pass</button>
          </div>
          <button className={styles.textButton} onClick={startAnotherRegistration} type="button">Register another participant</button>
        </section>
      </main>
    );
  }

  if (isRegistrationDisabled) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.closedCard}>
          <div className={styles.closedIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
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
          <div className={styles.panelTopline}>
            <div className={styles.brandMark} aria-hidden="true">DFC</div>
            <span>DIGIFEST CAMP 2026</span>
          </div>
          <div className={styles.panelContent}>
            <p className={styles.eyebrow}>Official event registration</p>
            <h1>Connect, create, and shape what comes next.</h1>
            <p className={styles.eventIntro}>Complete one form to receive your personal QR event pass.</p>
            <div className={styles.eventHighlights}>
              <div><span className={styles.highlightNumber}>01</span><span><strong>Choose your profile</strong>BINUSIAN or external participant</span></div>
              <div><span className={styles.highlightNumber}>02</span><span><strong>Build your experience</strong>Select every activity you want to join</span></div>
              <div><span className={styles.highlightNumber}>03</span><span><strong>Get your pass</strong>Your QR code appears immediately</span></div>
            </div>
          </div>
          <p className={styles.panelFootnote}>One registration creates one unique DFC event pass.</p>
        </aside>

        <section className={styles.formCard} aria-labelledby="registration-title">
          <header className={styles.formHeader}>
            <div className={styles.headerMeta}><span className={styles.stepBadge}>Registration form</span><span>Secure registration</span></div>
            <h2 id="registration-title">Reserve your place.</h2>
            <p>Complete the details below. Required fields are marked with an asterisk (*).</p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            <fieldset className={styles.section}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionNumber}>1</span>
                <div><legend>Participant category *</legend><p>Choose the category that matches your current status.</p></div>
              </div>
              <div className={styles.categoryGrid}>
                <button aria-pressed={formData.participantType === 'BINUSIAN'} className={`${styles.categoryCard} ${formData.participantType === 'BINUSIAN' ? styles.categorySelected : ''}`} onClick={() => chooseParticipantType('BINUSIAN')} type="button">
                  <span className={`${styles.categoryIcon} ${styles.binusianIcon}`} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 10 9-5 9 5-9 5-9-5Z" /><path d="M7 12.5V17c3 2 7 2 10 0v-4.5M21 10v6" /></svg></span>
                  <span><strong>BINUSIAN</strong><small>Active BINUS University student</small></span>
                  <span className={styles.selectedCheck} aria-hidden="true">✓</span>
                </button>
                <button aria-pressed={formData.participantType === 'NON_BINUSIAN'} className={`${styles.categoryCard} ${formData.participantType === 'NON_BINUSIAN' ? styles.categorySelected : ''}`} onClick={() => chooseParticipantType('NON_BINUSIAN')} type="button">
                  <span className={`${styles.categoryIcon} ${styles.guestIcon}`} aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a5 5 0 0 1 10 0v2M16 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v2" /></svg></span>
                  <span><strong>Non-BINUSIAN</strong><small>School student, external student, or public</small></span>
                  <span className={styles.selectedCheck} aria-hidden="true">✓</span>
                </button>
              </div>
            </fieldset>

            {formData.participantType && (
              <>
                <fieldset className={styles.section}>
                  <div className={styles.sectionHeading}>
                    <span className={styles.sectionNumber}>2</span>
                    <div><legend>{formData.participantType === 'BINUSIAN' ? 'Academic identity' : 'Participant identity'}</legend><p>Enter accurate details for your event pass.</p></div>
                  </div>
                  <div className={styles.inputGrid}>
                    <label className={styles.field}>
                      <span>Full name *</span>
                      <input autoComplete="name" maxLength={100} onChange={(event) => updateField('fullName', event.target.value)} placeholder="Enter your full name" required type="text" value={formData.fullName} />
                      <small>Use the name shown on your official identification.</small>
                    </label>

                    {formData.participantType === 'BINUSIAN' ? (
                      <label className={styles.field}>
                        <span>BINUSIAN ID (NIM) *</span>
                        <input autoComplete="off" inputMode="numeric" maxLength={10} onChange={(event) => updateField('binusianId', event.target.value.replace(/\D/g, ''))} pattern="[0-9]{10}" placeholder="Example: 2601234567" required type="text" value={formData.binusianId} />
                        <small>Enter your 10-digit active student ID.</small>
                      </label>
                    ) : (
                      <label className={styles.field}>
                        <span>Institution / school / community *</span>
                        <input autoComplete="organization" maxLength={150} onChange={(event) => updateField('institution', event.target.value)} placeholder="Enter your institution" required type="text" value={formData.institution} />
                        <small>For example: SMAN 70, university, company, or community.</small>
                      </label>
                    )}

                    <label className={styles.field}>
                      <span>{formData.participantType === 'BINUSIAN' ? 'BINUS email' : 'Active email'} *</span>
                      <input autoComplete="email" maxLength={254} onChange={(event) => updateField('email', event.target.value)} placeholder={formData.participantType === 'BINUSIAN' ? 'name@binus.ac.id' : 'name@example.com'} required type="email" value={formData.email} />
                      <small>We will use this email for event information.</small>
                    </label>

                    {formData.participantType === 'BINUSIAN' ? (
                      <label className={styles.field}>
                        <span>Study program *</span>
                        <select onChange={(event) => updateField('program', event.target.value)} required value={formData.program}>
                          <option value="" disabled>Select your study program</option>
                          {PROGRAMS.map((program) => <option key={program} value={program}>{program}</option>)}
                        </select>
                        <small>Select your current study program at BINUS.</small>
                      </label>
                    ) : (
                      <label className={styles.field}>
                        <span>WhatsApp number *</span>
                        <input autoComplete="tel" inputMode="tel" maxLength={25} onChange={(event) => updateField('whatsapp', event.target.value)} pattern="\+?[0-9][0-9 ()-]{7,24}" placeholder="Example: +62 812 3456 789" required type="tel" value={formData.whatsapp} />
                        <small>Use an active number for urgent event updates.</small>
                      </label>
                    )}
                  </div>
                </fieldset>

                <fieldset className={styles.section}>
                  <div className={styles.sectionHeading}>
                    <span className={styles.sectionNumber}>3</span>
                    <div><legend>What would you like to join at DIGIFEST CAMP 2026? *</legend><p>You may select more than one activity.</p></div>
                  </div>
                  <div className={styles.activityGrid}>
                    {EVENT_OPTIONS.map((option) => {
                      const selected = formData.eventInterests.includes(option.id);
                      return (
                        <label className={`${styles.activityCard} ${selected ? styles.activitySelected : ''}`} key={option.id}>
                          <input checked={selected} onChange={() => toggleInterest(option.id)} type="checkbox" value={option.id} />
                          <span className={styles.checkMark} aria-hidden="true">✓</span>
                          <span className={styles.activityContent}>
                            <span className={styles.activityTitleRow}><strong>{option.title}</strong><em>{option.tag}</em></span>
                            <small>{option.description}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {formData.eventInterests.includes('OTHER') && (
                    <label className={`${styles.field} ${styles.otherField}`}>
                      <span>Tell us what you would like to join *</span>
                      <input maxLength={200} onChange={(event) => updateField('otherInterest', event.target.value)} placeholder="Describe your event interest" required type="text" value={formData.otherInterest} />
                    </label>
                  )}
                </fieldset>

                <fieldset className={styles.section}>
                  <div className={styles.sectionHeading}>
                    <span className={styles.sectionNumber}>4</span>
                    <div><legend>How many people will attend? *</legend><p>Include yourself in the total number.</p></div>
                  </div>
                  <div className={styles.attendeeCard}>
                    <div className={styles.attendeeIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a5 5 0 0 1 10 0v2M16 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v2" /></svg></div>
                    <div className={styles.attendeeCopy}><strong>Total attendees</strong><small>Maximum 20 people per registration</small></div>
                    <div className={styles.counter}>
                      <button aria-label="Decrease attendee count" disabled={formData.attendeeCount <= 1} onClick={() => changeAttendeeCount(formData.attendeeCount - 1)} type="button">−</button>
                      <input aria-label="Total attendees" inputMode="numeric" max={20} min={1} onChange={(event) => changeAttendeeCount(Number(event.target.value))} required type="number" value={formData.attendeeCount} />
                      <button aria-label="Increase attendee count" disabled={formData.attendeeCount >= 20} onClick={() => changeAttendeeCount(formData.attendeeCount + 1)} type="button">+</button>
                    </div>
                  </div>
                </fieldset>

                <div className={styles.formFooter}>
                  <label className={styles.consentRow}>
                    <input checked={formData.consent} onChange={(event) => updateField('consent', event.target.checked)} required type="checkbox" />
                    <span>I confirm that the information above is correct and agree that it may be used for event registration and communication. *</span>
                  </label>

                  {errorMessage && <div className={styles.errorAlert} role="alert"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 17h.01" /></svg>{errorMessage}</div>}

                  <button className={styles.submitButton} disabled={isSubmitting} type="submit">
                    {isSubmitting ? <><span className={styles.spinner} aria-hidden="true" />Creating your pass...</> : <>Register and get QR pass<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>}
                  </button>
                  <p className={styles.submitNote}>Free registration · Your QR event pass appears immediately</p>
                </div>
              </>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
