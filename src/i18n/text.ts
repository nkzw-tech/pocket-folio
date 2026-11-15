import { fbs } from 'fbtee';
const messages: Record<string, () => string> = {
  '1. Install the CLI and skill': () =>
    String(fbs('1. Install the CLI and skill', 'Binder interface: 1. Install the CLI and skill')),
  '1st Edition': () => String(fbs('1st Edition', 'Binder interface: 1st Edition')),
  '2. Connect your account': () =>
    String(fbs('2. Connect your account', 'Binder interface: 2. Connect your account')),
  '3. Start a new agent session': () =>
    String(fbs('3. Start a new agent session', 'Binder interface: 3. Start a new agent session')),
  Account: () => String(fbs('Account', 'Binder interface: Account')),
  'A collection supports 100 binders with up to 2,000 pockets each.': () =>
    String(
      fbs(
        'A collection supports 100 binders with up to 2,000 pockets each.',
        'Binder interface: A collection supports 100 binders with up to 2,000 pockets each.',
      ),
    ),
  Active: () => String(fbs('Active', 'Binder interface: Active')),
  'Add card to pocket': () =>
    String(fbs('Add card to pocket', 'Binder interface: Add card to pocket')),
  'Additional German scans through its TCGdex mirror.': () =>
    String(
      fbs(
        'Additional German scans through its TCGdex mirror.',
        'Binder interface: Additional German scans through its TCGdex mirror.',
      ),
    ),
  'Add page': () => String(fbs('Add page', 'Binder interface: Add page')),
  Agent: () => String(fbs('Agent', 'Binder interface: Agent')),
  'Agent activity': () => String(fbs('Agent activity', 'Binder interface: Agent activity')),

  'Agent skill': () => String(fbs('Agent skill', 'Binder interface: Agent skill')),
  All: () => String(fbs('All', 'Binder interface: All')),
  'All available sets': () =>
    String(fbs('All available sets', 'Binder interface: All available sets')),
  'All changes saved': () =>
    String(fbs('All changes saved', 'Binder interface: All changes saved')),
  'All eras': () => String(fbs('All eras', 'Binder interface: All eras')),
  'All languages': () => String(fbs('All languages', 'Binder interface: All languages')),
  'All my binders': () => String(fbs('All my binders', 'Binder interface: All my binders')),
  'All rarities': () => String(fbs('All rarities', 'Binder interface: All rarities')),
  'All sets': () => String(fbs('All sets', 'Binder interface: All sets')),
  'Already have an account? Sign in': () =>
    String(
      fbs('Already have an account? Sign in', 'Binder interface: Already have an account? Sign in'),
    ),
  'Amazing Rare': () => String(fbs('Amazing Rare', 'Binder interface: Amazing Rare')),
  'Anyone with the link can browse this binder. They can’t edit it or see your other binders.':
    () =>
      String(
        fbs(
          'Anyone with the link can browse this binder. They can’t edit it or see your other binders.',
          'Binder interface: Anyone with the link can browse this binder. They can’t edit it or see your other binders.',
        ),
      ),
  API: () => String(fbs('API', 'Binder interface: API')),
  'API keys': () => String(fbs('API keys', 'Binder interface: API keys')),
  'API reference': () => String(fbs('API reference', 'Binder interface: API reference')),
  App: () => String(fbs('App', 'Binder interface: App')),
  Appearance: () => String(fbs('Appearance', 'Binder interface: Appearance')),
  'Art Rare': () => String(fbs('Art Rare', 'Binder interface: Art Rare')),
  'Ask it to mark cards as purchased when ordered, or owned when they arrive. Review agent changes in Settings → API.':
    () =>
      String(
        fbs(
          'Ask it to mark cards as purchased when ordered, or owned when they arrive. Review agent changes in Settings → API.',
          'Binder interface: Ask it to mark cards as purchased when ordered, or owned when they arrive. Review agent changes in Settings → API.',
        ),
      ),
  Attribution: () => String(fbs('Attribution', 'Binder interface: Attribution')),
  'Back of': () => String(fbs('Back of', 'Binder interface: Back of')),
  'Back to sign in': () => String(fbs('Back to sign in', 'Binder interface: Back to sign in')),
  'Back to your binders': () =>
    String(fbs('Back to your binders', 'Binder interface: Back to your binders')),
  'Backups and security records': () =>
    String(fbs('Backups and security records', 'Binder interface: Backups and security records')),
  Binder: () => String(fbs('Binder', 'Binder interface: Binder')),
  'Binder access': () => String(fbs('Binder access', 'Binder interface: Binder access')),
  'Binder appearance': () =>
    String(fbs('Binder appearance', 'Binder interface: Binder appearance')),
  'binder changes': () => String(fbs('binder changes', 'Binder interface: binder changes')),
  'Binder color': () => String(fbs('Binder color', 'Binder interface: Binder color')),
  'Binder not found': () => String(fbs('Binder not found', 'Binder interface: Binder not found')),
  'Binder pages. Use left and right arrow keys to turn pages.': () =>
    String(
      fbs(
        'Binder pages. Use left and right arrow keys to turn pages.',
        'Binder interface: Binder pages. Use left and right arrow keys to turn pages.',
      ),
    ),
  Binders: () => String(fbs('Binders', 'Binder interface: Binders')),
  'Binders are private until you enable sharing. Anyone with a share link can view and copy its contents. Public profiles show only the binders you select. Revoking a link prevents future access through the service, but cannot remove copies or previews others already saved. An agent with an API key can access or change data within the permissions you grant; the agent provider has its own privacy practices.':
    () =>
      String(
        fbs(
          'Binders are private until you enable sharing. Anyone with a share link can view and copy its contents. Public profiles show only the binders you select. Revoking a link prevents future access through the service, but cannot remove copies or previews others already saved. An agent with an API key can access or change data within the permissions you grant; the agent provider has its own privacy practices.',
          'Binder interface: Binders are private until you enable sharing. Anyone with a share link can view and copy its contents. Public profiles show only the binders you select. Revoking a link prevents future access through the service, but cannot remove copies or previews others already saved. An agent with an API key can access or change data within the permissions you grant; the agent provider has its own privacy practices.',
        ),
      ),
  'Binder settings': () => String(fbs('Binder settings', 'Binder interface: Binder settings')),
  'Binder unavailable': () =>
    String(fbs('Binder unavailable', 'Binder interface: Binder unavailable')),
  'Black White Rare': () => String(fbs('Black White Rare', 'Binder interface: Black White Rare')),
  Blue: () => String(fbs('Blue', 'Binder interface: Blue')),
  'Browse the cards': () => String(fbs('Browse the cards', 'Binder interface: Browse the cards')),
  Cancel: () => String(fbs('Cancel', 'Binder interface: Cancel')),
  'card changes ·': () => String(fbs('card changes ·', 'Binder interface: card changes ·')),
  'Card edition': () => String(fbs('Card edition', 'Binder interface: Card edition')),
  'Card language': () => String(fbs('Card language', 'Binder interface: Card language')),
  'Card order and empty pockets stay in place when changing layout.': () =>
    String(
      fbs(
        'Card order and empty pockets stay in place when changing layout.',
        'Binder interface: Card order and empty pockets stay in place when changing layout.',
      ),
    ),
  cards: () => String(fbs('cards', 'Binder interface: cards')),
  CARDS: () => String(fbs('CARDS', 'Binder interface: CARDS')),
  Cards: () => String(fbs('Cards', 'Binder interface: Cards')),
  'Card sets': () => String(fbs('Card sets', 'Binder interface: Card sets')),
  'Cards on both sides': () =>
    String(fbs('Cards on both sides', 'Binder interface: Cards on both sides')),
  'Cards on this page will leave the binder. Owned and purchased statuses stay unchanged.': () =>
    String(
      fbs(
        'Cards on this page will leave the binder. Owned and purchased statuses stay unchanged.',
        'Binder interface: Cards on this page will leave the binder. Owned and purchased statuses stay unchanged.',
      ),
    ),
  'Card statuses updated': () =>
    String(fbs('Card statuses updated', 'Binder interface: Card statuses updated')),
  'Card status is shared across binders. Restricting a key limits the cards it can change, but the same printing updates everywhere.':
    () =>
      String(
        fbs(
          'Card status is shared across binders. Restricting a key limits the cards it can change, but the same printing updates everywhere.',
          'Binder interface: Card status is shared across binders. Restricting a key limits the cards it can change, but the same printing updates everywhere.',
        ),
      ),
  'Card text': () => String(fbs('Card text', 'Binder interface: Card text')),
  'Change card status': () =>
    String(fbs('Change card status', 'Binder interface: Change card status')),
  'Changes are saved on this device. Sync will retry.': () =>
    String(
      fbs(
        'Changes are saved on this device. Sync will retry.',
        'Binder interface: Changes are saved on this device. Sync will retry.',
      ),
    ),
  'Character Rare': () => String(fbs('Character Rare', 'Binder interface: Character Rare')),
  'Character Super Rare': () =>
    String(fbs('Character Super Rare', 'Binder interface: Character Super Rare')),
  Charcoal: () => String(fbs('Charcoal', 'Binder interface: Charcoal')),
  'Check your inbox for a verification link.': () =>
    String(
      fbs(
        'Check your inbox for a verification link.',
        'Binder interface: Check your inbox for a verification link.',
      ),
    ),
  'Choose a collection export smaller than 20 MB.': () =>
    String(
      fbs(
        'Choose a collection export smaller than 20 MB.',
        'Binder interface: Choose a collection export smaller than 20 MB.',
      ),
    ),
  'Choose a new password': () =>
    String(fbs('Choose a new password', 'Binder interface: Choose a new password')),
  'Choose collection file': () =>
    String(fbs('Choose collection file', 'Binder interface: Choose collection file')),
  'Close dialog': () => String(fbs('Close dialog', 'Binder interface: Close dialog')),
  'Close image': () => String(fbs('Close image', 'Binder interface: Close image')),
  'Cloudflare provides hosting, database storage, security, and account email delivery. Gravatar provides profile pictures: your browser sends it a hash of your email address and normal connection information, including your IP address, even if no avatar exists. A hash is not anonymous. Card scans are served by our hosted app; following external links is subject to those sites’ policies.':
    () =>
      String(
        fbs(
          'Cloudflare provides hosting, database storage, security, and account email delivery. Gravatar provides profile pictures: your browser sends it a hash of your email address and normal connection information, including your IP address, even if no avatar exists. A hash is not anonymous. Card scans are served by our hosted app; following external links is subject to those sites’ policies.',
          'Binder interface: Cloudflare provides hosting, database storage, security, and account email delivery. Gravatar provides profile pictures: your browser sends it a hash of your email address and normal connection information, including your IP address, even if no avatar exists. A hash is not anonymous. Card scans are served by our hosted app; following external links is subject to those sites’ policies.',
        ),
      ),
  'Collection data': () => String(fbs('Collection data', 'Binder interface: Collection data')),
  'Collection imported.': () =>
    String(fbs('Collection imported.', 'Binder interface: Collection imported.')),
  'Collection layout': () =>
    String(fbs('Collection layout', 'Binder interface: Collection layout')),
  'Collection progress': () =>
    String(fbs('Collection progress', 'Binder interface: Collection progress')),
  Common: () => String(fbs('Common', 'Binder interface: Common')),
  'Confirm import': () => String(fbs('Confirm import', 'Binder interface: Confirm import')),
  'Confirm password': () => String(fbs('Confirm password', 'Binder interface: Confirm password')),
  'Connect your agent': () =>
    String(fbs('Connect your agent', 'Binder interface: Connect your agent')),
  Contact: () => String(fbs('Contact', 'Binder interface: Contact')),
  'Cookies and local storage': () =>
    String(fbs('Cookies and local storage', 'Binder interface: Cookies and local storage')),
  Copied: () => String(fbs('Copied', 'Binder interface: Copied')),
  'Copy example request': () =>
    String(fbs('Copy example request', 'Binder interface: Copy example request')),
  'Copy install command': () =>
    String(fbs('Copy install command', 'Binder interface: Copy install command')),
  'Copy key': () => String(fbs('Copy key', 'Binder interface: Copy key')),
  'Copy link': () => String(fbs('Copy link', 'Binder interface: Copy link')),
  'Copy login command': () =>
    String(fbs('Copy login command', 'Binder interface: Copy login command')),
  'Copy skill command': () =>
    String(fbs('Copy skill command', 'Binder interface: Copy skill command')),
  'Couldn’t open this view': () =>
    String(fbs('Couldn’t open this view', 'Binder interface: Couldn’t open this view')),
  'Couldn’t save. Try again.': () =>
    String(fbs('Couldn’t save. Try again.', 'Binder interface: Couldn’t save. Try again.')),
  'Could not complete the request.': () =>
    String(
      fbs('Could not complete the request.', 'Binder interface: Could not complete the request.'),
    ),
  'Could not connect. Please try again.': () =>
    String(
      fbs(
        'Could not connect. Please try again.',
        'Binder interface: Could not connect. Please try again.',
      ),
    ),
  'Could not copy. Select the key and copy it manually.': () =>
    String(
      fbs(
        'Could not copy. Select the key and copy it manually.',
        'Binder interface: Could not copy. Select the key and copy it manually.',
      ),
    ),
  'Could not copy. Select the text and copy it manually.': () =>
    String(
      fbs(
        'Could not copy. Select the text and copy it manually.',
        'Binder interface: Could not copy. Select the text and copy it manually.',
      ),
    ),
  'Could not create key.': () =>
    String(fbs('Could not create key.', 'Binder interface: Could not create key.')),
  'Could not delete your account. Check your password and try again.': () =>
    String(
      fbs(
        'Could not delete your account. Check your password and try again.',
        'Binder interface: Could not delete your account. Check your password and try again.',
      ),
    ),
  'Could not import collection.': () =>
    String(fbs('Could not import collection.', 'Binder interface: Could not import collection.')),
  'Could not load activity.': () =>
    String(fbs('Could not load activity.', 'Binder interface: Could not load activity.')),
  'Could not load settings.': () =>
    String(fbs('Could not load settings.', 'Binder interface: Could not load settings.')),
  'Could not read this file.': () =>
    String(fbs('Could not read this file.', 'Binder interface: Could not read this file.')),
  'Could not reset your password. Please try again.': () =>
    String(
      fbs(
        'Could not reset your password. Please try again.',
        'Binder interface: Could not reset your password. Please try again.',
      ),
    ),
  'Could not revoke key.': () =>
    String(fbs('Could not revoke key.', 'Binder interface: Could not revoke key.')),
  'Could not save this change.': () =>
    String(fbs('Could not save this change.', 'Binder interface: Could not save this change.')),
  'Could not send the email. Please try again later.': () =>
    String(
      fbs(
        'Could not send the email. Please try again later.',
        'Binder interface: Could not send the email. Please try again later.',
      ),
    ),
  'Could not sign in.': () =>
    String(fbs('Could not sign in.', 'Binder interface: Could not sign in.')),
  'Could not sync. Your changes are saved on this device.': () =>
    String(
      fbs(
        'Could not sync. Your changes are saved on this device.',
        'Binder interface: Could not sync. Your changes are saved on this device.',
      ),
    ),
  Cream: () => String(fbs('Cream', 'Binder interface: Cream')),
  'Create account': () => String(fbs('Create account', 'Binder interface: Create account')),
  'Create a free account': () =>
    String(fbs('Create a free account', 'Binder interface: Create a free account')),
  'Create a key with the access you need, then paste it into the terminal’s hidden prompt.': () =>
    String(
      fbs(
        'Create a key with the access you need, then paste it into the terminal’s hidden prompt.',
        'Binder interface: Create a key with the access you need, then paste it into the terminal’s hidden prompt.',
      ),
    ),
  'Create and arrange binders': () =>
    String(fbs('Create and arrange binders', 'Binder interface: Create and arrange binders')),
  'Create API key': () => String(fbs('Create API key', 'Binder interface: Create API key')),
  'Create binder': () => String(fbs('Create binder', 'Binder interface: Create binder')),
  created: () => String(fbs('created', 'Binder interface: created')),
  'Create profile link': () =>
    String(fbs('Create profile link', 'Binder interface: Create profile link')),
  'Create share link': () =>
    String(fbs('Create share link', 'Binder interface: Create share link')),
  'Creating…': () => String(fbs('Creating…', 'Binder interface: Creating…')),
  'Current password': () => String(fbs('Current password', 'Binder interface: Current password')),
  'Custom color': () => String(fbs('Custom color', 'Binder interface: Custom color')),
  days: () => String(fbs('days', 'Binder interface: days')),
  'Delete account': () => String(fbs('Delete account', 'Binder interface: Delete account')),
  'Delete binder': () => String(fbs('Delete binder', 'Binder interface: Delete binder')),
  'Delete binders': () => String(fbs('Delete binders', 'Binder interface: Delete binders')),
  deleted: () => String(fbs('deleted', 'Binder interface: deleted')),
  'Deleted data may remain in D1 recovery backups for up to 30 days. Hashed email-delivery counters and infrastructure security records may remain to prevent abuse or meet legal obligations. If a backup is restored, deletion requests must be reapplied before normal service resumes. We use access controls, password and key hashing, and encrypted connections to protect data.':
    () =>
      String(
        fbs(
          'Deleted data may remain in D1 recovery backups for up to 30 days. Hashed email-delivery counters and infrastructure security records may remain to prevent abuse or meet legal obligations. If a backup is restored, deletion requests must be reapplied before normal service resumes. We use access controls, password and key hashing, and encrypted connections to protect data.',
          'Binder interface: Deleted data may remain in D1 recovery backups for up to 30 days. Hashed email-delivery counters and infrastructure security records may remain to prevent abuse or meet legal obligations. If a backup is restored, deletion requests must be reapplied before normal service resumes. We use access controls, password and key hashing, and encrypted connections to protect data.',
        ),
      ),
  'Deleting…': () => String(fbs('Deleting…', 'Binder interface: Deleting…')),
  'Discard unsynced edits': () =>
    String(fbs('Discard unsynced edits', 'Binder interface: Discard unsynced edits')),
  'Discard unsynced edits on this device and restore the server copy? Export a backup first if you want to keep them.':
    () =>
      String(
        fbs(
          'Discard unsynced edits on this device and restore the server copy? Export a backup first if you want to keep them.',
          'Binder interface: Discard unsynced edits on this device and restore the server copy? Export a backup first if you want to keep them.',
        ),
      ),

  Done: () => String(fbs('Done', 'Binder interface: Done')),
  'Double Rare': () => String(fbs('Double Rare', 'Binder interface: Double Rare')),
  'Dragon and Fairy energy symbols.': () =>
    String(
      fbs('Dragon and Fairy energy symbols.', 'Binder interface: Dragon and Fairy energy symbols.'),
    ),
  'Edition unspecified': () =>
    String(fbs('Edition unspecified', 'Binder interface: Edition unspecified')),
  Email: () => String(fbs('Email', 'Binder interface: Email')),
  'Email verified': () => String(fbs('Email verified', 'Binder interface: Email verified')),
  'Empty pages': () => String(fbs('Empty pages', 'Binder interface: Empty pages')),
  'Empty pocket': () => String(fbs('Empty pocket', 'Binder interface: Empty pocket')),
  Energy: () => String(fbs('Energy', 'Binder interface: Energy')),
  'Energy symbols and Pok\u00e9mon VS retreat costs.': () =>
    String(
      fbs(
        'Energy symbols and Pok\u00e9mon VS retreat costs.',
        'Binder interface: Energy symbols and Pok\u00e9mon VS retreat costs.',
      ),
    ),
  'English and Japanese card data, scans, and set logos.': () =>
    String(
      fbs(
        'English and Japanese card data, scans, and set logos.',
        'Binder interface: English and Japanese card data, scans, and set logos.',
      ),
    ),
  'English reference scan': () =>
    String(fbs('English reference scan', 'Binder interface: English reference scan')),
  'Enter immersive view': () =>
    String(fbs('Enter immersive view', 'Binder interface: Enter immersive view')),
  Era: () => String(fbs('Era', 'Binder interface: Era')),
  'Essential cookies keep you signed in. Your browser stores preferences and an account-specific collection cache, including edits waiting to sync. These are used for the app to work, not for advertising. Signing out does not necessarily erase cached collections. You can clear site data in your browser; export unsynced changes first.':
    () =>
      String(
        fbs(
          'Essential cookies keep you signed in. Your browser stores preferences and an account-specific collection cache, including edits waiting to sync. These are used for the app to work, not for advertising. Signing out does not necessarily erase cached collections. You can clear site data in your browser; export unsynced changes first.',
          'Binder interface: Essential cookies keep you signed in. Your browser stores preferences and an account-specific collection cache, including edits waiting to sync. These are used for the app to work, not for advertising. Signing out does not necessarily erase cached collections. You can clear site data in your browser; export unsynced changes first.',
        ),
      ),
  'Existing binders kept': () =>
    String(fbs('Existing binders kept', 'Binder interface: Existing binders kept')),
  'Existing binders stay unchanged. Owned takes priority over purchased, then wishlist, then missing. Imported binders are private.':
    () =>
      String(
        fbs(
          'Existing binders stay unchanged. Owned takes priority over purchased, then wishlist, then missing. Imported binders are private.',
          'Binder interface: Existing binders stay unchanged. Owned takes priority over purchased, then wishlist, then missing. Imported binders are private.',
        ),
      ),
  'Exit immersive view': () =>
    String(fbs('Exit immersive view', 'Binder interface: Exit immersive view')),
  Expired: () => String(fbs('Expired', 'Binder interface: Expired')),
  'Expires after': () => String(fbs('Expires after', 'Binder interface: Expires after')),
  'Export collection': () =>
    String(fbs('Export collection', 'Binder interface: Export collection')),
  'External services': () =>
    String(fbs('External services', 'Binder interface: External services')),
  'Fan project & credits': () =>
    String(fbs('Fan project & credits', 'Binder interface: Fan project & credits')),
  'Filter by ownership': () =>
    String(fbs('Filter by ownership', 'Binder interface: Filter by ownership')),
  'Filter by rarity': () => String(fbs('Filter by rarity', 'Binder interface: Filter by rarity')),
  'Filter card set': () => String(fbs('Filter card set', 'Binder interface: Filter card set')),
  'Find a card': () => String(fbs('Find a card', 'Binder interface: Find a card')),
  'Find a set': () => String(fbs('Find a set', 'Binder interface: Find a set')),
  'Flexible pages': () => String(fbs('Flexible pages', 'Binder interface: Flexible pages')),
  'Forgot password?': () => String(fbs('Forgot password?', 'Binder interface: Forgot password?')),
  'Futuristic Rare': () => String(fbs('Futuristic Rare', 'Binder interface: Futuristic Rare')),
  'German Grundset scans.': () =>
    String(fbs('German Grundset scans.', 'Binder interface: German Grundset scans.')),
  Gold: () => String(fbs('Gold', 'Binder interface: Gold')),
  Grid: () => String(fbs('Grid', 'Binder interface: Grid')),
  'Holo Rare': () => String(fbs('Holo Rare', 'Binder interface: Holo Rare')),
  'How we use it': () => String(fbs('How we use it', 'Binder interface: How we use it')),
  'Hyper Rare': () => String(fbs('Hyper Rare', 'Binder interface: Hyper Rare')),
  'If an account exists for that address, you’ll receive a reset link shortly.': () =>
    String(
      fbs(
        'If an account exists for that address, you’ll receive a reset link shortly.',
        'Binder interface: If an account exists for that address, you’ll receive a reset link shortly.',
      ),
    ),
  'If you didn’t request this, you can ignore this email.': () =>
    String(
      fbs(
        'If you didn’t request this, you can ignore this email.',
        'Binder interface: If you didn’t request this, you can ignore this email.',
      ),
    ),
  'Illustration Rare': () =>
    String(fbs('Illustration Rare', 'Binder interface: Illustration Rare')),
  'Import collection': () =>
    String(fbs('Import collection', 'Binder interface: Import collection')),
  'Import preview': () => String(fbs('Import preview', 'Binder interface: Import preview')),
  'Information we keep': () =>
    String(fbs('Information we keep', 'Binder interface: Information we keep')),
  'Interface language': () =>
    String(fbs('Interface language', 'Binder interface: Interface language')),
  'Interface language only': () =>
    String(fbs('Interface language only', 'Binder interface: Interface language only')),
  'Japanese ·': () => String(fbs('Japanese ·', 'Binder interface: Japanese ·')),
  'Jump to…': () => String(fbs('Jump to…', 'Binder interface: Jump to…')),
  'Jump to binder page': () =>
    String(fbs('Jump to binder page', 'Binder interface: Jump to binder page')),
  'Jump to matching card': () =>
    String(fbs('Jump to matching card', 'Binder interface: Jump to matching card')),
  'Key name': () => String(fbs('Key name', 'Binder interface: Key name')),
  Language: () => String(fbs('Language', 'Binder interface: Language')),
  'Last updated: November 17, 2026': () =>
    String(
      fbs('Last updated: November 17, 2026', 'Binder interface: Last updated: November 17, 2026'),
    ),
  Lavender: () => String(fbs('Lavender', 'Binder interface: Lavender')),
  'Let an agent update your binders with only the access you choose.': () =>
    String(
      fbs(
        'Let an agent update your binders with only the access you choose.',
        'Binder interface: Let an agent update your binders with only the access you choose.',
      ),
    ),
  'Loading card details…': () =>
    String(fbs('Loading card details…', 'Binder interface: Loading card details…')),
  'macOS needs Command Line Tools. Linux needs Secret Service and secret-tool. Windows is not supported yet.':
    () =>
      String(
        fbs(
          'macOS needs Command Line Tools. Linux needs Secret Service and secret-tool. Windows is not supported yet.',
          'Binder interface: macOS needs Command Line Tools. Linux needs Secret Service and secret-tool. Windows is not supported yet.',
        ),
      ),
  'Main navigation': () => String(fbs('Main navigation', 'Binder interface: Main navigation')),
  'Manage share links': () =>
    String(fbs('Manage share links', 'Binder interface: Manage share links')),
  'Mark all as owned': () =>
    String(fbs('Mark all as owned', 'Binder interface: Mark all as owned')),
  matches: () => String(fbs('matches', 'Binder interface: matches')),
  'Mega Attack Rare': () => String(fbs('Mega Attack Rare', 'Binder interface: Mega Attack Rare')),
  'Mega Hyper Rare': () => String(fbs('Mega Hyper Rare', 'Binder interface: Mega Hyper Rare')),
  'Mega Ultra Rare': () => String(fbs('Mega Ultra Rare', 'Binder interface: Mega Ultra Rare')),
  Missing: () => String(fbs('Missing', 'Binder interface: Missing')),
  'Missing card preview': () =>
    String(fbs('Missing card preview', 'Binder interface: Missing card preview')),
  Move: () => String(fbs('Move', 'Binder interface: Move')),
  'Move to pocket': () => String(fbs('Move to pocket', 'Binder interface: Move to pocket')),
  'Move your binders and card statuses between Pocket Folio installations.': () =>
    String(
      fbs(
        'Move your binders and card statuses between Pocket Folio installations.',
        'Binder interface: Move your binders and card statuses between Pocket Folio installations.',
      ),
    ),
  'Multilingual card data, translations, and German scans.': () =>
    String(
      fbs(
        'Multilingual card data, translations, and German scans.',
        'Binder interface: Multilingual card data, translations, and German scans.',
      ),
    ),
  'My card assistant': () =>
    String(fbs('My card assistant', 'Binder interface: My card assistant')),
  'My pretty binder': () => String(fbs('My pretty binder', 'Binder interface: My pretty binder')),
  Name: () => String(fbs('Name', 'Binder interface: Name')),
  Navy: () => String(fbs('Navy', 'Binder interface: Navy')),
  'Never used': () => String(fbs('Never used', 'Binder interface: Never used')),
  'New API key': () => String(fbs('New API key', 'Binder interface: New API key')),
  'New binder': () => String(fbs('New binder', 'Binder interface: New binder')),
  'New binders': () => String(fbs('New binders', 'Binder interface: New binders')),
  'New password': () => String(fbs('New password', 'Binder interface: New password')),
  Next: () => String(fbs('Next', 'Binder interface: Next')),
  'Next binder page': () => String(fbs('Next binder page', 'Binder interface: Next binder page')),
  'No agent changes yet.': () =>
    String(fbs('No agent changes yet.', 'Binder interface: No agent changes yet.')),
  'No API keys yet.': () => String(fbs('No API keys yet.', 'Binder interface: No API keys yet.')),
  'No matching cards in the current catalog.': () =>
    String(
      fbs(
        'No matching cards in the current catalog.',
        'Binder interface: No matching cards in the current catalog.',
      ),
    ),
  'No matching sets.': () =>
    String(fbs('No matching sets.', 'Binder interface: No matching sets.')),
  None: () => String(fbs('None', 'Binder interface: None')),
  'No public binders yet.': () =>
    String(fbs('No public binders yet.', 'Binder interface: No public binders yet.')),
  'Not verified': () => String(fbs('Not verified', 'Binder interface: Not verified')),
  'Only selected binders appear on your profile. Anyone with the link can view them.': () =>
    String(
      fbs(
        'Only selected binders appear on your profile. Anyone with the link can view them.',
        'Binder interface: Only selected binders appear on your profile. Anyone with the link can view them.',
      ),
    ),
  'Open expanded view': () =>
    String(fbs('Open expanded view', 'Binder interface: Open expanded view')),
  'Opening…': () => String(fbs('Opening…', 'Binder interface: Opening…')),
  'Opening Pocket Folio…': () =>
    String(fbs('Opening Pocket Folio…', 'Binder interface: Opening Pocket Folio…')),
  'Opening your binder…': () =>
    String(fbs('Opening your binder…', 'Binder interface: Opening your binder…')),
  'Opening your collection': () =>
    String(fbs('Opening your collection', 'Binder interface: Opening your collection')),
  'Opening your collection…': () =>
    String(fbs('Opening your collection…', 'Binder interface: Opening your collection…')),
  'Open your binder': () => String(fbs('Open your binder', 'Binder interface: Open your binder')),
  'Open your binders': () =>
    String(fbs('Open your binders', 'Binder interface: Open your binders')),
  'Organize your cards and share your binders.': () =>
    String(
      fbs(
        'Organize your cards and share your binders.',
        'Binder interface: Organize your cards and share your binders.',
      ),
    ),
  'Original + interface language': () =>
    String(fbs('Original + interface language', 'Binder interface: Original + interface language')),
  'Original card artwork and official card backs.': () =>
    String(
      fbs(
        'Original card artwork and official card backs.',
        'Binder interface: Original card artwork and official card backs.',
      ),
    ),
  'Original only': () => String(fbs('Original only', 'Binder interface: Original only')),
  Owned: () => String(fbs('Owned', 'Binder interface: Owned')),
  owned: () => String(fbs('owned', 'Binder interface: owned')),
  Page: () => String(fbs('Page', 'Binder interface: Page')),
  'Page layout': () => String(fbs('Page layout', 'Binder interface: Page layout')),
  Pages: () => String(fbs('Pages', 'Binder interface: Pages')),
  'Page to remove': () => String(fbs('Page to remove', 'Binder interface: Page to remove')),
  Password: () => String(fbs('Password', 'Binder interface: Password')),
  'Passwords don’t match.': () =>
    String(fbs('Passwords don’t match.', 'Binder interface: Passwords don’t match.')),
  'Password updated': () => String(fbs('Password updated', 'Binder interface: Password updated')),
  'Permanently delete your account, binders, and API keys. Export your collection first if you want to keep a copy.':
    () =>
      String(
        fbs(
          'Permanently delete your account, binders, and API keys. Export your collection first if you want to keep a copy.',
          'Binder interface: Permanently delete your account, binders, and API keys. Export your collection first if you want to keep a copy.',
        ),
      ),
  Permissions: () => String(fbs('Permissions', 'Binder interface: Permissions')),
  'Physical card binder': () =>
    String(fbs('Physical card binder', 'Binder interface: Physical card binder')),
  'Pikachu Rare': () => String(fbs('Pikachu Rare', 'Binder interface: Pikachu Rare')),
  Pink: () => String(fbs('Pink', 'Binder interface: Pink')),
  'Please reload to try again.': () =>
    String(fbs('Please reload to try again.', 'Binder interface: Please reload to try again.')),
  Pocket: () => String(fbs('Pocket', 'Binder interface: Pocket')),
  'Pocket Folio': () => String(fbs('Pocket Folio', 'Binder interface: Pocket Folio')),
  'Pocket Folio is a free, noncommercial fan project. It is not affiliated with or endorsed by The Pokémon Company, Nintendo, Creatures, or GAME FREAK.':
    () =>
      String(
        fbs(
          'Pocket Folio is a free, noncommercial fan project. It is not affiliated with or endorsed by The Pokémon Company, Nintendo, Creatures, or GAME FREAK.',
          'Binder interface: Pocket Folio is a free, noncommercial fan project. It is not affiliated with or endorsed by The Pokémon Company, Nintendo, Creatures, or GAME FREAK.',
        ),
      ),
  'Pocket opening': () => String(fbs('Pocket opening', 'Binder interface: Pocket opening')),
  pockets: () => String(fbs('pockets', 'Binder interface: pockets')),
  'Pokémon cards ·': () => String(fbs('Pokémon cards ·', 'Binder interface: Pokémon cards ·')),
  'Pokémon names, artwork, and trademarks belong to their respective rights holders. The sources below provide data and scans; crediting them does not imply ownership of the underlying artwork or endorsement of Pocket Folio.':
    () =>
      String(
        fbs(
          'Pokémon names, artwork, and trademarks belong to their respective rights holders. The sources below provide data and scans; crediting them does not imply ownership of the underlying artwork or endorsement of Pocket Folio.',
          'Binder interface: Pokémon names, artwork, and trademarks belong to their respective rights holders. The sources below provide data and scans; crediting them does not imply ownership of the underlying artwork or endorsement of Pocket Folio.',
        ),
      ),
  'Policy updates': () => String(fbs('Policy updates', 'Binder interface: Policy updates')),
  Previous: () => String(fbs('Previous', 'Binder interface: Previous')),
  'Previous binder page': () =>
    String(fbs('Previous binder page', 'Binder interface: Previous binder page')),
  'Prism Star': () => String(fbs('Prism Star', 'Binder interface: Prism Star')),
  Privacy: () => String(fbs('Privacy', 'Binder interface: Privacy')),
  'Privacy policy': () => String(fbs('Privacy policy', 'Binder interface: Privacy policy')),
  'Processing and international transfers': () =>
    String(
      fbs(
        'Processing and international transfers',
        'Binder interface: Processing and international transfers',
      ),
    ),
  'Profile link': () => String(fbs('Profile link', 'Binder interface: Profile link')),
  'Profile sharing updated': () =>
    String(fbs('Profile sharing updated', 'Binder interface: Profile sharing updated')),
  'Profile unavailable': () =>
    String(fbs('Profile unavailable', 'Binder interface: Profile unavailable')),
  Promo: () => String(fbs('Promo', 'Binder interface: Promo')),
  'Public name': () => String(fbs('Public name', 'Binder interface: Public name')),
  Purchased: () => String(fbs('Purchased', 'Binder interface: Purchased')),
  Purple: () => String(fbs('Purple', 'Binder interface: Purple')),
  'Radiant Rare': () => String(fbs('Radiant Rare', 'Binder interface: Radiant Rare')),
  'Rainbow Rare': () => String(fbs('Rainbow Rare', 'Binder interface: Rainbow Rare')),
  Rare: () => String(fbs('Rare', 'Binder interface: Rare')),
  'Rare BREAK': () => String(fbs('Rare BREAK', 'Binder interface: Rare BREAK')),
  'Rare Holo EX': () => String(fbs('Rare Holo EX', 'Binder interface: Rare Holo EX')),
  'Rare Holo ex': () => String(fbs('Rare Holo ex', 'Binder interface: Rare Holo ex')),
  'Rare Holo GX': () => String(fbs('Rare Holo GX', 'Binder interface: Rare Holo GX')),
  'Rare Holo LV.X': () => String(fbs('Rare Holo LV.X', 'Binder interface: Rare Holo LV.X')),
  'Rare Holo Star': () => String(fbs('Rare Holo Star', 'Binder interface: Rare Holo Star')),
  'Rare Holo V': () => String(fbs('Rare Holo V', 'Binder interface: Rare Holo V')),
  'Rare Holo VMAX': () => String(fbs('Rare Holo VMAX', 'Binder interface: Rare Holo VMAX')),
  'Rare Holo VSTAR': () => String(fbs('Rare Holo VSTAR', 'Binder interface: Rare Holo VSTAR')),
  'Rare Prime': () => String(fbs('Rare Prime', 'Binder interface: Rare Prime')),
  'Rare Shining': () => String(fbs('Rare Shining', 'Binder interface: Rare Shining')),
  'Rare Shiny': () => String(fbs('Rare Shiny', 'Binder interface: Rare Shiny')),
  'Rare Shiny GX': () => String(fbs('Rare Shiny GX', 'Binder interface: Rare Shiny GX')),
  'Read-only link': () => String(fbs('Read-only link', 'Binder interface: Read-only link')),
  'Read collection': () => String(fbs('Read collection', 'Binder interface: Read collection')),
  Red: () => String(fbs('Red', 'Binder interface: Red')),
  Refresh: () => String(fbs('Refresh', 'Binder interface: Refresh')),
  Reload: () => String(fbs('Reload', 'Binder interface: Reload')),
  'Remove from binder': () =>
    String(fbs('Remove from binder', 'Binder interface: Remove from binder')),
  'Remove page': () => String(fbs('Remove page', 'Binder interface: Remove page')),
  'Remove this empty page?': () =>
    String(fbs('Remove this empty page?', 'Binder interface: Remove this empty page?')),
  Replace: () => String(fbs('Replace', 'Binder interface: Replace')),
  'Replace card': () => String(fbs('Replace card', 'Binder interface: Replace card')),
  'Request a new link': () =>
    String(fbs('Request a new link', 'Binder interface: Request a new link')),
  'Reset password': () => String(fbs('Reset password', 'Binder interface: Reset password')),
  'Reset your Pocket Folio password': () =>
    String(
      fbs('Reset your Pocket Folio password', 'Binder interface: Reset your Pocket Folio password'),
    ),
  'Retention and deletion': () =>
    String(fbs('Retention and deletion', 'Binder interface: Retention and deletion')),
  Retry: () => String(fbs('Retry', 'Binder interface: Retry')),
  Revoke: () => String(fbs('Revoke', 'Binder interface: Revoke')),
  Revoked: () => String(fbs('Revoked', 'Binder interface: Revoked')),
  'RGB Rare': () => String(fbs('RGB Rare', 'Binder interface: RGB Rare')),
  'Save changes': () => String(fbs('Save changes', 'Binder interface: Save changes')),
  'Save password': () => String(fbs('Save password', 'Binder interface: Save password')),
  'Save settings': () => String(fbs('Save settings', 'Binder interface: Save settings')),
  'Save your key now': () =>
    String(fbs('Save your key now', 'Binder interface: Save your key now')),
  'Saving…': () => String(fbs('Saving…', 'Binder interface: Saving…')),
  'Saving link…': () => String(fbs('Saving link…', 'Binder interface: Saving link…')),
  'Scope and operator': () =>
    String(fbs('Scope and operator', 'Binder interface: Scope and operator')),
  'Search all cards': () => String(fbs('Search all cards', 'Binder interface: Search all cards')),
  'Search all sets': () => String(fbs('Search all sets', 'Binder interface: Search all sets')),
  'Search by name or number': () =>
    String(fbs('Search by name or number', 'Binder interface: Search by name or number')),
  'Search cards by name or number': () =>
    String(
      fbs('Search cards by name or number', 'Binder interface: Search cards by name or number'),
    ),
  'Search names or numbers': () =>
    String(fbs('Search names or numbers', 'Binder interface: Search names or numbers')),
  'Secret Rare': () => String(fbs('Secret Rare', 'Binder interface: Secret Rare')),
  'Sending…': () => String(fbs('Sending…', 'Binder interface: Sending…')),
  'Send reset link': () => String(fbs('Send reset link', 'Binder interface: Send reset link')),
  'Send verification email': () =>
    String(fbs('Send verification email', 'Binder interface: Send verification email')),
  Sets: () => String(fbs('Sets', 'Binder interface: Sets')),
  Settings: () => String(fbs('Settings', 'Binder interface: Settings')),
  'Setup guide': () => String(fbs('Setup guide', 'Binder interface: Setup guide')),
  Share: () => String(fbs('Share', 'Binder interface: Share')),
  'Share profile': () => String(fbs('Share profile', 'Binder interface: Share profile')),
  'Sharing and agents': () =>
    String(fbs('Sharing and agents', 'Binder interface: Sharing and agents')),
  'Shiny Rare': () => String(fbs('Shiny Rare', 'Binder interface: Shiny Rare')),
  'Shiny Super Rare': () => String(fbs('Shiny Super Rare', 'Binder interface: Shiny Super Rare')),
  'Shiny Ultra Rare': () => String(fbs('Shiny Ultra Rare', 'Binder interface: Shiny Ultra Rare')),
  'Show all cards in full color': () =>
    String(fbs('Show all cards in full color', 'Binder interface: Show all cards in full color')),
  'Show missing artwork in binders': () =>
    String(
      fbs('Show missing artwork in binders', 'Binder interface: Show missing artwork in binders'),
    ),
  'Show more cards': () => String(fbs('Show more cards', 'Binder interface: Show more cards')),
  'Show my binders and the cards I still need.': () =>
    String(
      fbs(
        'Show my binders and the cards I still need.',
        'Binder interface: Show my binders and the cards I still need.',
      ),
    ),
  'Show ownership': () => String(fbs('Show ownership', 'Binder interface: Show ownership')),
  'Side-loading': () => String(fbs('Side-loading', 'Binder interface: Side-loading')),
  'Sign in': () => String(fbs('Sign in', 'Binder interface: Sign in')),
  'Signing out\u2026': () =>
    String(fbs('Signing out\u2026', 'Binder interface: Signing out\u2026')),
  'Sign in to edit a collection.': () =>
    String(fbs('Sign in to edit a collection.', 'Binder interface: Sign in to edit a collection.')),
  'Sign in to manage API keys': () =>
    String(fbs('Sign in to manage API keys', 'Binder interface: Sign in to manage API keys')),
  'Sign in with your new password. Your other sessions have been signed out.': () =>
    String(
      fbs(
        'Sign in with your new password. Your other sessions have been signed out.',
        'Binder interface: Sign in with your new password. Your other sessions have been signed out.',
      ),
    ),
  'Sign out': () => String(fbs('Sign out', 'Binder interface: Sign out')),
  Silver: () => String(fbs('Silver', 'Binder interface: Silver')),
  'Special Art Rare': () => String(fbs('Special Art Rare', 'Binder interface: Special Art Rare')),
  'Special Illustration Rare': () =>
    String(fbs('Special Illustration Rare', 'Binder interface: Special Illustration Rare')),
  'Start with': () => String(fbs('Start with', 'Binder interface: Start with')),
  'Stop sharing': () => String(fbs('Stop sharing', 'Binder interface: Stop sharing')),
  'Super Rare': () => String(fbs('Super Rare', 'Binder interface: Super Rare')),
  Swap: () => String(fbs('Swap', 'Binder interface: Swap')),
  'Syncing…': () => String(fbs('Syncing…', 'Binder interface: Syncing…')),
  Teal: () => String(fbs('Teal', 'Binder interface: Teal')),
  Terracotta: () => String(fbs('Terracotta', 'Binder interface: Terracotta')),
  'Thank you to everyone who documents, scans, and preserves these cards.': () =>
    String(
      fbs(
        'Thank you to everyone who documents, scans, and preserves these cards.',
        'Binder interface: Thank you to everyone who documents, scans, and preserves these cards.',
      ),
    ),
  'THE COLLECTION': () => String(fbs('THE COLLECTION', 'Binder interface: THE COLLECTION')),
  'The combined collection is too large to import.': () =>
    String(
      fbs(
        'The combined collection is too large to import.',
        'Binder interface: The combined collection is too large to import.',
      ),
    ),
  'The MIT license covers our code, not third-party card artwork, scans, logos, or sourced card data. Those materials remain subject to their own rights and terms.':
    () =>
      String(
        fbs(
          'The MIT license covers our code, not third-party card artwork, scans, logos, or sourced card data. Those materials remain subject to their own rights and terms.',
          'Binder interface: The MIT license covers our code, not third-party card artwork, scans, logos, or sourced card data. Those materials remain subject to their own rights and terms.',
        ),
      ),
  'Thinking…': () => String(fbs('Thinking…', 'Binder interface: Thinking…')),
  'This backup includes cards or sets that are not available in this app.': () =>
    String(
      fbs(
        'This backup includes cards or sets that are not available in this app.',
        'Binder interface: This backup includes cards or sets that are not available in this app.',
      ),
    ),
  'This binder changed. Reopen the page picker before removing a page.': () =>
    String(
      fbs(
        'This binder changed. Reopen the page picker before removing a page.',
        'Binder interface: This binder changed. Reopen the page picker before removing a page.',
      ),
    ),
  'This cannot be undone. Shared links will stop working and all devices will be signed out.': () =>
    String(
      fbs(
        'This cannot be undone. Shared links will stop working and all devices will be signed out.',
        'Binder interface: This cannot be undone. Shared links will stop working and all devices will be signed out.',
      ),
    ),
  'This collection is already up to date.': () =>
    String(
      fbs(
        'This collection is already up to date.',
        'Binder interface: This collection is already up to date.',
      ),
    ),
  'This file is not a supported collection export.': () =>
    String(
      fbs(
        'This file is not a supported collection export.',
        'Binder interface: This file is not a supported collection export.',
      ),
    ),
  'This file is not valid JSON. Choose a Pocket Folio collection export.': () =>
    String(
      fbs(
        'This file is not valid JSON. Choose a Pocket Folio collection export.',
        'Binder interface: This file is not valid JSON. Choose a Pocket Folio collection export.',
      ),
    ),
  'This is the only time the full key is shown. Enter it in the CLI’s hidden prompt; don’t paste it into a chat or commit it.':
    () =>
      String(
        fbs(
          'This is the only time the full key is shown. Enter it in the CLI’s hidden prompt; don’t paste it into a chat or commit it.',
          'Binder interface: This is the only time the full key is shown. Enter it in the CLI’s hidden prompt; don’t paste it into a chat or commit it.',
        ),
      ),
  'This link has expired or has already been used.': () =>
    String(
      fbs(
        'This link has expired or has already been used.',
        'Binder interface: This link has expired or has already been used.',
      ),
    ),
  'This policy applies only to Pocket Folio at folio.nakazawa.tech and its hosted API, operated by Nakazawa Tech KK in Tokyo, Japan. It does not apply to local installations, forks, or independently hosted copies. Their operators are responsible for their own data practices.':
    () =>
      String(
        fbs(
          'This policy applies only to Pocket Folio at folio.nakazawa.tech and its hosted API, operated by Nakazawa Tech KK in Tokyo, Japan. It does not apply to local installations, forks, or independently hosted copies. Their operators are responsible for their own data practices.',
          'Binder interface: This policy applies only to Pocket Folio at folio.nakazawa.tech and its hosted API, operated by Nakazawa Tech KK in Tokyo, Japan. It does not apply to local installations, forks, or independently hosted copies. Their operators are responsible for their own data practices.',
        ),
      ),
  'This verification link is invalid or expired. Request a new one in Settings.': () =>
    String(
      fbs(
        'This verification link is invalid or expired. Request a new one in Settings.',
        'Binder interface: This verification link is invalid or expired. Request a new one in Settings.',
      ),
    ),
  'Top-loading': () => String(fbs('Top-loading', 'Binder interface: Top-loading')),
  'Trainer Gallery Rare Holo': () =>
    String(fbs('Trainer Gallery Rare Holo', 'Binder interface: Trainer Gallery Rare Holo')),
  'Triple Rare': () => String(fbs('Triple Rare', 'Binder interface: Triple Rare')),
  'Ultra Rare': () => String(fbs('Ultra Rare', 'Binder interface: Ultra Rare')),
  'Unable to sign out. Please try again.': () =>
    String(
      fbs(
        'Unable to sign out. Please try again.',
        'Binder interface: Unable to sign out. Please try again.',
      ),
    ),
  Uncommon: () => String(fbs('Uncommon', 'Binder interface: Uncommon')),
  Unlimited: () => String(fbs('Unlimited', 'Binder interface: Unlimited')),
  Unnumbered: () => String(fbs('Unnumbered', 'Binder interface: Unnumbered')),
  Unspecified: () => String(fbs('Unspecified', 'Binder interface: Unspecified')),
  updated: () => String(fbs('updated', 'Binder interface: updated')),
  'Use a local terminal agent with Node.js 24 or newer. Your API key stays in your OS credential store.':
    () =>
      String(
        fbs(
          'Use a local terminal agent with Node.js 24 or newer. Your API key stays in your OS credential store.',
          'Binder interface: Use a local terminal agent with Node.js 24 or newer. Your API key stays in your OS credential store.',
        ),
      ),
  'Use at least 10 characters.': () =>
    String(fbs('Use at least 10 characters.', 'Binder interface: Use at least 10 characters.')),
  'Use Pocket Folio at': () =>
    String(fbs('Use Pocket Folio at', 'Binder interface: Use Pocket Folio at')),
  'Use set artwork for cover': () =>
    String(fbs('Use set artwork for cover', 'Binder interface: Use set artwork for cover')),
  'Use this link to choose a new password. It expires in 30 minutes.': () =>
    String(
      fbs(
        'Use this link to choose a new password. It expires in 30 minutes.',
        'Binder interface: Use this link to choose a new password. It expires in 30 minutes.',
      ),
    ),
  'Use this link to verify your email address. It expires in 24 hours.': () =>
    String(
      fbs(
        'Use this link to verify your email address. It expires in 24 hours.',
        'Binder interface: Use this link to verify your email address. It expires in 24 hours.',
      ),
    ),
  'Verification email sent': () =>
    String(fbs('Verification email sent', 'Binder interface: Verification email sent')),
  Verified: () => String(fbs('Verified', 'Binder interface: Verified')),
  'Verify your email': () =>
    String(fbs('Verify your email', 'Binder interface: Verify your email')),
  'Verify your email before creating or using API keys.': () =>
    String(
      fbs(
        'Verify your email before creating or using API keys.',
        'Binder interface: Verify your email before creating or using API keys.',
      ),
    ),
  'Verify your Pocket Folio email': () =>
    String(
      fbs('Verify your Pocket Folio email', 'Binder interface: Verify your Pocket Folio email'),
    ),
  View: () => String(fbs('View', 'Binder interface: View')),
  'View profile': () => String(fbs('View profile', 'Binder interface: View profile')),
  'We keep account and collection data while your account exists. Settings → Account lets you export your collection or delete your account. Deletion removes your hosted binders, ownership records, share links, sessions, API keys, and agent history. It also clears the active account’s collection cache in the browser used to delete it. Copies on other devices and downloaded exports are not remotely erased.':
    () =>
      String(
        fbs(
          'We keep account and collection data while your account exists. Settings → Account lets you export your collection or delete your account. Deletion removes your hosted binders, ownership records, share links, sessions, API keys, and agent history. It also clears the active account’s collection cache in the browser used to delete it. Copies on other devices and downloaded exports are not remotely erased.',
          'Binder interface: We keep account and collection data while your account exists. Settings → Account lets you export your collection or delete your account. Deletion removes your hosted binders, ownership records, share links, sessions, API keys, and agent history. It also clears the active account’s collection cache in the browser used to delete it. Copies on other devices and downloaded exports are not remotely erased.',
        ),
      ),
  'We store your name, email address, password hash, binders, card statuses, sharing preferences, and API-key permissions and activity. Sessions include technical information such as IP addresses and browser details. We store API-key hashes rather than the original keys. Hosting and email delivery also generate operational records.':
    () =>
      String(
        fbs(
          'We store your name, email address, password hash, binders, card statuses, sharing preferences, and API-key permissions and activity. Sessions include technical information such as IP addresses and browser details. We store API-key hashes rather than the original keys. Hosting and email delivery also generate operational records.',
          'Binder interface: We store your name, email address, password hash, binders, card statuses, sharing preferences, and API-key permissions and activity. Sessions include technical information such as IP addresses and browser details. We store API-key hashes rather than the original keys. Hosting and email delivery also generate operational records.',
        ),
      ),
  'We use this information to provide accounts, sync collections, share binders when you ask us to, deliver account emails, provide support, and prevent abuse. We do not sell personal information, run advertising, or use advertising trackers.':
    () =>
      String(
        fbs(
          'We use this information to provide accounts, sync collections, share binders when you ask us to, deliver account emails, provide support, and prevent abuse. We do not sell personal information, run advertising, or use advertising trackers.',
          'Binder interface: We use this information to provide accounts, sync collections, share binders when you ask us to, deliver account emails, provide support, and prevent abuse. We do not sell personal information, run advertising, or use advertising trackers.',
        ),
      ),
  'We will publish changes on this page and update the date below. For material changes affecting existing users, we will provide notice through the app or email.':
    () =>
      String(
        fbs(
          'We will publish changes on this page and update the date below. For material changes affecting existing users, we will provide notice through the app or email.',
          'Binder interface: We will publish changes on this page and update the date below. For material changes affecting existing users, we will provide notice through the app or email.',
        ),
      ),
  'Where a legal basis is required, we process data to provide the service you request, protect the service and its users, comply with legal obligations, or with consent where applicable. We operate in Japan and our providers may process data in other countries. Contact us for information about international processing and applicable safeguards.':
    () =>
      String(
        fbs(
          'Where a legal basis is required, we process data to provide the service you request, protect the service and its users, comply with legal obligations, or with consent where applicable. We operate in Japan and our providers may process data in other countries. Contact us for information about international processing and applicable safeguards.',
          'Binder interface: Where a legal basis is required, we process data to provide the service you request, protect the service and its users, comply with legal obligations, or with consent where applicable. We operate in Japan and our providers may process data in other countries. Contact us for information about international processing and applicable safeguards.',
        ),
      ),
  Wishlist: () => String(fbs('Wishlist', 'Binder interface: Wishlist')),
  'You’re signed in': () => String(fbs('You’re signed in', 'Binder interface: You’re signed in')),
  'You can browse cards without an account, disable sharing, revoke API keys, export your collection, and delete your account. Depending on applicable law, you may also request access, correction, deletion, portability, or restrictions on processing, object to processing, and complain to a data protection authority. Contact us for help with these requests.':
    () =>
      String(
        fbs(
          'You can browse cards without an account, disable sharing, revoke API keys, export your collection, and delete your account. Depending on applicable law, you may also request access, correction, deletion, portability, or restrictions on processing, object to processing, and complain to a data protection authority. Contact us for help with these requests.',
          'Binder interface: You can browse cards without an account, disable sharing, revoke API keys, export your collection, and delete your account. Depending on applicable law, you may also request access, correction, deletion, portability, or restrictions on processing, object to processing, and complain to a data protection authority. Contact us for help with these requests.',
        ),
      ),
  'Your binders': () => String(fbs('Your binders', 'Binder interface: Your binders')),
  'Your card binder': () => String(fbs('Your card binder', 'Binder interface: Your card binder')),
  'Your choices and rights': () =>
    String(fbs('Your choices and rights', 'Binder interface: Your choices and rights')),
  'Your email address is confirmed.': () =>
    String(
      fbs('Your email address is confirmed.', 'Binder interface: Your email address is confirmed.'),
    ),
  'Your session changed. Reload to continue. Unsynced edits are saved for your original account.':
    () =>
      String(
        fbs(
          'Your session changed. Reload to continue. Unsynced edits are saved for your original account.',
          'Binder interface: Your session changed. Reload to continue. Unsynced edits are saved for your original account.',
        ),
      ),
};
export const text = (message: string): string => messages[message]?.() ?? message;
