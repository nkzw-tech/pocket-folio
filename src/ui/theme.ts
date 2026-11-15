import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';

// One control scale throughout Pocket Folio: 32 compact, 44 default, 48 large.
// Astryx spacing steps already represent multiples of four; avoid half steps.
export const pocketFolioTheme = defineTheme({
  extends: neutralTheme,
  name: 'pocket-folio',
  tokens: {
    '--focus-outline-offset': '4px',
    '--font-family-body': 'var(--font-sans)',
    '--font-family-heading': 'var(--font-sans)',
    '--radius-container': '24px',
    '--radius-element': '16px',
    '--radius-page': '32px',
    '--size-element-lg': '48px',
    '--size-element-md': '44px',
    '--size-element-sm': '32px',
  },
});
