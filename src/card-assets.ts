export const remoteCardAssetBaseURL = 'https://assets.folio.nakazawa.tech';

// Development serves the ignored local cache. Production reads directly from R2.
export const cardAssetBaseURL = (
  import.meta.env?.VITE_CARD_ASSET_BASE_URL ?? (import.meta.env?.DEV ? '' : remoteCardAssetBaseURL)
).replace(/\/$/, '');

export function cardAssetURL(path: string): string {
  return /^\/(cards|set-logos|energy|social)\//.test(path) ? `${cardAssetBaseURL}${path}` : path;
}
