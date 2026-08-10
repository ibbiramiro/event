'use client';

import React, { useState } from 'react';
import RegistrationForm from './RegistrationForm';
import SuccessView from './SuccessView';

export default function RegistrationComponent() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);

  const handleSuccess = (data: any) => {
    setRegistrationData(data);
    setIsSuccess(true);
  };

  return (
    <>
      {isSuccess && registrationData ? (
        <SuccessView data={registrationData} />
      ) : (
        <RegistrationForm onSuccess={handleSuccess} />
      )}
    </>
  );
}
