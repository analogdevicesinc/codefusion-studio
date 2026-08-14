/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import { SKIPPED_PACKAGE_REASON_MESSAGES } from "../utils/package-manager-skipped-reasons.js";

export interface CfsPackageReference {
	name: string;
	version: string;
	cfsSoc?: string[];
}

export interface CfsPackage {
	reference: CfsPackageReference;
	description: string;
	license: string;
	/**
	 * Full license text content associated with this package.
	 * Contains the contents of the LICENSE file, not a filesystem path.
	 */
	licenseText?: string;
	cfsVersion: string;
	soc?: string[];
	type?: string;
	components?: CfsPackageComponent[];
}

export interface CfsInstalledPackage extends CfsPackageReference {
	path: string;
	type?: string;
	components?: CfsPackageComponent[];
}

export interface CfsCachedPackage {
	reference: CfsPackageReference;
	isInstalled: boolean;
}

export type CfsPackageRemoteConfigErrorCode =
	| "REMOTE_ADD_FAILED"
	| "REMOTE_REMOVE_FAILED"
	| "REMOTE_CONFIGURE_FAILED"
	| "REMOTE_AUTH_FAILED";

export interface CfsPackageRemoteConfigError extends Error {
	code: CfsPackageRemoteConfigErrorCode;
	message: string;
}

interface CfsPackageRemoteBase {
	name: string;
	url: URL;
	disabled: boolean; // true if user has disabled the remote (or it was disabled by default)
	configError?: CfsPackageRemoteConfigError; // present when remote configuration fails
}

export interface CfsManagedPackageRemote
	extends CfsPackageRemoteBase {
	auth: CfsManagedPackageRemoteAuth; // managed remotes always have auth info
	custom: false;
	provider: string; // indicates which provider this remote belongs to
}

export interface CfsCustomPackageRemote extends CfsPackageRemoteBase {
	auth?: CfsCustomPackageRemoteAuth; // only enabled custom remotes can have auth info
	custom: true; // custom remotes are user added
}

export type CfsPackageRemote =
	| CfsManagedPackageRemote
	| (CfsCustomPackageRemote &
			(
				| {
						disabled: false;
						auth: CfsCustomPackageRemoteAuth;
				  }
				| { disabled: true; auth?: never }
			));

export interface CfsPackageManifest {
	version: number;
	packages: CfsPackageReference[];
}

export interface CfsPackageRemoteCredential {
	user: string;
	password: string;
}

export interface CfsPackageComponent {
	name: string;
	version: string;
	type?: string;
}

export interface CfsPackageFilter {
	cfsVersion?: string;
	soc?: string | string[]; // string array for backward compatibility. We need to check if this is actually useful.
	type?: string | string[]; // string array for backward compatibility. We need to check if this is actually useful.
	component?: Partial<CfsPackageComponent>;
}

/**
 * Authentication information for a managed remote.
 * Can be public or authenticated via a named credential provider.
 * Username and password are never used for managed remotes.
 */
export type CfsManagedPackageRemoteAuth =
	| { public: true }
	| { public: false; credentialProvider: string };

/**
 * Authentication information for a custom remote.
 * Can be public or authenticated via a username and password.
 * Credential providers are never used for custom remotes.
 */
export type CfsCustomPackageRemoteAuth =
	| { public: true }
	| { public: false; username: string };

export interface CfsPackageInstallOptions {
	/**
	 * If true, installation will be attempted only from
	 * local cache (No remote servers will be contacted).
	 *
	 * @default false
	 */
	localOnly?: boolean;
	/**
	 * If true, the license will be accepted during installation.
	 */
	acceptLicense?: boolean;
}

export interface CfsPackageDependenciesOptions {
	/**
	 * If true, resolves dependencies from local cache/installed state only.
	 *
	 * @default false
	 */
	localOnly?: boolean;
	/**
	 * If true, returns unresolved dependency requirements (for example "^2.1.0")
	 * instead of concrete resolved versions.
	 *
	 * @default false
	 */
	unresolved?: boolean;
}

/**
 * Retrieves credentials for package remotes.
 */
