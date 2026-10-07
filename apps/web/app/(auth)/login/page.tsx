'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { RiShieldUserLine } from '@remixicon/react';
import * as Alert from '@/components/ui/alert';
import { authApi } from '@/lib/api';
import { errorMessage } from '@/lib/api/error-message';
import { HOME_PATH } from '@/lib/auth/routes';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  async function handleCredential(idToken: string | undefined) {
    if (!idToken) {
      setError('Google did not return a credential. Please try again.');
      return;
    }

    try {
      setError(null);
      await authApi.loginWithGoogle(idToken);
      router.replace(HOME_PATH);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <main className='flex min-h-screen items-center justify-center bg-bg-weak-50 px-5'>
      <div className='w-full max-w-sm rounded-20 bg-bg-white-0 p-8 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200'>
        <div className='flex size-12 items-center justify-center rounded-full bg-primary-alpha-10 text-primary-base'>
          <RiShieldUserLine className='size-6' />
        </div>

        <h1 className='mt-5 text-title-h5 text-text-strong-950'>Sign in</h1>
        <p className='mt-1 text-paragraph-sm text-text-sub-600'>
          Access is limited to invited team members. Use your work Google
          account.
        </p>

        {error && (
          <Alert.Root
            variant='lighter'
            status='error'
            size='small'
            className='mt-5'
            role='alert'
          >
            {error}
          </Alert.Root>
        )}

        <div className='mt-6 flex justify-center'>
          <GoogleLogin
            onSuccess={(response) => void handleCredential(response.credential)}
            onError={() => setError('Google sign-in was cancelled or failed.')}
          />
        </div>
      </div>
    </main>
  );
}