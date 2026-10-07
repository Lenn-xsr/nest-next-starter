'use client';

import * as React from 'react';
import { RiUserAddLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';
import * as Hint from '@/components/ui/hint';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import { errorMessage } from '@/lib/api/error-message';
import { useInviteAdmin } from '@/lib/api/hooks';

export function InviteModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invite = useInviteAdmin();
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');

  function close() {
    onOpenChange(false);
    setEmail('');
    setName('');
    invite.reset();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    invite.mutate(
      { email: email.trim(), name: name.trim() || undefined },
      { onSuccess: close },
    );
  }

  return (
    <Modal.Root open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <Modal.Content className='max-w-md'>
        <form onSubmit={submit}>
          <Modal.Header
            icon={RiUserAddLine}
            title='Invite a team member'
            description='They will be able to sign in with this Google account.'
          />
          <Modal.Body className='flex flex-col gap-4'>
            <div className='flex flex-col gap-1.5'>
              <Label.Root htmlFor='invite-email'>
                Work email <Label.Asterisk />
              </Label.Root>
              <Input.Root hasError={Boolean(invite.error)}>
                <Input.Wrapper>
                  <Input.Input
                    id='invite-email'
                    type='email'
                    required
                    autoFocus
                    placeholder='jane@example.com'
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Input.Wrapper>
              </Input.Root>
              {invite.error && (
                <Hint.Root hasError role='alert'>
                  {errorMessage(invite.error)}
                </Hint.Root>
              )}
            </div>

            <div className='flex flex-col gap-1.5'>
              <Label.Root htmlFor='invite-name'>
                Name <Label.Sub>(optional)</Label.Sub>
              </Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='invite-name'
                    placeholder='Jane Doe'
                    maxLength={120}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='small'
              className='w-full'
              onClick={close}
            >
              Cancel
            </Button.Root>
            <Button.Root
              type='submit'
              size='small'
              className='w-full'
              disabled={invite.isPending}
            >
              {invite.isPending ? 'Inviting…' : 'Send invite'}
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}