export interface CfsPackageRemoteCredentialProvider {
	/**
	 * Name used to identify the source of the credentials
	 *
	 */
	readonly name: string;
	/**
	 * Retrieves credentials for a given remote URL
	 *
	 * @param url - The remote URL to get credentials for
	 * @returns The credentials for the given URL, or undefined if no credentials are available
	 */
	getRemoteCredential(
		url: string
	): Promise<CfsPackageRemoteCredential | undefined>;
	/**
	 * Refreshes the credentials for a given remote URL
	 *
	 * @param url - The remote URL to refresh credentials for
	 */
	refreshRemoteCredential(url: string): Promise<void>;
}

/**
 * Client that provides credentials for a specific remote, along with the name of the credential provider it belongs to.
 */
export interface CfsPackageRemoteCredentialClient {
	/**
	 * Name of the provider supplying the credentials
	 *
	 */
	auth: { public: false; credentialProvider: string };
	/**
	 * Retrieves the credentials for the remote
	 *
	 * @returns The credentials for the remote, or undefined if no credentials are available
	 */
	getCredential(): Promise<CfsPackageRemoteCredential | undefined>;
	/**
	 * Refreshes the credentials for the remote
	 */
	refreshCredential(): Promise<void>;
}

/**
 * Provides a list of remotes to be used for package retrieval, along with their credentials if needed.
 */
export interface CfsPackageRemotesProvider {
	/**
	 * Name used to identify the source of the remotes
	 *
	 */
	readonly name: string;
	/**
	 * Retrieves a list of remotes to be used for package retrieval, along with their credentials if needed.
	 *
	 * @returns An array of CfsManagedPackageRemote elements. Those with authentication are also CfsPackageRemoteCredentialClients.
	 */
	getRemotes(): Promise<
		(
			| (CfsManagedPackageRemote & { auth: { public: true } })
			| (CfsManagedPackageRemote & CfsPackageRemoteCredentialClient)
		)[]
	>;
}

/**
 * Reports package license acceptance to an external backend.
 */
export interface CfsPackageLicenseReporter {
	/**
	 * Reports acceptance for one or more packages.
	 *
	 * @param packages - One or more package references to report acceptance for
	 */
	reportLicenseAcceptance(
		packages: CfsPackageReference | CfsPackageReference[]
	): Promise<void>;
}

/**
 * Represents a package that requires license acceptance during installation.
 */
export interface CfsPackageLicenseInfo {
	/** Package reference */
	reference: CfsPackageReference;
	/** SPDX license identifier (e.g., "Apache-2.0", "MIT") */
	license: string;
	/** Full license text content, if available */
	licenseText?: string;
}

export type CfsSkippedPackageReasonCode =
	keyof typeof SKIPPED_PACKAGE_REASON_MESSAGES;

/**
 * Package excluded from installation plan with a machine-readable reason.
 */
export interface CfsSkippedPackageInfo {
	/** Package reference */
	reference: CfsPackageReference;
	/** Reason code for why this package was skipped */
	reasonCode: CfsSkippedPackageReasonCode;
}

/**
 * Installation plan returned by getInstallPlan().
 * Provides all information needed to make UI decisions before installation.
 */
export interface CfsInstallPlan {
	/**
	 * Packages that will be installed.
	 *
	 * These are the directly requested packages that are not currently present
	 * in .cfsPackages (i.e., not installed).
	 *
	 * NOTE: This list contains only the explicitly requested packages.
	 * Transitive dependencies are resolved during actual installation.
	 */
	toInstall: CfsPackageReference[];

	/**
	 * Packages that are already installed (present in .cfsPackages) and will be skipped.
	 */
	alreadyInstalled: CfsPackageReference[];

	/**
	 * Requested packages excluded from this install plan because they cannot be
	 * installed (e.g. no compatible binary for the current platform).
	 *
	 * Already-installed packages are reported in `alreadyInstalled`, not here.
	 */
	skipped?: CfsSkippedPackageInfo[];

	/**
	 * Subset of `toInstall` that require explicit license acceptance.
	 * A package requires license acceptance if:
	 * - It has a license file, AND
	 * - It is not already in the Conan cache (meaning license was not previously accepted)
	 *
	 * Empty if all packages are either cached or don't require license acceptance.
	 */
	requiresLicenseAcceptance: CfsPackageLicenseInfo[];
}

