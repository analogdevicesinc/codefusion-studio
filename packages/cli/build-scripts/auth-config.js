/*
  Reads environment variables and generates an auth config for the CLI, outputs to STDOUT
  see ../DEVELOPMENT.md
*/

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const dotenv = await import('dotenv');
	// Look for a .env file to load
	dotenv.config({
    path: [
        // First match wins
        path.resolve(process.cwd(), '.env'), // cwd
        path.resolve(dirname, '..', '.env'), // this package
        path.resolve(dirname, '../../..', '.env'), // root package
    ],
	});
} catch {
  // dotenv may not be available outside of dev environment
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
	console.debug(err);
	console.error('Could not read environment variables for CLI auth config:', err.message);
	console.error('See packages/cli/DEVELOPMENT.md for configuration instructions');
	process.exit(1);
}
