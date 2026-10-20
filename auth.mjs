export const CLIENT_ID = '89120c42b9964a59b878859177c8ef1e';
// Preserve the redirect URI already registered by the original application.
export const REDIRECT_URI = 'https://mattlane66.github.io/ShuffleSpot';
const KEY = 'shufflespot-pkce';
const MAX_AGE = 10 * 60 * 1000;

export function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function beginAuthorization({ crypto, storage, now = Date.now(), redirectUri = REDIRECT_URI }) {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  storage.setItem(KEY, JSON.stringify({ verifier, state, created: now, redirectUri }));
  const url = new URL('https://accounts.spotify.com/authorize');
  url.search = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', redirect_uri: redirectUri,
    scope: 'user-follow-read', state, code_challenge_method: 'S256', code_challenge: challenge });
  return url.href;
}

export async function completeAuthorization({ search, crypto, storage, fetch, now = Date.now() }) {
  const params = new URLSearchParams(search);
  if (!params.has('code') && !params.has('error')) return null;
  const saved = storage.getItem(KEY);
  storage.removeItem(KEY); // Each authorization attempt is single-use, including failures.
  let pending;
  try { pending = JSON.parse(saved); } catch { throw new Error('This sign-in attempt has expired. Please sign in again.'); }
  if (!pending || !params.get('state') || params.get('state') !== pending.state ||
      typeof pending.created !== 'number' || now < pending.created || now - pending.created > MAX_AGE ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(pending.verifier || '')) {
    throw new Error('This sign-in attempt could not be verified. Please sign in again.');
  }
  if (params.has('error')) throw new Error('Spotify authorization was not completed. Please try signing in again.');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, grant_type: 'authorization_code', code: params.get('code'),
      redirect_uri: pending.redirectUri, code_verifier: pending.verifier }),
  });
  if (!response.ok) throw new Error('Spotify could not complete sign-in. Please try again.');
  const token = await response.json();
  if (!token.access_token || String(token.token_type).toLowerCase() !== 'bearer') throw new Error('Spotify returned an invalid sign-in response.');
  return token.access_token; // Kept in memory only; never persisted or logged.
}