/**
 * Input for getInstallPlan() - accepts multiple formats for flexibility.
 */
export type CfsInstallInput =
	| CfsPackageReference // Single package
	| CfsPackageReference[] // Multiple packages
	| string; // Manifest file path

export interface CfsPackageManagerProvider {
	/**
	 * Initializes package manager. This method must be called before any other action is performed
	 *
	 * @param options - Optional initialization options
	 * @param options.initRemotes - When true, initializes and authenticates remotes during init. Defaults to false.
	 *                              When false, remotes will be lazily initialized on first use.
	 */
	init(options?: { initRemotes?: boolean }): Promise<void>;

	/**
	 * Retrieve a list of installed packages.
	 *
	 * @param pattern? - Optional pattern to be matched with package names.
	 * @param filter? - Optional CfsPackageFilter parameter. If present, only packages with metadata that matches
	 *                  all the provided filter properties will be returned.
	 *                  When soc and type is passed as a list of strings, it is enough if one of the elements
	 *                  of the list match the filter.
	 *                  If component is passed, the filter will match if the package contains at least one component
	 *                  that matches all the provided component properties.
	 *                  Component versions can be defined as version ranges using semver syntax, for example "^1.0.0"
	 *                  or ">=1.0.0 <2.0.0". In that case, the filter will match if the package contains at least one
	 *                  component with a version that satisfies the range.
	 *
	 * @returns A list of package references of all the installed packages which name match pattern if specified.
	 */
	list(
		pattern?: string,
		filter?: CfsPackageFilter
	): Promise<CfsPackageReference[]>;

	/**
	 * Retrieve a list of packages in the local cache (both installed and cached-only).
	 *
	 * @param pattern? - Optional pattern to be matched with package names.
	 * @returns A list of cached packages with their reference and installation status.
	 */
	listCache(pattern?: string): Promise<CfsCachedPackage[]>;

	/**
	 * Retrieve packages available for install.
	 *
	 * @param pattern - A pattern in the form pkg_name/version that may contain '*' as a wildcard character.
	 *                  Pattern 'my_pkg/*' will return all available versions for 'my_pkg'
	 * @returns A list of package references of all the available packages which reference match pattern.
	 */
	search(pattern: string): Promise<CfsPackageReference[]>;

	/**
	 * Similar to search method , but this one also returns the metadata of each of the packages so a later
	 * call to getPackageInfo is not needed. Additionally, this method includes a filter argument
	 * that allows to refine the returned packages based on their metadata.
	 *
	 * It must be noted that since this methods retrieves data for each package that matches pattern,
	 * it may be significantly slower than search method,
	 * so it should be used only when the additional data or filtering is needed
	 *
	 * @param pattern - A pattern in the form pkg_name/version that may contain '*' as a wildcard character.
	 *                  Pattern 'my_pkg/*' will return all available versions for 'my_pkg'
	 * @param filter? - Optional CfsPackageFilter parameter. If present, only packages with metadata that matches
	 *                  all the provided filter properties will be returned.
	 *                  When soc and type is passed as a list of strings, it is enough if one of the elements
	 *                  of the list match the filter.
	 *                  If component is passed, the filter will match if the package contains at least one component
	 *                  that matches all the provided component properties.
	 *                  Component versions can be defined as version ranges using semver syntax, for example "^1.0.0"
	 *                  or ">=1.0.0 <2.0.0". In that case, the filter will match if the package contains at least one
	 *                  component with a version that satisfies the range.
	 * @returns A list of CfsPackage instances of all the available packages which reference match pattern and
	 *          filter (if provided).
	 */
	searchInfo(
		pattern: string,
		filter?: CfsPackageFilter
	): Promise<CfsPackage[]>;

