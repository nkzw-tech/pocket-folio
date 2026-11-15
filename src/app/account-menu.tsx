import { Button } from '@astryxdesign/core/Button';
import { DropdownMenu, type DropdownMenuItemData } from '@astryxdesign/core/DropdownMenu';
import { useRouter } from '@void/react';
import { ChevronDown, LogIn, LogOut, Settings2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { auth } from 'void/client';
import { text } from '../i18n/text';
import { AccountAvatar } from './account-avatar';
import type { SessionUser } from './workspace';

export function AccountMenu({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const signOut = async () => {
    if (pending) {
      return;
    }
    setPending(true);
    setError('');
    try {
      const result = await auth.signOut();
      if (result.error) {
        throw new Error(text('Unable to sign out. Please try again.'));
      }
      location.assign('/login');
    } catch {
      setError(text('Unable to sign out. Please try again.'));
      setPending(false);
    }
  };
  const items: Array<DropdownMenuItemData> = [
    {
      icon: Settings2,
      isDisabled: pending,
      label: text('Settings'),
      onClick: () => {
        void router.visit('/settings');
      },
    },
    user
      ? {
          hasCloseOnSelect: false,
          icon: LogOut,
          isDisabled: pending,
          label: pending ? text('Signing out…') : text('Sign out'),
          onClick: () => {
            void signOut();
          },
        }
      : {
          icon: LogIn,
          label: text('Sign in'),
          onClick: () => {
            void router.visit('/login');
          },
        },
  ];
  return (
    <div className="account-control">
      <>
        <DropdownMenu
          alignment="end"
          className="account-menu"
          footer={
            error ? (
              <p className="account-menu-error" role="alert">
                {error}
              </p>
            ) : undefined
          }
          isMenuOpen={open}
          items={items}
          menuWidth={240}
          onOpenChange={(value) => {
            setOpen(value);
            if (value) {
              setError('');
            }
          }}
          presentation="popover"
          renderTrigger={(props) => (
            <Button
              label={user ? `${text('Account')}: ${user.name}` : text('Account')}
              {...props}
              aria-label={user ? `${text('Account')}: ${user.name}` : text('Account')}
              className="account-menu-trigger"
              type="button"
            >
              <span aria-hidden="true" className="account-avatar">
                {user ? (
                  <AccountAvatar email={user.email} key={user.email} name={user.name} />
                ) : (
                  <UserRound size={17} />
                )}
              </span>
              <span className="account-menu-name">{user?.name ?? text('Account')}</span>
              <ChevronDown aria-hidden="true" className="account-menu-chevron" size={14} />
            </Button>
          )}
        />
      </>
    </div>
  );
}
