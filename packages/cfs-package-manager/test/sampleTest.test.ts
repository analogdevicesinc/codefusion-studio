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

import { expect } from "chai";
import {
	CfsInstalledPackage,
	CfsPackage,
	CfsPackageManagerProvider,
	CfsPackageReference,
	CfsPackageRemote,
	CfsPackageRemoteCredentialProvider,
	CfsPackageInstallOptions
} from "../src/api/api.js";
import mockData from "./data/mockedData.js";

/* eslint-disable @typescript-eslint/no-unused-vars */
class DummyPkgManager implements CfsPackageManagerProvider {
	localConsumers(pkgName: string): Promise<CfsPackageReference[]> {
		throw new Error("Method not implemented.");
	}
	addRemote(name: string, url: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	deleteRemote(name: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	listRemotes(): Promise<CfsPackageRemote[]> {
		throw new Error("Method not implemented.");
	}
	registerCredentialProvider(
		provider: CfsPackageRemoteCredentialProvider
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	unregisterCredentialProvider(
		provider: string | CfsPackageRemoteCredentialProvider
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	setRemoteCredentialProvider(
		remote: string,
		provider: string
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	login(
		remote: string,
		user: string,
		password: string
	): Promise<void> {
		throw new Error("Method not implemented.");
	}
	logout(remote: string): Promise<void> {
		throw new Error("Method not implemented.");
	}
	init(): Promise<void> {
		throw new Error("Method not implemented.");
	}
	list(pattern?: string): Promise<CfsPackageReference[]> {
		return new Promise<CfsPackageReference[]>((resolve, reject) => {
			try {
				if (pattern) {
					resolve(
						mockData.installedPackages.filter(
							(pkg: CfsPackageReference) => pkg.name.includes(pattern)
						)
					);
				}
				resolve(mockData.installedPackages);
			} catch (err: unknown) {
				reject(err instanceof Error ? err : new Error(String(err)));
			}
		});
	}
	//The pattern can be name/vers
	search(pattern: string): Promise<CfsPackageReference[]> {
		return new Promise<CfsPackageReference[]>((resolve, reject) => {
			try {
				const regex = new RegExp(
					"^" +
						pattern.replace(/\*/g, ".*").replace(/\//g, "\\/") +
						"$"
				);
				resolve(
					mockData.allAvailablePackages.filter(
						(pkg: CfsPackageReference) =>
							regex.test(`${pkg.name}/${pkg.version}`)
					)
				);
			} catch (err) {
				reject(err instanceof Error ? err : new Error(String(err)));
			}
		});
	}
	getPackageInfo(
		reference: CfsPackageReference
	): Promise<CfsPackage> {
		return new Promise<CfsPackage>((resolve, reject) => {
			try {
				const packageInfo = mockData.detailedPackageInfo.find(
					(pkg: CfsPackage) =>
						pkg.reference.name === reference.name &&
						pkg.reference.version === reference.version
				);
				if (!packageInfo) {
					throw new Error(
						`Package ${reference.name}@${reference.version} not found`
					);
				}

				resolve(packageInfo);
			} catch (err) {
				reject(err instanceof Error ? err : new Error(String(err)));
			}
		});
	}

	install(
		reference: CfsPackageReference,
		options: CfsPackageInstallOptions
	): Promise<CfsPackageReference[]> {
		throw new Error("Method not implemented.");
	}

	uninstall(pkgName: string): Promise<void> {
		throw new Error("Method not implemented.");
	}

	delete(pattern: string): Promise<CfsPackageReference[]> {
		throw new Error("Method not implemented.");
	}

	async dependencies(
		reference: CfsPackageReference
	): Promise<CfsPackageReference[]> {
		return new Promise<CfsPackageReference[]>((resolve, reject) => {
			const packageInfo = mockData.detailedPackageInfo.find(
				(pkg: CfsPackage) =>
					pkg.reference.name === reference.name &&
					pkg.reference.version === reference.version
			);
			if (!packageInfo) {
				reject(
					Error(
						`Package ${reference.name}@${reference.version} not found`
					)
				);
			} else {
				resolve(packageInfo.dependencies);
			}
		});
	}

	getPath(pkgName: string): Promise<string> {
		throw new Error("Method not implemented.");
	}
	getVariable(
		varName: string
	): Promise<string | string[] | undefined> {
		throw new Error("Method not implemented.");
	}
	getEnvironment(pattern?: string): Promise<Record<string, string>> {
		throw new Error("Method not implemented.");
	}

	// Add missing methods to implement CfsPackageManagerProvider interface
	installFromManifest(
		manifestPath: string,
		options: CfsPackageInstallOptions
	): Promise<CfsPackageReference[]> {
		throw new Error("Method not implemented.");
	}

	checkManifest(
		manifestPath: string
	): Promise<CfsPackageReference[]> {
		throw new Error("Method not implemented.");
	}

	getIndexFilePath(): string {
		throw new Error("Method not implemented.");
	}

	getInstalledPackageInfo(
		filter?: Record<string, string | string[]>
	): Promise<CfsInstalledPackage[]> {
		throw new Error("Method not implemented.");
	}
}

describe("Additional DummyPkgManager functionality tests", () => {
	const packman = new DummyPkgManager();

	it("should return an empty array when listing with a non-matching pattern", async function () {
		const noMatches = await packman.list("nonexistent*");
		expect(noMatches).to.be.an("array");
		expect(noMatches.length).to.be.equal(0);
	});

	it("should retrieve dependencies for an existing package", async function () {
		const dependencies = await packman.dependencies({
			name: "msdk",
			version: "1.0.0"
		});
		expect(dependencies).to.be.an("array");
		expect(dependencies.length).to.be.greaterThan(0);
		expect(dependencies[0]).to.have.property("name");
		expect(dependencies[0]).to.have.property("version");
	});

	it("should return an empty array for a package with no dependencies", async function () {
		const dependencies = await packman.dependencies({
			name: "cmake",
			version: "3.31.6"
		});
		expect(dependencies).to.be.an("array");
		expect(dependencies.length).to.be.equal(0);
	});

	it("should throw an error when retrieving dependencies for a package with invalid version", async function () {
		try {
			await packman.dependencies({
				name: "msdk",
				version: "invalid-version"
			});
			throw new Error("Expected error was not thrown");
		} catch (err) {
			if (err instanceof Error) {
				expect(err.message).to.match(
					/Package msdk@invalid-version not found/
				);
				return;
			}
			throw new Error("Expected error to be of type `Error`");
		}
	});

	it("should handle special characters in search patterns", async function () {
		const specialCharPackages = await packman.search("zephyr/4.*");
		expect(specialCharPackages).to.be.an("array");
		expect(specialCharPackages.length).to.be.equal(1);
	});

	it("should correctly handle case sensitivity in search patterns", async function () {
		const caseInsensitiveSearch = await packman.search("MSDK");
		expect(caseInsensitiveSearch.length).to.be.equal(0);
	});
});
