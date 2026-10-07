'use client';

import * as React from 'react';
import * as Alert from '@/components/ui/alert';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { errorMessage } from '@/lib/api/error-message';
import {
  useMe,
  useRevokeSession,
  useSessions,
  useUpdateMe,
} from '@/lib/api/hooks';
import { describeAgent, formatDateTime } from '@/lib/format';

function ProfileSection() {
  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const [name, setName] = React.useState('');

  React.useEffect(() => {
    setName(me?.name ?? '');
  }, [me?.name]);

  const unchanged = name.trim() === (me?.name ?? '');

  return (
    <section className='flex flex-col gap-4'>
      <h2 className='text-label-md text-text-strong-950'>Profile</h2>

      <form
        className='flex max-w-md flex-col gap-4'
        onSubmit={(event) => {
          event.preventDefault();
          updateMe.mutate({ name: name.trim() });
        }}
      >
        <div className='flex flex-col gap-1.5'>
          <Label.Root htmlFor='profile-email'>Email</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input id='profile-email' value={me?.email ?? ''} disabled />
            </Input.Wrapper>
          </Input.Root>
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label.Root htmlFor='profile-name'>Name</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id='profile-name'
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>

        {updateMe.error && (
          <Alert.Root variant='lighter' status='error' size='small' role='alert'>
            {errorMessage(updateMe.error)}
          </Alert.Root>
        )}

        <div>
          <Button.Root
            type='submit'
            size='small'
            disabled={unchanged || updateMe.isPending}
          >
            {updateMe.isPending ? 'Saving…' : 'Save changes'}
          </Button.Root>
        </div>
      </form>
    </section>
  );
}

function SessionsSection() {
  const { data: sessions, isLoading, error } = useSessions();
  const revoke = useRevokeSession();

  return (
    <section className='flex flex-col gap-4'>
      <div>
        <h2 className='text-label-md text-text-strong-950'>Sessions</h2>
        <p className='mt-1 text-paragraph-sm text-text-sub-600'>
          Devices signed in to your account. Sign out any you do not recognize.
        </p>
      </div>

      {(error || revoke.error) && (
        <Alert.Root variant='lighter' status='error' size='small' role='alert'>
          {errorMessage(error ?? revoke.error)}
        </Alert.Root>
      )}

      <ul className='divide-y divide-stroke-soft-200 rounded-xl ring-1 ring-inset ring-stroke-soft-200'>
        {isLoading && (
          <li className='p-4 text-paragraph-sm text-text-sub-600'>Loading…</li>
        )}

        {sessions?.map((session) => (
          <li
            key={session.id}
            className='flex flex-wrap items-center justify-between gap-3 p-4'
          >
            <div className='min-w-0'>
              <div className='flex items-center gap-2 text-label-sm text-text-strong-950'>
                {describeAgent(session.agent)}
                {session.current && (
                  <Badge.Root variant='lighter' color='green' size='small'>
                    This device
                  </Badge.Root>
                )}
              </div>
              <div className='mt-0.5 text-paragraph-xs text-text-sub-600'>
                {session.ipAddress} · last active{' '}
                {formatDateTime(session.lastActivity)}
              </div>
            </div>

            {!session.current && (
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(session.id)}
              >
                Sign out
              </Button.Root>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title='Settings'
        description='Your profile and the devices signed in to your account.'
      />
      <ProfileSection />
      <SessionsSection />
    </div>
  );
}