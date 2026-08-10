import React from 'react';
import RegistrationComponent from './RegistrationComponent';
import styles from './register.module.css';

export const metadata = {
  title: 'Event Registration',
  description: 'Register for our upcoming event to get your digital pass.',
};

export default function RegisterPage() {
  return (
    <main className={styles.container}>
      <RegistrationComponent />
    </main>
  );
}
