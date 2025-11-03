/*
  Reads environment variables and generates an auth config for the IDE, outputs to STDOUT
  see ../DEVELOPMENT.md
*/

const path = require("node:path")

try {
  // Look for a .env file to load
  const dotenv = require("dotenv")
  dotenv.config({
    path: [
      // First match wins
      path.resolve(process.cwd(), '.env'), // current working dir
      path.resolve(__dirname, '.env'), // build-scripts dir
      path.resolve(__dirname, '..', '.env'), // ide package
      path.resolve(__dirname, '../../..', '.env'), // root package

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
  const ccmUrl = new URL(process.env.CFS_API_URL);
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
  if (process.env.CI) {
    console.error('Could not read environment variables for IDE auth config:', err.message);
    console.error('See packages/ide/DEVELOPMENT.md for configuration instructions');
    process.exit(1);
  } else {
    console.warn('Could not read environment variables for IDE auth config:', err.message);
    console.warn('Login commands and non-public data will not be available');
    console.warn('See packages/ide/DEVELOPMENT.md for configuration instructions');
    process.exit(0);
  }
}
