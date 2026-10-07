'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  RiLogoutBoxRLine,
  RiPaletteLine,
  RiSettings3Line,
  RiTeamLine,
  type RemixiconComponentType,
} from '@remixicon/react';
import * as Avatar from '@/components/ui/avatar';
import * as CompactButton from '@/components/ui/compact-button';
import * as Tooltip from '@/components/ui/tooltip';
import { authApi } from '@/lib/api';
import { useMe } from '@/lib/api/hooks';
import { LOGIN_PATH } from '@/lib/auth/routes';
import { initials } from '@/lib/format';
import { cn } from '@/utils/cn';

// next-themes only knows the theme on the client; render the switch there.
const ThemeSwitch = dynamic(() => import('./theme-switch'), { ssr: false });

const NAVIGATION: {
  href: string;
  label: string;
  icon: RemixiconComponentType;
}[] = [
  { href: '/team', label: 'Team', icon: RiTeamLine },
  { href: '/settings', label: 'Settings', icon: RiSettings3Line },
  { href: '/design-system', label: 'Design system', icon: RiPaletteLine },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  async function signOut() {
    try {
      await authApi.logout();
    } finally {
      queryClient.clear();
      router.replace(LOGIN_PATH);
      router.refresh();
    }
  }

  return (
    <div className='flex min-h-screen'>
      <aside className='flex w-64 shrink-0 flex-col border-r border-stroke-soft-200 bg-bg-weak-50 max-md:hidden'>
        <div className='flex h-16 items-center px-5 text-label-md text-text-strong-950'>
          Starter
        </div>

        <nav className='flex flex-1 flex-col gap-1 px-3'>
          {NAVIGATION.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-label-sm transition',
                  active
                    ? 'bg-bg-white-0 text-text-strong-950 shadow-regular-xs'
                    : 'text-text-sub-600 hover:bg-bg-white-0 hover:text-text-strong-950',
                )}
              >
                <Icon
                  className={cn(
                    'size-5',
                    active ? 'text-primary-base' : 'text-text-soft-400',
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className='flex items-center gap-3 border-t border-stroke-soft-200 p-4'>
          <Avatar.Root size='40' color='blue'>
            {me ? initials(me.name, me.email) : ''}
          </Avatar.Root>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-label-sm text-text-strong-950'>
              {me?.name ?? me?.email.split('@')[0] ?? ' '}
            </div>
            <div className='truncate text-paragraph-xs text-text-sub-600'>
              {me?.email ?? ' '}
            </div>
          </div>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <CompactButton.Root
                variant='ghost'
                onClick={() => void signOut()}
                aria-label='Sign out'
              >
                <CompactButton.Icon as={RiLogoutBoxRLine} />
              </CompactButton.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>Sign out</Tooltip.Content>
          </Tooltip.Root>
        </div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='flex h-16 items-center justify-between gap-4 border-b border-stroke-soft-200 px-6'>
          <nav className='flex gap-4 md:hidden'>
            {NAVIGATION.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className='text-label-sm text-text-sub-600'
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className='ml-auto'>
            <ThemeSwitch />
          </div>
        </header>

        <main className='mx-auto w-full max-w-5xl flex-1 px-6 py-8'>
          {children}
        </main>
      </div>
    </div>
  );
}