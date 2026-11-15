import type { CSSProperties } from 'react';

export const defaultBinderColor = '#323236';

export function binderColorStyle(color = defaultBinderColor): CSSProperties {
  if (color.toLowerCase() === defaultBinderColor) {
    return {};
  }
  // Match the cover's 78% color mix so light covers can keep their color
  // behind the caption instead of needing a black scrim for white text.
  const channels = [1, 3, 5].map((offset) => {
    const channel = (Number.parseInt(color.slice(offset, offset + 2), 16) / 255) * 0.78;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const lightCover = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 0.18;
  return {
    '--binder-caption-ink': lightCover ? '#141414' : '#f3f3f3',
    '--binder-caption-shadow': lightCover ? '#fff2' : '#0006',
    '--binder-cover': `color-mix(in srgb, ${color} 78%, black)`,
    '--binder-highlight': `color-mix(in srgb, ${color} 90%, white)`,
    '--binder-lining': `color-mix(in srgb, ${color} 30%, black)`,
    '--binder-shadow': `color-mix(in srgb, ${color} 20%, black)`,
  } as CSSProperties;
}
