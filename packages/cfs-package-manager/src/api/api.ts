/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

export interface CfsPackageReference {
	name: string;
	version: string;
}

export interface CfsPackage {
	reference: CfsPackageReference;
	description: string;
	license: string;
	cfsVersion: string;
	soc?: string[];
	type?: string;
}

export interface CfsInstalledPackage extends CfsPackageReference {
	path: string;
	type?: string;
}

export interface CfsPackageRemote {
	name: string;
	url: URL;
	auth?: CfsPackageRemoteAuth; // only private remotes will have auth info
	custom: boolean; // true for user added remotes, false for managed (default) remotes
}

export interface CfsPackageManifest {
	version: number;
	packages: CfsPackageReference[];
}

export interface CfsPackageRemoteCredential {
	user: string;
	password: string;
}

export type CfsPackageRemoteAuth =
	/**
	 * Authentication information for a remote.
	 * Contains either the username of the user that
	 * has logged in manually, or the name of the
	 * credential provider that is being used to
	 * provide authentication for this remote.
	 */
	| { username: string; credentialProvider: never }
	| { credentialProvider: string; username: never };

export interface CfsPackageInstallOptions {
	/**
	 * If true, installation will be atempted only from
	 * local cache (No remote servers will be contacted).
	 *
	 * @default false
	 */
	localOnly?: boolean;
}

export interface CfsPackageRemoteCredentialProvider {
	/**
	 * Unique name used to identify the credential provider
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
	 * @param filter? - Optional Record parameter with a string or an array of string values. If present, only packages
	 *                  with metadata that matches all the provided filter properties will be returned.
	 *                  When the package metadata property is a list of strings, it is enough if one of the elements
	 *                  of the list match the filter
	 *
	 * @returns A list of package references of all the installed packages which name match pattern if specified.
	 */
	list(
		pattern?: string,
		filter?: Record<string, string | string[]>
	): Promise<CfsPackageReference[]>;

	/**
	 * Retrieve packages available for install.
	 *
	 * @param pattern - A pattern in the form pkg_name/version that may contain '*' as a wildcard character.
	 *                  Pattern 'my_pkg/*' will return all available versions for 'my_pkg'
	 * @returns A list of package references of all the available packages which reference match pattern.
	 */
	search(pattern: string): Promise<CfsPackageReference[]>;

	/**
	 * Retrieve a given package metadata. The package does not need to be installed for this information to be retrieved.
	 *
	 * @param reference - Reference of a package in the form name/version
	 * @returns Package metadata
	 */
	getPackageInfo(reference: CfsPackageReference): Promise<CfsPackage>;

	/**
	 * Install a package, including all its dependencies.
	 *
	 * @param reference - Reference of a package in the form name/version.
	 * @param options - Optional installation options. See CfsPackageInstallOptions for details.
	 * @returns A list of package references of all the packages that where installed during this operation
	 */
	// TODO:
	//  - Support a path to a manifest file instead of a reference
	//  - Support an array of references to install
	//  - Support version ranges
	//  - Support version omission (with a potential "update" argument that decides
	//    whether to go with latest available version or do nothing if already installed)
	install(
		reference: CfsPackageReference,
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
	 * @param filter - Optional filter object to filter packages by properties (e.g., { type: "tool", soc: "max32690" })
	 * @returns An array of CfsInstalledPackage objects with package name, version, path, and type
	 */
	getInstalledPackageInfo(
		filter?: Record<string, string | string[]>
	): Promise<CfsInstalledPackage[]>;

	/**
	 * Retrieves a list of all the dependencies of a given package, including transitive dependencies.
	 * This method can be run on any available package, not necesarily installed.
	 *
	 * @param reference - Reference of a package in the form name/version.
	 * @returns A list of package references of all packages that are needed to install for the given package
	 */
	dependencies(
		reference: CfsPackageReference
	): Promise<CfsPackageReference[]>;

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
	 * Install packages from a manifest file. Checks if each package is already installed,
	 * and installs only those that are not yet installed.
	 *
	 * @param manifestPath - Path to a manifest file containing the list of packages to install
	 * @param options - Optional installation options. See CfsPackageInstallOptions for details.
	 * @returns A list of package references of all the packages that were installed during this operation
	 */
	installFromManifest(
		manifestPath: string,
		options?: CfsPackageInstallOptions
	): Promise<CfsPackageReference[]>;

	/**
	 * Checks a manifest file and returns a list of packages that need to be installed.
	 * Does not perform any installation, only checks what's missing.
	 *
	 * @param manifestPath - Path to a manifest file containing the list of packages to check
	 * @returns A list of package references that need to be installed
	 */
	checkManifest(manifestPath: string): Promise<CfsPackageReference[]>;

	/**
	 * Registers a credential provider for use with the package manager
	 * Enables remotes configured to use that provider
	 *
	 * @param provider - The credential provider to use
	 */
	registerCredentialProvider(
		provider: CfsPackageRemoteCredentialProvider
	): Promise<void>;

	/**
	 * Unregisters a credential provider
	 * Disables remotes configured to use that provider
	 *
	 * @param provider - The credential provider to unregister
	 */
	unregisterCredentialProvider(
		provider: string | CfsPackageRemoteCredentialProvider
	): Promise<void>;

	/**
	 * Sets a credential provider to be used to provide authentication for a given remote.
	 * Calling login() or logout() on the remote will clear the provider configuration
	 *
	 * @param remote name of the remote
	 * @param provider name of the provider
	 */
	setRemoteCredentialProvider(
		remote: string,
		provider: string
	): Promise<void>;
}
