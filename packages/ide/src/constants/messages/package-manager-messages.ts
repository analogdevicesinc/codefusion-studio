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
  CfsDependencyConflict,
  CfsInstallInput,
  CfsInstallPlan,
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

/** A change made through the Package Manager carries the updated remotes. */
export type RemotesUpdate = { remotes?: PackageManagerRemote[] } | undefined;

export const packageManagerRemotesUpdatedType: NotificationType<RemotesUpdate> =
  {
    method: "package-manager-remotes-updated",
  };

/**
 * How a remote authenticates.
 * - `none`: public remote, no credentials needed.
 * - `myAnalog`: managed remote authenticated through the myAnalog session.
 * - `usernamePassword`: custom remote authenticated with basic credentials.
 */
export type PackageManagerRemoteAuth = "none" | "myAnalog" | "usernamePassword";

/**
 * What kind of problem keeps a remote from working.
 * - `auth`: the remote rejected its credentials, or none could be obtained.
 * - `fetch`: its packages couldn't be listed or read, e.g. it is unreachable.
 * - `config`: Conan couldn't be set up to use it.
 */
export type PackageManagerRemoteErrorKind = "auth" | "fetch" | "config";

/** A problem with a remote, as the package manager reported it. */
export type PackageManagerRemoteError = {
  kind: PackageManagerRemoteErrorKind;
  /** What the package manager reported, for the details. */
  message: string;
};

/**
 * A package remote as shown in the webview. Flattened from `CfsPackageRemote`
 * because its `URL` and `Error` members don't survive the messenger boundary.
 */
export type PackageManagerRemote = {
  name: string;
  url: string;
  disabled: boolean;
  /** `true` for user-created remotes, `false` for remotes managed by Analog Devices. */
  custom: boolean;
  /**
   * Absent for disabled custom remotes: the package manager only reports the
   * credentials of enabled ones.
   */
  auth?: PackageManagerRemoteAuth;
  /** User the remote logs in as, when `auth` is `usernamePassword`. */
  username?: string;
  /** What keeps the remote from working; absent while no problem is known. */
  error?: PackageManagerRemoteError;
};

/** Credentials to set on a custom remote. */
export type PackageManagerRemoteCredentials =
  | { auth: "none" }
  | { auth: "usernamePassword"; username: string; password: string };

/**
 * Lists the package remotes, ordered for display: custom remotes first, then
 * managed ones, each alphabetically.
 */
export const getRemotesRequest: RequestType<void, PackageManagerRemote[]> = {
  method: "get-remotes",
};

/**
 * The remote list after a change, or `undefined` when the change was applied
 * but the list couldn't be read back. The extension reports that failure, so
 * the webview only has to keep its current list.
 */
export type RemotesChangeResult = PackageManagerRemote[] | undefined;

/**
 * Adds a custom remote and logs in to it when credentials are given. A failed
 * login removes the remote again, so a failed add leaves nothing behind.
 * Resolves with the updated remote list.
 */
export const addRemoteRequest: RequestType<
  { name: string; url: string; credentials: PackageManagerRemoteCredentials },
  RemotesChangeResult
> = {
  method: "add-remote",
};

/** Deletes a custom remote. Resolves with the updated remote list. */
export const removeRemoteRequest: RequestType<
  { name: string },
  RemotesChangeResult
> = {
  method: "remove-remote",
};

/** Enables or disables a remote. Resolves with the updated remote list. */
export const setRemoteEnabledRequest: RequestType<
  { name: string; enabled: boolean },
  RemotesChangeResult
> = {
  method: "set-remote-enabled",
};

/**
 * Logs in to an enabled custom remote, or logs out of it for `auth: "none"`.
 * Resolves with the updated remote list.
 */
export const setRemoteCredentialsRequest: RequestType<
  { name: string; credentials: PackageManagerRemoteCredentials },
  RemotesChangeResult
> = {
  method: "set-remote-credentials",
};

/** The custom remotes being indexed; empty when none are. */
export type CustomRemoteIndexing = { remotes: string[] };

/** Sent when custom remote indexing starts or ends. */
export const customRemoteIndexingType: NotificationType<CustomRemoteIndexing> =
  {
    method: "custom-remote-indexing",
  };

