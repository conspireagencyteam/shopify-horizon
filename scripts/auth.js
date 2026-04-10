/**
 * OAuth helper for Shopify Dev Dashboard apps.
 *
 * Flow:
 *   1. Opens browser to Shopify OAuth consent screen
 *   2. Merchant clicks "Install" / "Approve"
 *   3. Shopify redirects to local callback server
 *   4. We exchange the code for an offline access token
 *   5. Token is saved to scripts/.token for reuse
 *
 * Re-running skips OAuth if a valid token already exists.
 */

import { createServer } from 'node:http';
import { URL, URLSearchParams } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import open from 'open';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = resolve(__dirname, '.token');
const CALLBACK_PORT = 3456;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

const SCOPES = [
  'read_products',
  'write_products',
  'write_metaobject_definitions',
  'read_metaobject_definitions',
  'write_metaobjects',
  'read_metaobjects',
  'write_files',
  'read_files',
].join(',');

/**
 * Returns a valid access token, running OAuth if needed.
 */
export async function getAccessToken(storeUrl, apiKey, apiSecret) {
  // Try saved token first
  if (existsSync(TOKEN_FILE)) {
    const saved = JSON.parse(readFileSync(TOKEN_FILE, 'utf-8'));
    if (saved.store === storeUrl && saved.token) {
      // Quick validation
      const valid = await testToken(storeUrl, saved.token);
      if (valid) {
        console.log('Using saved access token.');
        return saved.token;
      }
      console.log('Saved token expired or invalid, re-authenticating...');
    }
  }

  // Run OAuth flow
  const token = await runOAuthFlow(storeUrl, apiKey, apiSecret);

  // Save for reuse
  writeFileSync(TOKEN_FILE, JSON.stringify({ store: storeUrl, token }, null, 2));
  console.log('Access token saved to .token');
  return token;
}

async function testToken(storeUrl, token) {
  try {
    const res = await fetch(`https://${storeUrl}/admin/api/2025-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query: '{ shop { name } }' }),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

function runOAuthFlow(storeUrl, apiKey, apiSecret) {
  return new Promise((resolveToken, reject) => {
    const nonce = crypto.randomUUID();

    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      try {
        // Verify HMAC
        const params = url.searchParams;
        const hmac = params.get('hmac');
        const code = params.get('code');
        const state = params.get('state');

        if (state !== nonce) {
          throw new Error('State mismatch — possible CSRF attack');
        }

        // Verify HMAC signature
        const filtered = new URLSearchParams();
        for (const [k, v] of params) {
          if (k !== 'hmac') filtered.append(k, v);
        }
        const message = filtered.toString();
        const expectedHmac = createHmac('sha256', apiSecret).update(message).digest('hex');

        if (hmac !== expectedHmac) {
          throw new Error('HMAC verification failed');
        }

        // Exchange code for access token
        const tokenRes = await fetch(`https://${storeUrl}/admin/oauth/access_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: apiKey,
            client_secret: apiSecret,
            code,
          }),
        });

        if (!tokenRes.ok) {
          const err = await tokenRes.text();
          throw new Error(`Token exchange failed: ${err}`);
        }

        const { access_token } = await tokenRes.json();

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorized!</h1><p>You can close this tab and return to the terminal.</p>');

        server.close();
        resolveToken(access_token);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error</h1><p>${err.message}</p>`);
        server.close();
        reject(err);
      }
    });

    server.listen(CALLBACK_PORT, () => {
      const authUrl =
        `https://${storeUrl}/admin/oauth/authorize?` +
        new URLSearchParams({
          client_id: apiKey,
          scope: SCOPES,
          redirect_uri: REDIRECT_URI,
          state: nonce,
        }).toString();

      console.log(`\nOpening browser for Shopify authorization...`);
      console.log(`If it doesn't open, visit:\n${authUrl}\n`);
      open(authUrl);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth timed out — no callback received within 2 minutes'));
    }, 120_000);
  });
}
