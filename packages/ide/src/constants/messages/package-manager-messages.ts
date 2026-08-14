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

import type { NotificationType, RequestType } from "vscode-messenger-common";
import type {
  CfsCachedPackage,
  CfsPackage,
  CfsPackageInstallOptions,
  CfsPackageReference,
} from "cfs-package-manager";

export const signInRequest: RequestType<void, void> = {
  method: "sign-in",
};

export const getLoggedInStatusRequest: RequestType<
  void,
  { loggedIn: boolean }
> = {
  method: "get-logged-in-status",
};

export const isLoggedInStatusType: NotificationType<{
  loggedIn: boolean;
  authSignature?: string;
}> = {
  method: "logged-in-status-updated",
};

export const packageManagerRemotesUpdatedType: NotificationType<void> = {
  method: "package-manager-remotes-updated",
};

export type PackageListEntryState =
  | "installed"
  | "installing"
  | "not-installed"
  | "installation-failed";

/**
 * One row in the package list — a single package (by name) with the
 * lightweight information needed to render a collapsed card and drive
 * pagination. Detailed metadata is fetched separately via
 * {@link getPackageDetailsRequest}.
 *
 * Note: this is the list of *packages*, unrelated to the SoC/hardware
 * catalog (`CatalogManager`, `SocCatalog`) from `cfs-lib`/`cfs-ccm-lib`.
 */
export type PackageListEntry = {
  /** Package name (one list entry per name). */
  name: string;
  /** All available versions for this package. */
  versions: string[];
  /** True if the package appears in a workspace .cfsdependencies manifest. */
  isRequired: boolean;
  /** All version constraints declared across workspace manifests, if any. */
  requiredVersions?: string[];
  /** The installed version, if this package is installed. */
  installedVersion?: string;
  /** Versions present in the local conan cache. */
  cachedVersions: string[];

  builtIn?: boolean;
  /** Version string from the SDK-bundled tool.json, if the SDK includes a bundled version for this package. */
  builtInVersion?: string;
  /** The current state of this package in the IDE. */
  state: PackageListEntryState;
};

export type GetPackageListParams = {
  /** Optional name pattern from the search box. */
  pattern?: string;
};

/**
 * A workspace-required package the user has no access to: it is declared in a
 * manifest but absent from the catalog search results.
 */
export type MissingRequiredPackage = {
  /** Package name. */
  name: string;
  /** Required version constraints declared across workspace manifests. */
  versions: string[];
};

export type GetPackageListResponse = {
  /** Ordered package list */
  packageList: PackageListEntry[];
  /** Required packages absent from the catalog search (no access). */
  missingRequiredPackages: MissingRequiredPackage[];
};

/**
 * Fetches the full, ordered package list. Cheap: built from `search` +
 * `listCache` + manifest reads, with no per-package metadata. Detailed
 * metadata (incl. soc/type used for filtering) is fetched separately via
 * {@link getPackageDetailsRequest}.
 */
export const getPackageListRequest: RequestType<
  GetPackageListParams,
  GetPackageListResponse
> = {
  method: "get-package-list",
};

export type GetPackageDetailsParams = {
  /** Exact references to fetch detailed metadata for (one page worth). */
  references: CfsPackageReference[];
};

export type GetPackageDetailsResponse = {
  packages: CfsPackage[];
};

/**
 * Fetches detailed metadata for a set of packages — typically the references
 * on the currently visible page. Expensive relative to the package list.
 */
export const getPackageDetailsRequest: RequestType<
  GetPackageDetailsParams,
  GetPackageDetailsResponse
> = {
  method: "get-package-details",
};

/**
 * Re-reads the local conan cache for specific packages.
 */
export const getPackageCacheStateRequest: RequestType<
  { names: string[] },
  { cached: CfsCachedPackage[] }
> = {
  method: "get-package-cache-state",
};

/** A single SoC option for the package filters dropdown. */
export type SocFilterOption = {
  id: string;
  name: string;
};

export type GetSocListResponse = {
  socs: SocFilterOption[];
};

/**
 * Fetches the list of SoCs, used to populate the SoC filter.
 */
export const getSocListRequest: RequestType<void, GetSocListResponse> = {
  method: "get-soc-list",
};

export type OpenLicensePreviewParams = {
  name: string;
  version: string;
  license: string;
};

export const openLicensePreviewRequest: RequestType<
  OpenLicensePreviewParams,
  void
> = {
  method: "open-license-preview",
};

export type FetchLicenseDataResponse = {
  packageName: string;
  version: string;
  licenseId: string;
  licenseText?: string;
  url?: string;
};

export const fetchLicenseDataRequest: RequestType<
  { name: string; version: string },
  FetchLicenseDataResponse
> = {
  method: "fetch-license-data",
};

export const uninstallPackagesRequest: RequestType<
  { names: string[] },
  { successful: boolean; uninstalledNames: string[] }
> = {
  method: "uninstall-packages",
};

export const installPackagesRequest: RequestType<
  { packages: CfsPackageReference[]; options: CfsPackageInstallOptions },
  {
    successful: boolean;
    /** The packages this call actually installed. */
    installed: CfsPackageReference[];
    /**
     * Requested packages the backend skipped because they were already
     * installed at the requested version
     */
    alreadyInstalled: CfsPackageReference[];
  }
> = {
  method: "install-packages",
};

export const getPackageDependentsRequest: RequestType<
  { reference: CfsPackageReference },
  CfsPackageReference[]
> = {
  method: "get-package-dependents",
};

/**
 * Resolves the full dependency closure (direct and transitive) of each given
 * package, using the package manager's dependency resolver.
 *
 * Every reference is resolved as a root of a single dependency graph, so the
 * whole set costs one backend invocation rather than one per package. Resolving
 * per package would not overlap the work anyway — the package manager
 * serializes its calls behind a cross-process lock.
 *
 * The response is keyed by `name/version` of each requested reference, and every
 * requested reference is present as a key.
 */
export const getPackageDependenciesBatchRequest: RequestType<
  { references: CfsPackageReference[] },
  Record<string, CfsPackageReference[]>
> = {
  method: "get-package-dependencies-batch",
};

export const HIDE_UNINSTALL_CONFIRMATION_KEY =
  "packman.hideUninstallConfirmation";

export const getPreferenceRequest: RequestType<{ key: string }, boolean> = {
  method: "get-preference",
};

export const setPreferenceRequest: RequestType<
  { key: string; value: boolean },
  void
> = {
  method: "set-preference",
};
