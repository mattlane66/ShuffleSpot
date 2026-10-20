import { beginAuthorization, completeAuthorization } from './auth.mjs';

const login = document.querySelector('#login-screen');
const loginButton = document.querySelector('#spotify-login');
const status = document.querySelector('#status');
const genreContainer = document.querySelector('#genre-container');
const player = document.querySelector('#player-container');
let token;
let groupedArtists = {};
let selection = 0;
const genres = ['jazz', 'fusion', 'classical', 'baroque', 'opera', 'blues', 'bluegrass', 'indie', 'asian',
  'avant garde', 'singer songwriter', 'alternative', 'caribbean', 'folk', 'indian', 'tribal', 'african',
  'rock', 'punk', 'dance', 'latin', 'progressive', 'metal', 'hip hop', 'soul', 'world', 'reggae',
  'brazilian', 'country', 'electronic', 'pop', 'funk', 'comedy', 'spoken word'];

function message(text) { status.textContent = text; }
function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}
function element(tag, text, className) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (className) el.className = className;
  return el;
}
async function spotify(path) {
  const url = new URL(path, 'https://api.spotify.com');
  if (url.origin !== 'https://api.spotify.com') throw new Error('Unexpected Spotify response.');
  const response = await fetch(url.href, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401) { token = null; login.hidden = false; throw new Error('Your Spotify session expired. Please sign in again.'); }
  if (response.status === 403) throw new Error('Spotify does not permit this request for this app or account. Check the app’s Spotify access settings.');
  if (response.status === 429) throw new Error('Spotify is receiving too many requests. Please try again shortly.');
  if (!response.ok) throw new Error('Spotify could not load your music. Please try again.');
  return response.json();
}
async function loadArtists() {
  message('Loading artists you follow…');
  const artists = [];
  let next = '/v1/me/following?type=artist&limit=50';
  while (next) {
    const data = await spotify(next);
    artists.push(...(data.artists?.items || []));
    next = data.artists?.next;
  }
  groupedArtists = {};
  for (const artist of artists) {
    const genre = genres.find(g => (artist.genres || []).some(value => value.toLowerCase().includes(g))) || 'undetermined';
    (groupedArtists[genre] ||= []).push(artist);
  }
  genreContainer.replaceChildren();
  for (const genre of Object.keys(groupedArtists).sort()) {
    const button = element('button', '', 'square');
    button.type = 'button'; button.dataset.genre = genre;
    button.append(element('span', genre, 'content'));
    button.addEventListener('click', () => playGenre(genre));
    genreContainer.append(button);
  }
  message(artists.length ? 'Choose a genre to shuffle your followed artists.' : 'You are not following any artists on Spotify yet.');
}
async function playGenre(genre) {
  const request = ++selection;
  message(`Loading ${genre}…`);
  const artists = groupedArtists[genre];
  const artist = artists[Math.floor(Math.random() * artists.length)];
  try {
    const data = await spotify(`/v1/artists/${encodeURIComponent(artist.id)}/top-tracks?market=US`);
    if (request !== selection) return;
    const tracks = data.tracks || [];
    const playable = tracks.filter(track => safeUrl(track.preview_url));
    const track = (playable.length ? playable : tracks)[Math.floor(Math.random() * (playable.length || tracks.length))];
    player.replaceChildren();
    const close = element('button', 'Close player', 'player-close'); close.type = 'button';
    close.addEventListener('click', () => { ++selection; player.querySelector('audio')?.pause(); player.style.display = 'none'; });
    player.append(close, element('h4', artist.name));
    const imageUrl = safeUrl(artist.images?.[0]?.url);
    if (imageUrl) { const image = element('img'); image.src = imageUrl; image.alt = artist.name; image.width = 150; player.append(image); }
    if (track) {
      player.append(element('p', track.name));
      const preview = safeUrl(track.preview_url);
      if (preview) {
        const audio = element('audio'); audio.controls = true; audio.src = preview;
        audio.addEventListener('ended', () => playGenre(genre)); player.append(audio);
        audio.play().catch(() => message('Press play to hear this preview.'));
      } else { player.append(element('p', 'Spotify does not provide a preview for this track. Open it in Spotify to listen.')); }
    } else { player.append(element('p', 'Spotify did not return tracks for this artist.')); }
    const external = safeUrl(track?.external_urls?.spotify || artist.external_urls?.spotify);
    if (external && new URL(external).hostname === 'open.spotify.com') {
      const link = element('a', 'Open in Spotify'); link.href = external; link.target = '_blank'; link.rel = 'noopener noreferrer'; player.append(link);
    }
    player.style.display = 'block'; player.style.bottom = '0';
    message(`Shuffling ${genre}. Choose the genre again for another artist.`);
  } catch (error) { message(error.message); }
}
loginButton.addEventListener('click', async event => {
  event.preventDefault(); loginButton.disabled = true;
  try { location.assign(await beginAuthorization({ crypto, storage: sessionStorage })); }
  catch { message('Secure sign-in could not start. Allow session storage and use an HTTPS browser.'); loginButton.disabled = false; }
});
try {
  const search = location.search;
  // Remove callback codes and legacy fragment tokens before further requests or errors.
  if (search || location.hash) history.replaceState(null, '', location.pathname);
  token = await completeAuthorization({ search, crypto, storage: sessionStorage, fetch });
  if (token) { login.hidden = true; await loadArtists(); }
} catch (error) { message(error.message); }
