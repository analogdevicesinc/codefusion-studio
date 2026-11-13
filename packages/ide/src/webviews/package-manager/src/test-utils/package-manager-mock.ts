/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import type {
	CfsCachedPackage,
	CfsDependencyConflict,
	CfsInstallPlan,
	CfsPackageLicenseInfo,
	CfsPackageReference
} from 'cfs-package-manager';
import type {
	FetchLicenseDataResponse,
	MissingRequiredPackage,
	PackageListEntry,
	PackageManagerRemote,
	PackageManagerRemoteCredentials,
	PackageVersionMeta,
	SocFilterOption
} from '@constants/messages/package-manager-messages';
import {
	addRemoteRequest,
	fetchLicenseDataRequest,
	getCustomRemoteIndexingRequest,
	getLoggedInStatusRequest,
	getPackageCacheStateRequest,
	getPackageDependenciesBatchRequest,
	getPackageDependentsRequest,
	getInstallPlanRequest,
	getPackageListRequest,
	getPreferenceRequest,
	getRemotesRequest,
	getSocListRequest,
	installPackagesRequest,
	openLicensePreviewRequest,
	removeRemoteRequest,
	setPreferenceRequest,
	setRemoteCredentialsRequest,
	setRemoteEnabledRequest,
	signInRequest,
	uninstallPackagesRequest
} from '@constants/messages/package-manager-messages';
import {
	NO_RESPONSE,
	sendMockResponse,
	setupMessengerMock
} from '../../../common/test-utils/messenger-mock';

/**
 * In-memory stand-in for the package manager backend that the webview talks
 * to over `vscode-messenger`.
 *
 * The webview never touches conan directly: every backend call is one of the
 * request types in `@constants/messages/package-manager-messages`, handled in
 * `src/panels/package-manager.ts`. That makes the whole backend surface a
 * closed, typed set, so component tests can serve it from this state instead
 * of a real package manager. Behaviour that matters to the UI — installs
 * mutating cache state, dependency resolution reporting a conflict as a
 * resolved response — is reproduced here; everything else is data.
 */
export type MockPackageManagerState = {
	/**
	 * Package rows returned by `get-package-list`, each carrying the catalog
	 * metadata of its versions in `releases`.
	 */
	entries: PackageListEntry[];
	/** Options for the SoC filter dropdown (the SoC catalog). */
	socs: SocFilterOption[];
	/** Required packages the signed-in user has no access to. */
	missingRequiredPackages: MissingRequiredPackage[];
	/**
	 * Dependency closure per requested reference, keyed by `name/version`.
	 * References absent from this map resolve to no dependencies.
	 */
	dependencies: Record<string, CfsPackageReference[]>;
	/** Installed packages that depend on a reference, keyed by `name/version`. */
	dependents: Record<string, CfsPackageReference[]>;
	/**
	 * Version conflict reported by `get-package-dependencies-batch`. Returned
	 * as a resolved response, not a rejection — that is the real contract.
	 */
	conflict?: CfsDependencyConflict;
	/** Non-conflict resolution failure message. */
	resolutionFailure?: string;
	/** License payloads keyed by `name/version`. */
	licenses: Record<string, FetchLicenseDataResponse>;
	/** Workspace preferences, e.g. the uninstall-confirmation opt-out. */
	preferences: Record<string, boolean>;
	loggedIn: boolean;
	/** When set, `install-packages` reports failure instead of installing. */
	installFails: boolean;
	/** When set, `uninstall-packages` reports failure. */
	uninstallFails: boolean;
	/**
	 * Configured remotes. Disabled custom remotes keep their credentials here,
	 * but like the real backend, `get-remotes` doesn't report them.
	 */
	remotes: PackageManagerRemote[];
	/** Custom remotes being indexed, as reported when the panel opens. */
	indexingRemotes: string[];
};