	/**
	 * Retrieve package metadata for one or more packages. Packages do not need
	 * to be installed for this information to be retrieved.
	 *
	 * Pass a single reference to get a single {@link CfsPackage}, or an array
	 * to fetch metadata for multiple packages in a single backend call (e.g.
	 * the visible page of a paginated list). Results preserve input order.
	 *
	 * @param reference - A single package reference or an array of references
	 * @returns Package metadata matching the shape of `reference`
	 */
	getPackageInfo(reference: CfsPackageReference): Promise<CfsPackage>;
	getPackageInfo(
		references: CfsPackageReference[]
	): Promise<CfsPackage[]>;

	/**
	 * Install one or more packages, including all their dependencies.
	 *
	 * If any package requires license acceptance and `options.acceptLicense` is not set to `true`,
	 * an error will be thrown listing the packages that require license acceptance.
	 *
	 * **Recommended usage pattern:**
	 * 1. Call `getInstallPlan()` to analyze packages and get license information
	 * 2. Present license information to user and get acceptance
	 * 3. Call `install()` with `acceptLicense: true` for packages the user accepted
	 *
	 * @example
	 * ```typescript
	 * const plan = await pm.getInstallPlan(input);
	 * if (plan.requiresLicenseAcceptance.length > 0) {
	 *   const userAccepted = await promptUserForLicense(plan);
	 *   if (userAccepted) {
	 *     await pm.install(plan.toInstall, { acceptLicense: true });
	 *   }
	 * } else {
	 *   await pm.install(plan.toInstall, { acceptLicense: true });
	 * }
	 * ```
	 *
	 * @param references - A single package reference, an array of package references in the form name/version, or a CfsInstallPlan.
	 *                     Semver is supported for version. When passing a CfsInstallPlan, the plan's toInstall list will be used
	 *                     and license acceptance reporting will use the pre-computed license information.
	 * @param options - Optional installation options. See CfsPackageInstallOptions for details.
	 * @returns A list of package references of all the packages that were installed during this operation
	 * @throws Error if any package requires license acceptance and `acceptLicense` is not true
	 */
	// TODO:
	//  - Support version ranges
	//  - Support version omission (with a potential "update" argument that decides
	//    whether to go with latest available version or do nothing if already installed)
	install(
		references:
			| CfsPackageReference
			| CfsPackageReference[]
			| CfsInstallPlan,
		options?: CfsPackageInstallOptions
	): Promise<CfsPackageReference[]>;

	/**
	 * Uninstall a package. Package will remain stored on local cache so it can be used again without
	 * triggering another download
	 *
	 * @param pkgName - Name of the package to uninstall. Note that since only one version of a package
	 *                  can be installed at a given time, it is not required to provide it.
	 */
	// TODO:
	//  - Add support for direct removal from cache, so another call to 'delete' is not required.
	uninstall(pkgName: string): Promise<void>;

	/**
	 * Deletes a package from local cache. Package must not be installed, otherwise an error is thrown
	 *
	 * @param pattern - A pattern in the form pkg_name/version that may contain '*' as a wildcard character.
	 *                  Pattern 'my_pkg/*' will delete from cache all versions of 'my_pkg'
	 * @returns A list of package references of all the packages deleted from local cache
	 */
	delete(pattern: string): Promise<CfsPackageReference[]>;

	/**
	 * @returns a string with the absolute path to the .cfsPackages file.
	 * @description Gets the absolute path to the package index file (.cfsPackages).
	 * Given that packages may be added or deleted by different independent processes,
	 * The path to this file is exposed so that a given process can watch for changes and react as needed.
	 * This enables use cases such as invalidating local cache without restarting the process.
	 *

	 */
	getIndexFilePath(): string;

	/**
	 * Retrieve package information for installed packages
	 *
	 * @param filter? - Optional CfsPackageFilter parameter. If present, only packages with metadata that matches
	 *                  all the provided filter properties will be returned.
	 *                  When soc and type is passed as a list of strings, it is enough if one of the elements
	 *                  of the list match the filter.
	 *                  If component is passed, the filter will match if the package contains at least one component
	 *                  that matches all the provided component properties.
	 *                  Component versions can be defined as version ranges using semver syntax, for example "^1.0.0"
	 *                  or ">=1.0.0 <2.0.0". In that case, the filter will match if the package contains at least one
	 *                  component with a version that satisfies the range.
	 *
	 * @returns An array of CfsInstalledPackage objects with package name, version, path, and type
	 */
	getInstalledPackageInfo(
		filter?: CfsPackageFilter
	): Promise<CfsInstalledPackage[]>;

