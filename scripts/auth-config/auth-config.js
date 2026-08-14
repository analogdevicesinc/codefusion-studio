/*
  Reads environment variables and generates an auth config for the CLI or IDE, outputs to STDOUT
  see DEVELOPMENT.md
*/

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

try {
  const dotenv = await import('dotenv');
	// Look for a .env file to load
	dotenv.config({
    path: [
        // First match wins
        path.resolve(process.cwd(), '.env'), // current package
        path.resolve(rootDir, '.env'), // root package
    ],
		quiet: true,
	});
} catch {
  // don't fail if dotenv isn't available
}

// Build does not require auth config
if (process.env.CFS_AUTH_SKIP_CONFIG) {
	console.warn('CFS_AUTH_SKIP_CONFIG is set, using empty auth config');
	console.log(JSON.stringify({}, null, 2));
	process.exit(0);
}

try {
	if ([process.env.CFS_AUTH_CALLBACK, process.env.CFS_AUTH_URL, process.env.CFS_API_URL, process.env.CFS_AUTH_CLIENT_ID].some((v) => v === undefined || v.trim() === '')) {
		throw new Error('Missing required environment variable(s): CFS_AUTH_CALLBACK, CFS_AUTH_URL, CFS_API_URL, CFS_AUTH_CLIENT_ID');
	}
	const scopes = process.env.CFS_AUTH_SCOPE?.split(/\s+/).map((scope) => scope.trim()) ?? [];
	const authCallbacks = process.env.CFS_AUTH_CALLBACK.split(/\s+/).map((callback) => new URL(callback));
	const authUrl = new URL(process.env.CFS_AUTH_URL);
	const ccmUrl =  new URL(process.env.CFS_API_URL);
	const clientId = process.env.CFS_AUTH_CLIENT_ID.trim();

	console.log(JSON.stringify({
		scopes,
		authCallbacks,
		authUrl,
		ccmUrl,
		clientId,
	}, null, 2));
} catch (err) {
	console.error('Could not read environment variables for auth config:', err.message ?? err);
	console.error('See DEVELOPMENT.md for configuration instructions');
	if (process.env.CI) {
		process.exit(1);
	}

	// Allow non-CI build to continue
	console.warn('Login commands and non-public data will not be available');
	console.log(JSON.stringify({}, null, 2));
}