/** Everything a test needs to drive and inspect the mocked backend. */
export type PackageManagerMock = {
	/** Live backend state — mutate it between actions to change what is served. */
	state: MockPackageManagerState;
	/** Every request received, in order, keyed by method. */
	calls: Record<string, unknown[]>;
	/** Params of the most recent request for a method, or undefined. */
	lastCall<T = unknown>(method: string): T | undefined;
	/** Number of requests received for a method. */
	callCount(method: string): number;
	/** Makes subsequent requests for `method` reject with `message`. */
	fail(method: string, message: string): void;
	/** Lets requests for `method` succeed again after {@link fail}. */
	recover(method: string): void;
	/**
	 * Holds subsequent responses for `method` until {@link flush} is called,
	 * so tests can assert on loading states.
	 */
	hold(method: string): void;
	/** Releases every response held by {@link hold}, in arrival order. */
	flush(method: string): void;
	/**
	 * Releases a single held request by arrival index, leaving the rest
	 * parked, so a test can answer out of order.
	 *
	 * Await each released request's promise before releasing the next: two
	 * released in one tick settle in the opposite order, which quietly
	 * inverts what such a test reads like it is asserting.
	 */
	release(method: string, index: number): void;
};

export const referenceKey = (name: string, version: string): string =>
	`${name}/${version}`;

/** Builds the catalog metadata of one version with sensible defaults. */
export function release(
	name: string,
	version: string,
	overrides: Partial<PackageVersionMeta> = {}
): PackageVersionMeta {
	return {
		version,
		description: `${name} description`,
		license: 'Apache-2.0',
		cfsVersionConstraint: '1.0.0',
		socs: ['plugin1Soc'],
		type: 'sdk',
		repos: ['remote1'],
		...overrides
	};
}

/**
 * Builds a package list row with sensible defaults. Every version gets
 * default metadata unless `releases` is given; pass a partial `releases`
 * map to override only some versions.
 */
export function entry(
	name: string,
	overrides: Partial<PackageListEntry> = {}
): PackageListEntry {
	const versions = overrides.versions ?? ['1.0.0'];
	const releases = Object.fromEntries(
		versions.map(version => [
			version,
			overrides.releases?.[version] ?? release(name, version)
		])
	);

	return {
		name,
		versions,
		isRequired: false,
		cachedVersions: [],
		state: 'not-installed',
		...overrides,
		releases
	};
}

const emptyState = (): MockPackageManagerState => ({
	entries: [],
	socs: [],
	missingRequiredPackages: [],
	dependencies: {},
	dependents: {},
	conflict: undefined,
	resolutionFailure: undefined,
	licenses: {},
	preferences: {},
	loggedIn: true,
	installFails: false,
	uninstallFails: false,
	remotes: [],
	indexingRemotes: []
});

/**
 * The remote list as the extension reports it: custom remotes first, then
 * managed ones, each by name, without credentials for disabled custom remotes.
 */
function reportRemotes(
	state: MockPackageManagerState
): PackageManagerRemote[] {
	return state.remotes
		.map(remote => {
			if (!remote.custom || !remote.disabled) {
				return remote;
			}

			const {auth: _auth, username: _username, ...reported} = remote;

			return reported;
		})
		.sort(
			(a, b) =>
				Number(b.custom) - Number(a.custom) ||
				a.name.localeCompare(b.name)
		);
}

/**
 * The remote after a login or logout. Like the extension, refuses to log in
 * without a username and password.
 */
function withCredentials(
	remote: PackageManagerRemote,
	credentials: PackageManagerRemoteCredentials
): PackageManagerRemote {
	const {auth: _auth, username: _username, ...rest} = remote;

	if (credentials.auth === 'none') {
		return {...rest, auth: 'none'};
	}

	if (!credentials.username || !credentials.password) {
		throw new Error(
			'A username and password are required to log in.'
		);
	}

	return {
		...rest,
		auth: 'usernamePassword',
		username: credentials.username
	};
}

/**
 * Cache state derived from the package rows, which is what
 * `get-package-cache-state` reports and what installs and uninstalls move.
 */
function cacheStateFor(
	state: MockPackageManagerState,
	names: string[]
): CfsCachedPackage[] {
	return state.entries
		.filter(row => names.includes(row.name))
		.flatMap(row =>
			row.cachedVersions.map(version => ({
				reference: {name: row.name, version},
				isInstalled: version === row.installedVersion
			}))
		);
}

