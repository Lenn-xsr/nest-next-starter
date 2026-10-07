'use client';

import * as React from 'react';
import { RiUserAddLine } from '@remixicon/react';
import * as Alert from '@/components/ui/alert';
import * as Avatar from '@/components/ui/avatar';
import * as Button from '@/components/ui/button';
import * as StatusBadge from '@/components/ui/status-badge';
import * as Table from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { errorMessage } from '@/lib/api/error-message';
import { useMe, useSetAdminActive, useTeam } from '@/lib/api/hooks';
import { formatDateTime, initials } from '@/lib/format';
import { InviteModal } from './invite-modal';

export default function TeamPage() {
  const { data: me } = useMe();
  const { data: team, isLoading, error } = useTeam();
  const setActive = useSetAdminActive();
  const [inviteOpen, setInviteOpen] = React.useState(false);

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Team'
        description='People who can sign in. Deactivating someone signs them out everywhere, immediately.'
        action={
          <Button.Root size='small' onClick={() => setInviteOpen(true)}>
            <Button.Icon as={RiUserAddLine} />
            Invite
          </Button.Root>
        }
      />

      {(error || setActive.error) && (
        <Alert.Root variant='lighter' status='error' size='small' role='alert'>
          {errorMessage(error ?? setActive.error)}
        </Alert.Root>
      )}

      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Member</Table.Head>
            <Table.Head>Status</Table.Head>
            <Table.Head>Added</Table.Head>
            <Table.Head />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading && (
            <Table.Row>
              <Table.Cell colSpan={4} className='text-text-sub-600'>
                Loading…
              </Table.Cell>
            </Table.Row>
          )}

          {team?.map((member) => (
            <Table.Row key={member.id}>
              <Table.Cell>
                <div className='flex items-center gap-3'>
                  <Avatar.Root size='40'>
                    {initials(member.name, member.email)}
                  </Avatar.Root>
                  <div className='min-w-0'>
                    <div className='truncate text-label-sm text-text-strong-950'>
                      {member.name ?? member.email.split('@')[0]}
                      {member.id === me?.id && (
                        <span className='ml-2 text-paragraph-xs text-text-soft-400'>
                          you
                        </span>
                      )}
                    </div>
                    <div className='truncate text-paragraph-xs text-text-sub-600'>
                      {member.email}
                    </div>
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell>
                <StatusBadge.Root
                  status={member.active ? 'completed' : 'disabled'}
                >
                  <StatusBadge.Dot />
                  {member.active ? 'Active' : 'Inactive'}
                </StatusBadge.Root>
              </Table.Cell>
              <Table.Cell className='text-paragraph-sm text-text-sub-600'>
                {formatDateTime(member.createdAt)}
              </Table.Cell>
              <Table.Cell className='text-right'>
                {member.id !== me?.id && (
                  <Button.Root
                    variant={member.active ? 'error' : 'neutral'}
                    mode='stroke'
                    size='xsmall'
                    disabled={setActive.isPending}
                    onClick={() =>
                      setActive.mutate({
                        id: member.id,
                        active: !member.active,
                      })
                    }
                  >
                    {member.active ? 'Deactivate' : 'Reactivate'}
                  </Button.Root>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}