/** The custom remotes being indexed right now. */
export const getCustomRemoteIndexingRequest: RequestType<
  void,
  CustomRemoteIndexing
> = {
  method: "get-custom-remote-indexing",
};

export type PackageListEntryState =
  | "installed"
  | "installing"
  | "not-installed";

/**
 * The catalog metadata of one package version, as rendered by the package
 * card and the review cards. Comes from the software package catalog, not
 * from Conan.
 */
export type PackageVersionMeta = {
  version: string;
  /** License id. The license text is fetched from Conan on demand. */
  license: string;
  description?: string;
  /** `plugin`, `sdk`, `toolchain`, `data-model`, `tool`, ... */
  type?: string;
  /** Semver range of CFS versions this version supports, if constrained. */
  cfsVersionConstraint?: string;
  /** SoC names this version supports; empty when not SoC specific. */
  socs: string[];
  /** Repositories (remote names) this version is published in. */
  repos: string[];
  /** Package tags, if any. */
  tags?: string[];
};

/**
 * One row in the package list: a single package (by name) with everything
 * needed to render its card: the versions, the catalog metadata of each
 * version, and the Conan-side state (installed, cached, built-in).
 *
 * Note: this is the list of *packages*, unrelated to the SoC/hardware
 * catalog (`CatalogManager`, `SocCatalog`) from `cfs-lib`/`cfs-ccm-lib`.
 */
export type PackageListEntry = {
  /** Package name (one list entry per name). */
  name: string;
  /** All available versions for this package, newest first. */
  versions: string[];
  /** Catalog metadata per version. A cached-only version has no entry. */
  releases: Record<string, PackageVersionMeta>;
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

/**
 * A workspace-required package the user has no access to: it is declared in a
 * manifest but no visible catalog version satisfies it.
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
  /** Required packages absent from the visible catalog (no access). */
  missingRequiredPackages: MissingRequiredPackage[];
};

/**
 * Fetches the full, ordered package list, built from the catalog, the
 * Conan cache, the SDK's bundled tools and the workspace manifests.
 */
export const getPackageListRequest: RequestType<void, GetPackageListResponse> =
  {
    method: "get-package-list",
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
 * Fetches every SoC in the SoC catalog, used to populate the SoC filter.
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
/**
 * Outcome of resolving the selected packages as one dependency graph.
 *
 * A version conflict is reported here rather than as a rejection: it is an
 * answer about the selection, and its structure would not survive being thrown
 * across the messenger boundary.
 */
export type DependencyResolutionResponse = {
  /** Closure per requested reference */
  dependencies: Record<string, CfsPackageReference[]>;
  /** The disputed dependency, when the failure was a version conflict. */
  conflict?: CfsDependencyConflict;
  /** Why resolution failed, absent when it succeeded. */
  failure?: string;
};

export const getPackageDependenciesBatchRequest: RequestType<
  { references: CfsPackageReference[] },
  DependencyResolutionResponse
> = {
  method: "get-package-dependencies-batch",
};

/**
 * Fetches the installation plan for a set of packages.
 * Returns the full install plan including which packages require license acceptance.
 */
export const getInstallPlanRequest: RequestType<
  { input: CfsInstallInput },
  CfsInstallPlan
> = {
  method: "get-install-plan",
};

export const HIDE_UNINSTALL_CONFIRMATION_KEY =
  "packman.hideUninstallConfirmation";

/**
 * Error message thrown when package manager is not available.
 */
export const PKG_MANAGER_NOT_AVAILABLE = "Package Manager not available";

export const getPreferenceRequest: RequestType<{ key: string }, boolean> = {
  method: "get-preference",
};

export const setPreferenceRequest: RequestType<
  { key: string; value: boolean },
  void
> = {
  method: "set-preference",
};

/**
 * Notification sent when the install progress page is shown.
 * Used to trigger the VS Code notification immediately.
 */
export const installProgressShownNotification: NotificationType<{
  packageCount: number;
  packages: CfsPackageReference[];
}> = {
  method: "install-progress-shown",
};
