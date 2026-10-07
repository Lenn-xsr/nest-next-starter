'use client';

import * as React from 'react';
import {
  RiAddLine,
  RiArrowRightSLine,
  RiSearchLine,
} from '@remixicon/react';
import * as Alert from '@/components/ui/alert';
import * as Avatar from '@/components/ui/avatar';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as StatusBadge from '@/components/ui/status-badge';
import * as Switch from '@/components/ui/switch';
import { PageHeader } from '@/components/page-header';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className='flex flex-col gap-4'>
      <h2 className='text-label-md text-text-strong-950'>{title}</h2>
      <div className='flex flex-wrap items-center gap-3 rounded-xl p-5 ring-1 ring-inset ring-stroke-soft-200'>
        {children}
      </div>
    </section>
  );
}

const SURFACES = [
  ['bg-bg-white-0', 'white-0'],
  ['bg-bg-weak-50', 'weak-50'],
  ['bg-bg-soft-200', 'soft-200'],
  ['bg-bg-sub-300', 'sub-300'],
  ['bg-bg-surface-800', 'surface-800'],
  ['bg-bg-strong-950', 'strong-950'],
  ['bg-primary-base', 'primary'],
  ['bg-success-base', 'success'],
  ['bg-warning-base', 'warning'],
  ['bg-error-base', 'error'],
] as const;

export default function DesignSystemPage() {
  const [enabled, setEnabled] = React.useState(true);

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        title='Design system'
        description='Tokens and base components this app is built from. Everything lives in components/ui and tailwind.config.ts.'
      />

      <Section title='Color tokens'>
        {SURFACES.map(([className, label]) => (
          <div key={label} className='flex flex-col items-center gap-1.5'>
            <div
              className={`size-12 rounded-lg ring-1 ring-inset ring-stroke-soft-200 ${className}`}
            />
            <span className='text-paragraph-xs text-text-sub-600'>{label}</span>
          </div>
        ))}
      </Section>

      <Section title='Typography'>
        <div className='flex flex-col gap-2'>
          <span className='text-title-h4'>Title H4</span>
          <span className='text-title-h6'>Title H6</span>
          <span className='text-label-md'>Label medium</span>
          <span className='text-paragraph-sm text-text-sub-600'>
            Paragraph small — the default body size.
          </span>
        </div>
      </Section>

      <Section title='Buttons'>
        <Button.Root>
          <Button.Icon as={RiAddLine} />
          Primary
        </Button.Root>
        <Button.Root variant='neutral'>Neutral</Button.Root>
        <Button.Root variant='neutral' mode='stroke'>
          Stroke
          <Button.Icon as={RiArrowRightSLine} />
        </Button.Root>
        <Button.Root variant='primary' mode='lighter'>
          Lighter
        </Button.Root>
        <Button.Root variant='neutral' mode='ghost'>
          Ghost
        </Button.Root>
        <Button.Root variant='error'>Destructive</Button.Root>
        <Button.Root size='small' disabled>
          Disabled
        </Button.Root>
      </Section>

      <Section title='Inputs'>
        <div className='w-64'>
          <Input.Root>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input placeholder='Search…' />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='w-64'>
          <Input.Root hasError>
            <Input.Wrapper>
              <Input.Input defaultValue='not-an-email' />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <label className='flex items-center gap-2 text-label-sm'>
          <Switch.Root checked={enabled} onCheckedChange={setEnabled} />
          {enabled ? 'Enabled' : 'Disabled'}
        </label>
      </Section>

      <Section title='Badges'>
        <Badge.Root color='blue'>Filled</Badge.Root>
        <Badge.Root variant='light' color='purple'>
          Light
        </Badge.Root>
        <Badge.Root variant='lighter' color='green'>
          Lighter
        </Badge.Root>
        <Badge.Root variant='stroke' color='orange'>
          Stroke
        </Badge.Root>
        <StatusBadge.Root status='completed'>
          <StatusBadge.Dot />
          Completed
        </StatusBadge.Root>
        <StatusBadge.Root status='pending'>
          <StatusBadge.Dot />
          Pending
        </StatusBadge.Root>
        <StatusBadge.Root status='failed'>
          <StatusBadge.Dot />
          Failed
        </StatusBadge.Root>
      </Section>

      <Section title='Avatars'>
        <Avatar.Root size='48' color='blue'>
          JD
        </Avatar.Root>
        <Avatar.Root size='40' color='purple'>
          AB
        </Avatar.Root>
        <Avatar.Root size='32' color='yellow'>
          XY
        </Avatar.Root>
        <Avatar.Root size='40' />
      </Section>

      <Section title='Alerts'>
        <div className='flex w-full flex-col gap-3'>
          <Alert.Root variant='lighter' status='information' size='small'>
            Informational message.
          </Alert.Root>
          <Alert.Root variant='lighter' status='success' size='small'>
            Everything went well.
          </Alert.Root>
          <Alert.Root variant='lighter' status='error' size='small'>
            Something needs your attention.
          </Alert.Root>
        </div>
      </Section>
    </div>
  );
}