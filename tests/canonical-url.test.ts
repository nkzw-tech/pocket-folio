import { describe, expect, it } from 'vitest';
import { canonicalPageURL } from '../src/server/canonical-url';

describe('canonical domain', () => {
  it('preserves shared links, page state and encoded query values', () => {
    expect(
      canonicalPageURL(
        'https://pkmn.nakazawa.tech/b/shared-token?page=3&expanded=1&q=a%26b',
        'GET',
      ),
    ).toBe('https://folio.nakazawa.tech/b/shared-token?page=3&expanded=1&q=a%26b');
    expect(canonicalPageURL('http://pkmn.nakazawa.tech:80/p/profile', 'HEAD')).toBe(
      'https://folio.nakazawa.tech/p/profile',
    );
  });
  it('does not redirect local, canonical or unrelated hosts', () => {
    for (const origin of [
      'http://127.0.0.1:5217',
      'https://folio.nakazawa.tech',
      'https://pkmn.nakazawa.tech.example.com',
    ]) {
      expect(canonicalPageURL(`${origin}/sets`, 'GET')).toBeNull();
    }
  });
  it('preserves old API origins and never redirects writes', () => {
    for (const path of ['/api', '/api/v1/collection', '/api/auth/verify-email?token=test']) {
      expect(canonicalPageURL(`https://pkmn.nakazawa.tech${path}`, 'GET')).toBeNull();
    }
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']) {
      expect(canonicalPageURL('https://pkmn.nakazawa.tech/settings', method)).toBeNull();
    }
  });
});
