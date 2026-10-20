import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { beginAuthorization, completeAuthorization, REDIRECT_URI } from './auth.mjs';
function storage() { const values = new Map(); return { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) }; }
async function attempt() { const store = storage(); const url = new URL(await beginAuthorization({ crypto: webcrypto, storage: store, now: 1000 })); return { store, url }; }
test('authorization uses PKCE S256, random state, and the existing redirect URI', async () => {
  const { store, url } = await attempt(); const saved = JSON.parse(store.getItem('shufflespot-pkce'));
  assert.equal(url.searchParams.get('response_type'), 'code'); assert.equal(url.searchParams.get('redirect_uri'), REDIRECT_URI);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256'); assert.equal(saved.verifier.length, 43);
  assert.notEqual(url.searchParams.get('code_challenge'), saved.verifier); assert.equal(url.searchParams.get('state'), saved.state);
  assert.notEqual((await attempt()).url.searchParams.get('state'), saved.state);
});
test('valid callback exchanges the code once without persisting the access token', async () => {
  const { store, url } = await attempt(); let calls = 0;
  const args = { storage: store, now: 2000, search: '?code=fixture&state='+url.searchParams.get('state'), fetch: async (target, options) => {
    calls++; assert.equal(target, 'https://accounts.spotify.com/api/token'); assert.equal(options.method, 'POST');
    assert.equal(options.body.get('grant_type'), 'authorization_code'); assert.equal(options.body.get('redirect_uri'), REDIRECT_URI);
    assert.ok(options.body.get('code_verifier')); assert.equal(options.body.has('client_secret'), false);
    return { ok: true, json: async () => ({ access_token: 'fixture-token', token_type: 'Bearer' }) };
  }};
  assert.equal(await completeAuthorization(args), 'fixture-token'); assert.equal(calls, 1); assert.equal(store.getItem('shufflespot-pkce'), null);
  await assert.rejects(completeAuthorization(args)); assert.equal(calls, 1);
});
for (const failure of ['wrong-state','missing-state','expired','clock-rollback','denied']) test('rejects '+failure+' before exchanging tokens', async () => {
  const { store, url } = await attempt(); let calls = 0;
  const state = failure === 'wrong-state' ? 'other' : url.searchParams.get('state');
  let search = (failure === 'denied' ? '?error=access_denied' : '?code=fixture') + (failure === 'missing-state' ? '' : '&state='+state);
  await assert.rejects(completeAuthorization({ storage: store, search, now: failure === 'expired' ? 999999 : failure === 'clock-rollback' ? 0 : 2000, fetch: async () => { calls++; } }));
  assert.equal(calls, 0); assert.equal(store.getItem('shufflespot-pkce'), null);
});
test('no callback does not make requests', async () => { assert.equal(await completeAuthorization({ storage: storage(), search: '', fetch: () => { throw Error('unexpected fetch'); } }), null); });
