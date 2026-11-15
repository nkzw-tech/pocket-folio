import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('card asset hosting', () => {
  it('keeps development images local', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_CARD_ASSET_BASE_URL', undefined);
    const { cardAssetURL } = await import('../src/card-assets');
    expect(cardAssetURL('/cards/vs/094.webp')).toBe('/cards/vs/094.webp');
  });

  it('loads production artwork from R2 without changing routes or card details', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_CARD_ASSET_BASE_URL', undefined);
    const { cardAssetURL } = await import('../src/card-assets');
    for (const path of ['/cards/vs/094.webp', '/energy/fire.png', '/set-logos/base1.webp']) {
      expect(cardAssetURL(path)).toBe(`https://assets.folio.nakazawa.tech${path}`);
    }
    for (const path of ['/cards', '/card-details/ja-m1l.json', 'https://example.com/image.webp']) {
      expect(cardAssetURL(path)).toBe(path);
    }
  });

  it('allows forks to select their own asset host', async () => {
    vi.stubEnv('VITE_CARD_ASSET_BASE_URL', 'https://images.example.com/');
    const { cardAssetURL } = await import('../src/card-assets');
    expect(cardAssetURL('/cards/vs/094.webp')).toBe('https://images.example.com/cards/vs/094.webp');
  });
});
