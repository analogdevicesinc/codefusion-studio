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

export { ConanPkgManager } from "./conan-backend/conan-backend.js";
export { MANIFEST_FILE_NAME } from "./constants/manifest.js";
export {
	getSkippedPackageReasonMessage,
	SKIPPED_PACKAGE_REASON_MESSAGES
} from "./utils/package-manager-skipped-reasons.js";

// types
export type {
	CfsCustomPackageRemote,
	CfsCustomPackageRemoteAuth,
	CfsPackageManagerProvider,
	CfsManagedPackageRemote,
	CfsManagedPackageRemoteAuth,
	CfsPackageRemotesProvider,
	CfsPackageRemoteConfigError,
	CfsPackageRemoteConfigErrorCode,
	CfsPackageRemoteCredentialClient,
	CfsPackageRemoteCredentialProvider,
	CfsPackageRemoteCredential,
	CfsPackageRemote,
	CfsPackageReference,
	CfsPackage,
	CfsCachedPackage,
	CfsInstalledPackage,
	CfsPackageManifest,
	CfsPackageInstallOptions,
	CfsPackageDependenciesOptions,
	CfsInstallInput,
	CfsInstallPlan,
	CfsSkippedPackageInfo,
	CfsSkippedPackageReasonCode,
	CfsPackageLicenseInfo,
	CfsPackageLicenseReporter,
	CfsPackageFilter,
	CfsPackageComponent
} from "./api/api.js";
