# ShuffleSpot

Shuffle the artists you follow on Spotify by genre, and play track previews when Spotify provides them.

Sign-in uses Authorization Code with PKCE (S256), a random single-use state value, and a ten-minute authorization timeout. Access tokens stay in memory and callback codes are removed from the URL. No client secret or contact form is required.

The existing Spotify application ID and registered HTTPS redirect URI are preserved. Spotify app access and endpoint availability remain subject to the owner’s Developer Dashboard configuration and Spotify account eligibility.

Run `node --test auth.test.mjs` to verify the authorization protocol.