	/**
	 * Retrieves a list of all the dependencies of a given package, including transitive dependencies.
	 * This method can be run on any available package, not necessarily installed.
	 *
	 * @param reference - Reference of a package in the form name/version.
	 * @param options - Optional dependency resolution options.
	 * @returns A list of package references of all packages that are needed to install for the given package
	 */
	dependencies(
		reference: CfsPackageReference,
		options?: CfsPackageDependenciesOptions
	): Promise<CfsPackageReference[]>;

	/**
	 * Batched form of {@link dependencies}: resolves the dependency closure of
	 * several packages at once.
	 *
	 * Every requested package is resolved as a root of a single dependency graph,
	 * so the whole batch costs one backend invocation instead of one per package.
	 * Prefer this whenever more than one closure is needed at the same time.
	 *
	 * Because the roots are resolved together, a version conflict *between* the
	 * requested packages fails the call, where resolving them one at a time would
	 * have produced two individually-valid answers. For callers that go on to
	 * install the whole set together this matches what the install would do
	 * anyway; callers that need per-package isolation should use
	 * {@link dependencies}.
	 *
	 * @param references - References of packages in the form name/version.
	 * @param options - Optional dependency resolution options.
	 * @returns A record keyed by `name/version` of each *requested* reference,
	 * mapping to that package's dependencies. Every requested reference is
	 * present as a key; a package with no dependencies maps to an empty array.
	 */
	dependenciesBatch(
		references: CfsPackageReference[],
		options?: CfsPackageDependenciesOptions
	): Promise<Record<string, CfsPackageReference[]>>;

	/**
	 * Retrieves a list of all installed packages that depend on a given package, including transitive consumers.
	 * Note unlike dependencies, this method returns "local data" as in installed consumers of an installed package.
	 * That is also the reason why this method requires only pkgName instead of a full reference (since there is only
	 * one version of a package installed, there is no need to provide the version)
	 *
	 * @param pkgName - Name of the package to uninstall. Note that since only one version of a package
	 *                  can be installed at a given time, it is not required to provide the version.
	 * @returns A list of package references of all packages that are needed to install for the given package
	 */
	localConsumers(pkgName: string): Promise<CfsPackageReference[]>;

	/**
	 * Retrieves the installation path of a given package. This method can be used to consume the package.
	 *
	 * @param pkgName - Name of the package. Note that version is not required here, since only a single version
	 *                  may be installed at a given time, and the consumer doesn't need to know that version
	 * @returns The path on the local file system were the package data is stored
	 */
	// TODO:
	//  - Add support for version check, with an optional parameter or a reference
	getPath(pkgName: string): Promise<string>;

	/**
	 * Registers a new package server to retrieve packages from.
	 *
	 * @param name - Local name used to refer to this server in future calls to other methods such as login or deleteRemote
	 * @param url - Server URL
	 */
	addRemote(name: string, url: string): Promise<void>;

	/**
	 * Unregisters a package server so it is no longer considered for package retrieval
	 *
	 * @param name - Local name given to the server on addRemote
	 */
	deleteRemote(name: string): Promise<void>;

	/**
	 * Enables a package server so it is considered for package retrieval
	 *
	 * @param name - Local name given to the server on addRemote
	 */
	enableRemote(name: string): Promise<void>;

	/**
	 * Disables a package server so it is no longer considered for package retrieval
	 *
	 * @param name - Local name given to the server on addRemote
	 */
	disableRemote(name: string): Promise<void>;

	/**
	 * Returns an array of all package servers that are currently registered
	 *
	 * @returns An array of CfsPackageRemote elements which includes local name, URL,
	 * 					authentication status, and whether the remote is custom.
	 */
	listRemotes(): Promise<CfsPackageRemote[]>;

	/**
	 * Provides authentication for a given package server
	 *
	 * @param remote - Local name given to the server on addRemote
	 * @param user - User name to be used on that server
	 * @param password - User password, API key or token to authenticate into the server
	 */
	login(
		remote: string,
		user: string,
		password: string
	): Promise<void>;

