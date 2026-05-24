'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page where the login forms are now embedded
    router.replace('/');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0b0b0a',
      color: '#ffffff',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <p>Redirecting to sign in...</p>
    </div>
  );
}
