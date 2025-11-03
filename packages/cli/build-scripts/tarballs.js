import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from "node:url";
import * as util from 'node:util';

// This script adds a "resolutions" stanza to the cli package.json
// so that the monorepo dependencies can be resolved correctly once
// oclif has copied the workspace to the tmp directory.
// Note: the dependencies need to be built first

// Path to the CLI workspace directory
const cliWorkspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Path that workspaces are relative to (e.g. the root of the monorepo)
const workspacesRoot = path.join(cliWorkspace, '..', '..');
// The path to the CLI package.json file which shall be modified
const cliPackageJsonFile = path.join(cliWorkspace, 'package.json');
// The existing contents of the CLI package.json file
let cliPackageJson;
try {
	cliPackageJson = (await import(cliPackageJsonFile, { with: { type: 'json' } })).default;
	if (!cliPackageJson?.name) {
		throw new Error(`Invalid package.json at ${cliPackageJsonFile}`);
	}
} catch (err) {
	if (err.code === 'ERR_MODULE_NOT_FOUND') {
		console.error(`Could not find package.json at ${path.dirname(cliPackageJsonFile)}`);
		process.exit(1);
	} else {
		throw new Error(`Failed to load ${cliPackageJsonFile}`, { cause: err });
	}
}
// The path to the tarball workspace directory used by oclif, the resolutions will be relative to this
const tarballWorkspace = path.join(cliWorkspace, 'tmp', cliPackageJson.name);

console.log(`Adding resolutions to ${cliPackageJsonFile} for workspaces in ${workspacesRoot} (relative to ${tarballWorkspace})`);

// We run `yarn workspaces list --json` to get the list of available workspaces
let workspaces;
try {
	const execFileAsync = util.promisify(execFile);
	const yarnCmdOutput = await execFileAsync('yarn', ['workspaces', 'list', '--json'], {
		cwd: cliWorkspace,
		shell: false,
		env: process.env,
	});
	// The output is JSON Lines format (each line is an object with a package name and it's location)
	workspaces = yarnCmdOutput.stdout.trim().split('\n').map(jsonl => JSON.parse(jsonl));
} catch (err) {
	if (err.code === 'ENOENT') {
		console.error('Could not find the `yarn` command. Please ensure Yarn is installed and available in your PATH.');
		process.exit(1);
	} else {
		throw new Error('Failed to run `yarn workspaces list --json`', { cause: err });
	}
}

// For each workspace package, we create a resolution entry using the file: protocol
// and a path relative to the tarball workspace directory.
const resolutions = workspaces.reduce((resolved, { name, location }) => {
	resolved[name] = `file:${
		name === cliPackageJson.name ? 	// the cli package is an exception
		'.' : 													// it resolves to the tarball workspace copy
		path.relative(tarballWorkspace, path.resolve(workspacesRoot, location))}`;
		console.log(`\t${name} -> ${resolved[name]}`);
	return resolved;
}, {});

// Backup the existing package.json
try {
	await writeFile(cliPackageJsonFile + '.bak', JSON.stringify(cliPackageJson, null, 2) + '\n', 'utf8');
} catch (err) {
	throw new Error(`Failed to backup ${cliPackageJsonFile}`, { cause: err });
}
console.log(`Backed up ${cliPackageJsonFile} to ${cliPackageJsonFile}.bak`);

// Write the modified package.json
try {
	cliPackageJson.resolutions = resolutions;
	await writeFile(cliPackageJsonFile, JSON.stringify(cliPackageJson, null, 2) + '\n', 'utf8');
} catch (err) {
		throw new Error(`Failed to write resolutions to ${cliPackageJsonFile}`, { cause: err });
}
console.log(`Wrote resolutions to ${cliPackageJsonFile}`);