	/**
	 * Removes authentication for given package server
	 *
	 * @param remote - Local name given to the server on addRemote
	 */
	logout(remote: string): Promise<void>;

	/**
	 * Installs packages from a manifest file. For each package listed in the manifest,
	 * checks if it is already installed and installs only those that are not yet installed.
	 *
	 * @param manifestPath - Path to a manifest file containing the list of packages to install.
	 * @param options - Optional installation options. See CfsPackageInstallOptions for details.
	 * @returns An object containing:
	 *   - installed: A list of package references that were installed during this operation.
	 *   - skipped: A list of package references that require license acceptance but were not installed because the license was not accepted.
	 */
	installFromManifest(
		manifestPath: string,
		options?: CfsPackageInstallOptions
	): Promise<{
		installed: CfsPackageReference[];
		skipped: CfsPackageReference[];
	}>;

	/**
	 * Checks a manifest file and returns a list of packages that need to be installed.
	 * Does not perform any installation, only checks what's missing.
	 *
	 * @deprecated Use {@link getInstallPlan} instead, which provides richer information
	 * including license requirements and already installed packages.
	 *
	 * @param manifestPath - Path to a manifest file containing the list of packages to check
	 * @returns A list of package references that need to be installed
	 */
	checkManifest(manifestPath: string): Promise<CfsPackageReference[]>;

	/**
	 * Returns an installation plan for the requested packages without performing
	 * any installation.
	 *
	 * This method analyzes only the explicitly requested (top-level) packages:
	 * - Checks which packages are already installed (.cfsPackages)
	 * - Checks which packages are in local cache (license previously accepted)
	 * - Identifies which uncached packages require license acceptance
	 * - Returns license text for packages requiring acceptance
	 *
	 * NOTE: This method does not expand or resolve transitive dependencies.
	 * Dependency resolution is performed during actual installation.
	 *
	 * **Recommended workflow:**
	 * 1. Call `getInstallPlan()` with desired packages or manifest
	 * 2. If `requiresLicenseAcceptance` is non-empty, show licenses and get user consent
	 * 3. Based on user's choice, filter `toInstall` and call `install()` with `acceptLicense: true`
	 *
	 * @param input - Package reference(s) or path to a manifest file
	 * @returns Installation plan with all pre-flight information
	 *
	 * @example
	 * ```typescript
	 * // Get the plan
	 * const plan = await pm.getInstallPlan("/path/to/.cfsdependencies");
	 *
	 * // Handle license acceptance
	 * let packagesToInstall = plan.toInstall;
	 * if (plan.requiresLicenseAcceptance.length > 0) {
	 *   const userAccepted = await showLicensePrompt(plan.requiresLicenseAcceptance);
	 *   if (!userAccepted) {
	 *     // Filter out packages requiring license
	 *     const licensedRefs = new Set(plan.requiresLicenseAcceptance.map(p => `${p.reference.name}/${p.reference.version}`));
	 *     packagesToInstall = plan.toInstall.filter(p => !licensedRefs.has(`${p.name}/${p.version}`));
	 *   }
	 * }
	 *
	 * // Install the packages
	 * if (packagesToInstall.length > 0) {
	 *   await pm.install(packagesToInstall, { acceptLicense: true });
	 * }
	 * ```
	 */
	getInstallPlan(input: CfsInstallInput): Promise<CfsInstallPlan>;

	/**
	 * Registers a remotes provider for use with the package manager.
	 *
	 * @param provider - The remotes provider to use
	 */
	registerRemotesProvider(
		provider: CfsPackageRemotesProvider
	): Promise<void>;

	/**
	 * Unregisters the currently configured remotes provider and
	 * removes all remotes that were added by that provider.
	 *
	 */
	unregisterRemotesProvider(): Promise<void>;

	/**
	 * Registers a license reporter for use during install flows.
	 *
	 * @param reporter - The license reporter to use
	 */
	registerLicenseReporter(
		reporter: CfsPackageLicenseReporter
	): Promise<void>;

	/**
	 * Unregisters the currently configured license reporter.
	 */
	unregisterLicenseReporter(): Promise<void>;
}