/**
 * Licence details the install plan reports for a package awaiting acceptance,
 * taken from the seeded licences and falling back to the package's metadata.
 */
function licenseInfoFor(
	state: MockPackageManagerState,
	reference: CfsPackageReference
): CfsPackageLicenseInfo {
	const key = referenceKey(reference.name, reference.version);
	const seeded = state.licenses[key];
	const row = state.entries.find(
		candidate => candidate.name === reference.name
	);

	return {
		reference,
		license:
			seeded?.licenseId ??
			row?.releases?.[reference.version]?.license ??
			'Apache-2.0',
		licenseText: seeded?.licenseText ?? 'Apache License, Version 2.0'
	};
}

/**
 * Rejects a request the way the extension host does. vscode-messenger
 * replies with a `{message, data}` object, not the bare string
 * `sendMockErrorResponse` sends, so a webview catch block that only
 * handles `Error` or `string` fails here as it would in the real app.
 */
function sendHostErrorResponse(message: any, reason: string): void {
	window.dispatchEvent(
		new MessageEvent('message', {
			data: {id: message.id, error: {message: reason}, receiver: {}}
		})
	);
}

/**
 * Installs a script of handlers over the messenger mock and returns a handle
 * for driving them.
 *
 * @param seed - Backend state to start from; anything omitted is empty.
 * @param overrides - Extra or replacement handlers, keyed by message method.
 *   Use this for one-off behaviour the seeded state cannot express.
 */
