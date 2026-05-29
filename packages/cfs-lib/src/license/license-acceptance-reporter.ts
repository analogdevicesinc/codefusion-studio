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

import { CfsApiClient, EulaClient } from "cfs-ccm-lib";
import type {
	CfsPackageLicenseReporter,
	CfsPackageReference
} from "cfs-package-manager";

/**
 * Reports license acceptance to the backend for record keeping.
 *
 * This class uses a shared CFS API client and internal EULA client to report
 * accepted package licenses.
 *
 * @param apiClient - Pre-configured API client for the CFS backend
 *
 * @example
 * ```ts
 * const reporter = new PackageLicenseReporter(apiClient);
 * await reporter.reportLicenseAcceptance([{ name: 'my-package', version: '1.0.0' }]);
 * ```
 */
export class PackageLicenseReporter
	implements CfsPackageLicenseReporter
{
	private readonly eulaClient: EulaClient;

	constructor(apiClient: CfsApiClient) {
		this.eulaClient = new EulaClient(apiClient);
	}

	public async reportLicenseAcceptance(
		packages: CfsPackageReference | CfsPackageReference[]
	): Promise<void> {
		const pkgArray = Array.isArray(packages) ? packages : [packages];
		await Promise.all(
			pkgArray.map((pkg) => this.eulaClient.acceptEula(pkg.name, pkg.version))
		);
	}
}