export function mockPackageManager(
	seed: Partial<MockPackageManagerState> = {},
	overrides: Record<string, unknown> = {}
): PackageManagerMock {
	/**
	 * The backend's data. Handlers read it when a request arrives, so a test
	 * can change what is served partway through by mutating `pm.state`.
	 */
	const state: MockPackageManagerState = {...emptyState(), ...seed};

	/**
	 * Params of every request received, in arrival order, keyed by method.
	 * Recorded before failures and holds apply, so it reflects what the
	 * webview *sent*, not what it got back.
	 *
	 * e.g. `{'get-package-cache-state': [{names: ['test_pkg1']}]}`
	 */
	const calls: Record<string, unknown[]> = {};

	/**
	 * Methods that reject instead of running their handler, and the message
	 * they reject with. Populated by {@link PackageManagerMock.fail}.
	 *
	 * e.g. `{'get-package-list' => 'conan remote unreachable'}`
	 */
	const failures = new Map<string, string>();

	/**
	 * Requests parked by {@link PackageManagerMock.hold}. Handlers are left
	 * registered and still run — only their replies are deferred.
	 *
	 * Two signals share this map: the key's presence is the "on hold" flag,
	 * and the array is the queue of replies, one closure per parked request,
	 * run in arrival order by {@link PackageManagerMock.flush}.
	 *
	 * e.g. `{'get-package-list' => [() => sendMockResponse(msg, …)]}`
	 */
	const held = new Map<string, Array<() => void>>();

	/**
	 * Copies a value across the boundary the real messenger serializes over.
	 * Without this the store would hold this mock's own objects, which Redux
	 * Toolkit freezes — and the next install or uninstall could not write to
	 * its own state.
	 */
	const copy = <T>(value: T): T =>
		value === undefined ? value : structuredClone(value);

	/**
	 * Wraps a handler so every call is recorded, injected failures are
	 * honoured, and held methods stay unanswered until flushed.
	 *
	 * A parked request runs `handler` when it *arrives* and keeps the result,
	 * so it replies with the state it was served rather than whatever `state`
	 * became by flush time. That is what lets two held requests answer
	 * differently.
	 */
	const track =
		(method: string, handler: (message: any) => unknown) =>
		(message: any) => {
			(calls[method] ??= []).push(copy(message?.params));

			const failure = failures.get(method);

			if (failure !== undefined) {
				sendHostErrorResponse(message, failure);

				return NO_RESPONSE;
			}

			if (held.has(method)) {
				let release: () => void;

				try {
					const result = copy(handler(message));
					release = () => {
						sendMockResponse(message, result);
					};
				} catch (error) {
					const reason =
						error instanceof Error ? error.message : String(error);
					release = () => {
						sendHostErrorResponse(message, reason);
					};
				}

				held.get(method)!.push(release);

				return NO_RESPONSE;
			}

			return copy(handler(message));
		};

	/**
	 * One handler per message method, keyed by the `method` string off each
	 * `RequestType` in `package-manager-messages.ts` — the same string the
	 * webview puts on the wire. Fixed for the lifetime of the mock: tests
	 * vary `state`, not these.
	 */
	const handlers: Record<string, (message: any) => unknown> = {
		[getLoggedInStatusRequest.method]: () => ({
			loggedIn: state.loggedIn
		}),
		[signInRequest.method]() {
			state.loggedIn = true;
		},
		[getPackageListRequest.method]: () => ({
			packageList: state.entries,
			missingRequiredPackages: state.missingRequiredPackages
		}),
		[getSocListRequest.method]: () => ({socs: state.socs}),
		[getPackageCacheStateRequest.method]: (message: {
			params: {names: string[]};
		}) => ({cached: cacheStateFor(state, message.params.names)}),
		[getPackageDependenciesBatchRequest.method](message: {
			params: {references: CfsPackageReference[]};
		}) {
			const dependencies = Object.fromEntries(
				message.params.references.map(reference => {
					const key = referenceKey(reference.name, reference.version);

					return [key, state.dependencies[key] ?? []];
				})
			);

			return {
				dependencies,
				conflict: state.conflict,
				failure:
					state.resolutionFailure ??
					(state.conflict
						? `Version conflict on ${state.conflict.packageName}`
						: undefined)
			};
		},
		/**
		 * Mirrors `conan cfs install-plan`: it classifies only the references
		 * it was handed, leaving conan to expand transitive dependencies at
		 * install time. A cached package accepted its licence when it was
		 * first fetched, so only uncached installs need review.
		 */
		[getInstallPlanRequest.method](message: {
			params: {input: CfsPackageReference[]};
		}): CfsInstallPlan {
			const rowFor = (reference: CfsPackageReference) =>
				state.entries.find(
					candidate => candidate.name === reference.name
				);

			const alreadyInstalled: CfsPackageReference[] = [];
			const toInstall: CfsPackageReference[] = [];

			for (const reference of message.params.input) {
				const installed = rowFor(reference)?.installedVersion;

				if (installed === reference.version) {
					alreadyInstalled.push({
						name: reference.name,
						version: installed
					});
				} else {
					toInstall.push(reference);
				}
			}

			return {
				toInstall,
				alreadyInstalled,
				skipped: [],
				requiresLicenseAcceptance: toInstall
					.filter(
						reference =>
							!rowFor(reference)?.cachedVersions.includes(
								reference.version
							)
					)
					.map(reference => licenseInfoFor(state, reference))
			};
		},
		[getPackageDependentsRequest.method]: (message: {
			params: {reference: CfsPackageReference};
		}) =>
			state.dependents[
				referenceKey(
					message.params.reference.name,
					message.params.reference.version
				)
			] ?? [],
		[fetchLicenseDataRequest.method]: (message: {
			params: {name: string; version: string};
		}) =>
			state.licenses[
				referenceKey(message.params.name, message.params.version)
			] ?? {
				packageName: message.params.name,
				version: message.params.version,
				licenseId: 'Apache-2.0',
				licenseText: 'Apache License, Version 2.0'
			},
		[openLicensePreviewRequest.method]: () => undefined,
		[getPreferenceRequest.method]: (message: {
			params: {key: string};
		}) => state.preferences[message.params.key] ?? false,
		[setPreferenceRequest.method](message: {
			params: {key: string; value: boolean};
		}) {
			state.preferences[message.params.key] = message.params.value;
		},
		[installPackagesRequest.method](message: {
			params: {packages: CfsPackageReference[]};
		}) {
			if (state.installFails) {
				return {
					successful: false,
					installed: [],
					alreadyInstalled: []
				};
			}

			const alreadyInstalled: CfsPackageReference[] = [];
			const installed: CfsPackageReference[] = [];

			for (const reference of message.params.packages) {
				const row = state.entries.find(
					candidate => candidate.name === reference.name
				);

				if (row?.installedVersion === reference.version) {
					alreadyInstalled.push(reference);
					continue;
				}

				if (row) {
					row.installedVersion = reference.version;
					row.state = 'installed';

					if (!row.cachedVersions.includes(reference.version)) {
						row.cachedVersions = [
							...row.cachedVersions,
							reference.version
						];
					}
				}

				installed.push(reference);
			}

			return {successful: true, installed, alreadyInstalled};
		},
		[uninstallPackagesRequest.method](message: {
			params: {names: string[]};
		}) {
			if (state.uninstallFails) {
				return {successful: false, uninstalledNames: []};
			}

			for (const row of state.entries) {
				if (
					message.params.names.includes(row.name) &&
					row.installedVersion !== undefined
				) {
					row.cachedVersions = row.cachedVersions.filter(
						version => version !== row.installedVersion
					);
					row.installedVersion = undefined;
					row.state = 'not-installed';
				}
			}

			return {
				successful: true,
				uninstalledNames: message.params.names
			};
		},
		[getRemotesRequest.method]: () => reportRemotes(state),
		[getCustomRemoteIndexingRequest.method]: () => ({
			remotes: state.indexingRemotes
		}),
		[addRemoteRequest.method](message: {
			params: {
				name: string;
				url: string;
				credentials: PackageManagerRemoteCredentials;
			};
		}) {
			const {name, url, credentials} = message.params;

			if (state.remotes.some(remote => remote.name === name)) {
				throw new Error(`Remote with name '${name}' already exists.`);
			}

			state.remotes.push(
				withCredentials(
					{name, url, disabled: false, custom: true},
					credentials
				)
			);

			return reportRemotes(state);
		},
		[removeRemoteRequest.method](message: {params: {name: string}}) {
			state.remotes = state.remotes.filter(
				remote => remote.name !== message.params.name
			);

			return reportRemotes(state);
		},
		[setRemoteEnabledRequest.method](message: {
			params: {name: string; enabled: boolean};
		}) {
			const remote = state.remotes.find(
				candidate => candidate.name === message.params.name
			);

			if (remote) {
				remote.disabled = !message.params.enabled;
			}

			return reportRemotes(state);
		},
		[setRemoteCredentialsRequest.method](message: {
			params: {
				name: string;
				credentials: PackageManagerRemoteCredentials;
			};
		}) {
			state.remotes = state.remotes.map(remote =>
				remote.name === message.params.name
					? withCredentials(remote, message.params.credentials)
					: remote
			);

			return reportRemotes(state);
		}
	};

	// Same keys, each handler wrapped by `track`, so nothing bypasses
	// recording, failure injection, or holds.
	const tracked = Object.fromEntries(
		Object.entries({...handlers, ...overrides}).map(
			([method, handler]) => [
				method,
				track(
					method,
					typeof handler === 'function'
						? (handler as (message: any) => unknown)
						: () => handler
				)
			]
		)
	);

	setupMessengerMock(tracked);

	return {
		state,
		calls,
		lastCall<T>(method: string) {
			const received = calls[method] ?? [];

			return received[received.length - 1] as T | undefined;
		},
		callCount(method: string) {
			return calls[method]?.length ?? 0;
		},
		fail(method: string, message: string) {
			failures.set(method, message);
		},
		recover(method: string) {
			failures.delete(method);
		},
		hold(method: string) {
			held.set(method, []);
		},
		flush(method: string) {
			const pending = held.get(method) ?? [];
			held.delete(method);

			for (const send of pending) send();
		},
		release(method: string, index: number) {
			const pending = held.get(method);
			const send = pending?.[index];

			if (!send) {
				throw new Error(
					`No held ${method} request at index ${index}`
				);
			}

			// Blanked rather than removed so later indices keep meaning the
			// same request, and so a double release is a no-op.
			pending[index] = () => undefined;
			send();
		}
	};
}
