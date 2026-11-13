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

import {
  CfsApiClient,
  DefaultConanCloudsmithRemotesProvider,
  RemotesProviderWithFallback,
  PackageLicenseReporter,
  MyAnalogConanCloudsmithRemotesProvider,
  type TokenAuthSession,
} from "cfs-lib";
import type {
  CfsPackageLicenseReporter,
  CfsPackageLicenseInfo,
  CfsPackageManifest,
  CfsPackageManagerProvider,
  CfsPackageReference,
  CfsPackageRemote,
  CfsPackageRemoteConfigError,
  CfsPackageRemotesProvider,
  CfsSkippedPackageInfo,
} from "cfs-package-manager";
import {
  getSkippedPackageReasonMessage,
  MANIFEST_FILE_NAME,
} from "cfs-package-manager";
import {} from "cfs-package-manager";
import * as fg from "fast-glob";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import type { CustomRemoteFailure } from "cfs-lib";
import type {
  PackageManagerRemote,
  PackageManagerRemoteError,
} from "../constants/messages/package-manager-messages";
import type { CustomRemoteCatalogService } from "./custom-remote-catalog";
import type { AuthService } from "../services/auth-service";
import { logger } from "./logger";
import { Utils } from "./utils";

type LicenseAction =
  | "accept"
  | "open"
  | "view"
  | "back"
  | "cancel"
  | "open-url";
type LicenseQuickPickItem = vscode.QuickPickItem & {
  action?: LicenseAction;
  licenseIndex?: number;
  blockedAccept?: boolean;
  externalUrl?: string;
};

export interface LicensePromptOptions {
  quickPick?: vscode.QuickPick<LicenseQuickPickItem>;
  acceptDescription?: string;
}

/**
 * Builds a plaintext representation of one package license.
 */
function buildLicenseSection(pkg: CfsPackageLicenseInfo): {
  header: string;
  content: string;
  fileNameStem: string;
} {
  const header = `${pkg.reference.name}/${pkg.reference.version} - ${pkg.license} License`;
  const content =
    pkg.licenseText ?? `This package uses the ${pkg.license} license.`;
  const fileNameStem = `${pkg.reference.name}-${pkg.reference.version}`
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return { header, content, fileNameStem: fileNameStem || "license" };
}

function extractLicenseUrlsInOrder(content: string): string[] {
  const matches = content.match(/https?:\/\/\S+/g) ?? [];
  const cleaned = matches.map((match) => match.replace(/[.,;:)}>"'\]]+$/, ""));
  const seen = new Set<string>();
  return cleaned.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

async function openLicenseSectionsInEditor(
  licenseSections: Array<{
    header: string;
    content: string;
    fileNameStem: string;
  }>,
  targetViewColumn: vscode.ViewColumn,
): Promise<void> {
  const tempRoot = vscode.Uri.file(
    path.dirname(Utils.getTempCfsWorkspacePath().fsPath),
  );
  await vscode.workspace.fs.createDirectory(tempRoot);

  for (const section of licenseSections) {
    const fileName = `${section.fileNameStem}.txt`;
    const fileUri = vscode.Uri.joinPath(tempRoot, fileName);
    await vscode.workspace.fs.writeFile(
      fileUri,
      new TextEncoder().encode(`${section.header}\n\n${section.content}`),
    );

    const doc = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: targetViewColumn,
    });
  }
}

/**
 * Displays package license text in a QuickPick and prompts user to accept or
 * open the license text. Returns true when accepted, false otherwise.
 */
export async function promptForPackageLicenseAcceptance(
  packages: CfsPackageLicenseInfo[],
  options?: LicensePromptOptions,
): Promise<boolean> {
  const licenseSections = packages.map((pkg) => buildLicenseSection(pkg));
  const isMultipleLicenses = packages.length > 1;
  const viewedLicenseIndexes = new Set<number>();
  const requiresAllViewedBeforeAccept = licenseSections.length > 0;
  let currentLicenseIndex: number | undefined;

  const acceptLabel = isMultipleLicenses
    ? "$(check) Accept All"
    : "$(check) Accept";
  const acceptDescription =
    options?.acceptDescription ??
    (isMultipleLicenses
      ? `Accept ${packages.length} license agreements and install required packages`
      : "Accept the license and install required packages");
  const viewRequirementLabel = isMultipleLicenses
    ? "all licenses"
    : "the license";
  const quickPick =
    options?.quickPick ?? vscode.window.createQuickPick<LicenseQuickPickItem>();
  const isExternalQuickPick = options?.quickPick !== undefined;

  const allLicensesViewed = (): boolean =>
    viewedLicenseIndexes.size === licenseSections.length;

  const markLicenseViewed = (licenseIndex: number): void => {
    viewedLicenseIndexes.add(licenseIndex);
  };

  const markAllLicensesViewed = (): void => {
    licenseSections.forEach((_, index) => viewedLicenseIndexes.add(index));
  };

  const getLicenseStatusDescription = (licenseIndex: number): string =>
    viewedLicenseIndexes.has(licenseIndex) ? "Viewed" : "View here";

  const getAcceptButtonLabel = (): string =>
    allLicensesViewed()
      ? acceptLabel
      : isMultipleLicenses
        ? "$(lock) Accept All"
        : "$(lock) Accept";

  const getAcceptButtonDescription = (): string =>
    allLicensesViewed()
      ? acceptDescription
      : `View ${viewRequirementLabel} first (${viewedLicenseIndexes.size}/${licenseSections.length} viewed)`;

  const getPlaceholderText = (): string => {
    if (!requiresAllViewedBeforeAccept) {
      return "View the license below then choose an action";
    }

    if (allLicensesViewed()) {
      return isMultipleLicenses
        ? "All licenses viewed. Select Accept All to continue."
        : "License viewed. Select Accept to continue.";
    }

    return `View each license before continuing (${viewedLicenseIndexes.size}/${licenseSections.length} viewed)`;
  };

  const buildAcceptItem = (): LicenseQuickPickItem => ({
    label: getAcceptButtonLabel(),
    description: getAcceptButtonDescription(),
    action: "accept",
    alwaysShow: true,
    blockedAccept: !allLicensesViewed(),
  });

  const updatePlaceholder = () => {
    quickPick.placeholder = getPlaceholderText();
  };

  const buildListViewItems = (): LicenseQuickPickItem[] => [
    {
      kind: vscode.QuickPickItemKind.Separator,
      label: "Licenses",
    } as LicenseQuickPickItem,
    ...licenseSections.map(
      (section, index) =>
        ({
          label: `$(book) ${section.header}`,
          description: getLicenseStatusDescription(index),
          action: "view",
          licenseIndex: index,
          alwaysShow: true,
        }) as LicenseQuickPickItem,
    ),
    {
      kind: vscode.QuickPickItemKind.Separator,
      label: "Actions",
    } as LicenseQuickPickItem,
    {
      label: isMultipleLicenses
        ? "$(go-to-file) View Licenses In Editor Windows"
        : "$(go-to-file) View License In Editor Window",
      action: "open",
      alwaysShow: true,
    },
    buildAcceptItem(),
    {
      label: "$(close) Cancel",
      description: "Cancel package installation",
      action: "cancel",
      alwaysShow: true,
    },
  ];

  const buildDetailViewItems = (
    licenseIndex: number,
  ): LicenseQuickPickItem[] => {
    const section = licenseSections[licenseIndex];
    const contentLines = section.content.split("\n");
    const licenseUrls = extractLicenseUrlsInOrder(section.content);
    const detailActionsBottom: LicenseQuickPickItem[] = [
      {
        label: "$(arrow-left) Back To License List",
        action: "back",
        alwaysShow: true,
      },
      buildAcceptItem(),
      {
        label: "$(close) Cancel",
        description: "Cancel package installation",
        action: "cancel",
        alwaysShow: true,
      },
    ];
    const detailActionsTop: LicenseQuickPickItem[] = [
      {
        label: "$(go-to-file) View License In Editor Window",
        action: "open",
        licenseIndex,
        alwaysShow: true,
      },
      ...detailActionsBottom,
    ];

    return [
      ...detailActionsTop,
      ...(licenseUrls.length > 0
        ? [
            {
              kind: vscode.QuickPickItemKind.Separator,
              label: "License Links",
            } as LicenseQuickPickItem,
            ...licenseUrls.map(
              (url) =>
                ({
                  label: `$(link-external) Open`,
                  description: url,
                  action: "open-url",
                  externalUrl: url,
                  alwaysShow: true,
                }) as LicenseQuickPickItem,
            ),
          ]
        : []),
      {
        kind: vscode.QuickPickItemKind.Separator,
        label: "License Text",
      } as LicenseQuickPickItem,
      ...contentLines.map(
        (line) =>
          ({
            label: line.trim() === "" ? " " : line,
            alwaysShow: true,
          }) as LicenseQuickPickItem,
      ),
      {
        kind: vscode.QuickPickItemKind.Separator,
        label: "Actions",
      } as LicenseQuickPickItem,
      ...detailActionsBottom,
    ];
  };

  quickPick.title = "CFS: License Acceptance Required";
  updatePlaceholder();
  quickPick.ignoreFocusOut = true;
  quickPick.items = buildListViewItems();
  quickPick.busy = false;
  quickPick.show();

  return new Promise<boolean>((resolve) => {
    let settled = false;

    const settle = (result: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    quickPick.onDidAccept(async () => {
      const [selected] = quickPick.selectedItems as LicenseQuickPickItem[];
      if (!selected) {
        return;
      }

      if (selected.blockedAccept) {
        vscode.window.showWarningMessage(
          `View ${viewRequirementLabel} before accepting (${viewedLicenseIndexes.size}/${licenseSections.length} viewed).`,
        );
        return;
      }

      if (!selected.action) {
        return;
      }

      if (selected.action === "open") {
        const targetViewColumn =
          vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
        if (typeof selected.licenseIndex === "number") {
          markLicenseViewed(selected.licenseIndex);
          await openLicenseSectionsInEditor(
            [licenseSections[selected.licenseIndex]],
            targetViewColumn,
          );
        } else {
          markAllLicensesViewed();
          await openLicenseSectionsInEditor(licenseSections, targetViewColumn);
        }
        quickPick.items =
          typeof currentLicenseIndex === "number"
            ? buildDetailViewItems(currentLicenseIndex)
            : buildListViewItems();
        updatePlaceholder();
        quickPick.show();
        return;
      }

      if (selected.action === "view") {
        if (typeof selected.licenseIndex === "number") {
          markLicenseViewed(selected.licenseIndex);
          currentLicenseIndex = selected.licenseIndex;
          quickPick.items = buildDetailViewItems(selected.licenseIndex);
          updatePlaceholder();
          quickPick.show();
        }
        return;
      }

      if (selected.action === "back") {
        currentLicenseIndex = undefined;
        quickPick.items = buildListViewItems();
        updatePlaceholder();
        quickPick.show();
        return;
      }

      if (selected.action === "cancel") {
        settle(false);
        quickPick.dispose();
        return;
      }

      if (selected.action === "open-url") {
        if (selected.externalUrl) {
          await vscode.env.openExternal(vscode.Uri.parse(selected.externalUrl));
          quickPick.show();
        }
        return;
      }

      settle(true);
      quickPick.dispose();
    });

    quickPick.onDidHide(() => {
      settle(false);
      // We own internally-created QuickPicks and must dispose them to avoid leaks.
      if (!isExternalQuickPick) {
        quickPick.dispose();
      }
    });
  });
}

/**
 * Creates the package manager remotes provider and license reporter.
 * @param authService - Provides the CCM URL
 * @param session - The myAnalog session, or undefined to use anonymous access
 * @returns Tuple of [remotes provider, license reporter | undefined]. The
 * license reporter is only present when a session is given.
 */
export function getPackageManagerProviders(
  authService: AuthService,
  session?: TokenAuthSession,
): [CfsPackageRemotesProvider, CfsPackageLicenseReporter | undefined] {
  let apiClient: CfsApiClient;
  try {
    apiClient = new CfsApiClient({
      baseUrl: authService.config?.ccmUrl,
      authorizer: session?.authorizer,
    });
  } catch (error) {
    console.error("Failed to create API client:", error);
    vscode.window.showWarningMessage(
      "Failed to create API client for package manager. Using default remotes.",
    );
    return [new DefaultConanCloudsmithRemotesProvider(), undefined];
  }

  // The cloud remotes are only fetched on the first package operation, so
  // creating the provider does not block on a network request.
  const remotesProvider = new RemotesProviderWithFallback(
    new MyAnalogConanCloudsmithRemotesProvider(apiClient),
    new DefaultConanCloudsmithRemotesProvider(),
    (error: unknown) => {
      logger.warn(
        "Failed to initialize cloud package remotes provider, falling back to default remotes:",
        error,
      );
    },
  );

  return [
    remotesProvider,
    apiClient.isAnonymous ? undefined : new PackageLicenseReporter(apiClient),
  ];
}

/** Serializes concurrent calls to {@link syncPackageManagerCredentials}. */
let syncCredentialsQueue: Promise<void> = Promise.resolve();

/**
 * Syncs credential provider and license reporter on the package manager
 * to match the current auth session. Registers providers when logged in,
 * unregisters or replaces them when logged out or switching accounts.
 * Call this after any login or logout event, whether triggered by the IDE
 * commands or the CLI.
 *
 * All concurrent calls are serialized to prevent interleaved
 * register/unregister cycles from leaving stale credentials.
 *
 * @param pkgManager - The package manager provider instance
 * @param authService - Provides the CCM URL
 * @param session - The currently registered session, if any; undefined when logged out
 * @returns Tuple of [remotes provider, license reporter | undefined]. The remotes
 * provider is always returned (uses anonymous auth when logged out). License
 * reporter is only present when logged in.
 */
export async function syncPackageManagerCredentials(
  pkgManager: CfsPackageManagerProvider,
  authService: AuthService,
  session?: TokenAuthSession,
): Promise<[CfsPackageRemotesProvider, CfsPackageLicenseReporter | undefined]> {
  let releaseLock!: () => void;
  const previousSync = syncCredentialsQueue;
  syncCredentialsQueue = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  await previousSync;

  try {
    await pkgManager.unregisterLicenseReporter();
    await pkgManager.unregisterRemotesProvider();

    const [remotesProvider, licenseReporter] = await getPackageManagerProviders(
      authService,
      session,
    );
    await pkgManager.registerRemotesProvider(remotesProvider);
    if (licenseReporter) {
      await pkgManager.registerLicenseReporter(licenseReporter);
    }
    return [remotesProvider, licenseReporter];
  } finally {
    releaseLock();
  }
}

/**
 * Reads and parses a manifest file, returning all declared packages.
 * This is a pure file operation — no Python backend is invoked.
 * Version strings are returned as-is, including semver ranges (e.g. ^1.0, ~1.2).
 *
 * @param manifestPath - Absolute path to the manifest file
 * @returns Array of all package references declared in the manifest
 * @throws Error if the file cannot be read or has an invalid format
 */
export function getManifestPackages(
  manifestPath: string,
): CfsPackageReference[] {
  let raw: string;
  try {
    raw = fs.readFileSync(manifestPath, "utf-8");
  } catch (err) {
    throw new Error(
      `Failed to read manifest file '${manifestPath}': ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in manifest file '${manifestPath}'.`);
  }

  if (
    typeof manifest !== "object" ||
    manifest === null ||
    !Array.isArray((manifest as CfsPackageManifest).packages)
  ) {
    throw new Error(
      `Invalid manifest format in '${manifestPath}'. ` +
        "Expected an object with a 'packages' array.",
    );
  }

  return (manifest as CfsPackageManifest).packages;
}

/**
 * Reads every `.cfsdependencies` manifest in the workspace and returns a map
 * of package name to all required version constraints collected across manifests.
 * Pure file reads — no conan calls.
 * @returns A map of package name to the version constraints declared for it.
 */
export async function getRequiredPackages(): Promise<Map<string, string[]>> {
  const required = new Map<string, string[]>();

  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return required;
  }

  const manifestPathLists = await Promise.all(
    folders.map((folder) =>
      fg.async(`**/${MANIFEST_FILE_NAME}`, {
        cwd: folder.uri.fsPath,
        absolute: true,
        dot: true,
        onlyFiles: true,
        suppressErrors: true,
        // Package folders added to the workspace carry large trees that can
        // never hold a manifest, and west checkouts carry one `.git` per module.
        ignore: ["**/node_modules/**", "**/.git/**"],
      }),
    ),
  );

  for (const manifestPath of manifestPathLists.flat()) {
    try {
      for (const pkg of getManifestPackages(manifestPath)) {
        const existing = required.get(pkg.name);
        if (existing) {
          existing.push(pkg.version);
        } else {
          required.set(pkg.name, [pkg.version]);
        }
      }
    } catch {
      // Ignore buggy/malformed manifests
    }
  }

  return required;
}

/**
 * Shows a warning message for packages that were skipped due to platform compatibility.
 * @param compatibilitySkipped - Array of skipped packages
 */
export function showSkippedPackagesWarning(
  compatibilitySkipped: CfsSkippedPackageInfo[],
): void {
  if (compatibilitySkipped.length > 0) {
    const skippedList = compatibilitySkipped
      .map(
        (s) =>
          `${s.reference.name}/${
            s.reference.version
          }: ${getSkippedPackageReasonMessage(s.reasonCode)}`,
      )
      .join("; ");
    vscode.window.showWarningMessage(
      `CFS: Skipped ${compatibilitySkipped.length} package${
        compatibilitySkipped.length > 1 ? "s" : ""
      }: ${skippedList}`,
    );
  }
}

/**
 * Normalizes an error message for user-facing display:
 * - Replaces uppercase "ERROR:" prefixes with "Error:"
 * - Ensures the message ends with a sentence-terminating punctuation mark
 * - Prepends a leading space so it can be appended directly to a base message
 *
 * Returns an empty string when the error is not an Error instance or string,
 * or has no message.
 */
export function formatErrorForDisplay(error: unknown): string {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const errorMessage = rawMessage
    .replace(/(^|\s)ERROR:\s*/gi, "$1Error: ")
    .replace(/\r/g, "") // Remove actual carriage return bytes
    .trim();
  if (!errorMessage) {
    return "";
  }
  return /[.!?]$/.test(errorMessage) ? ` ${errorMessage}` : ` ${errorMessage}.`;
}

/**
 * The Conan home of the package manager, where Conan keeps its remotes.
 * @param pkgManager - the package manager
 * @returns the directory
 */
export function getConanHome(pkgManager: CfsPackageManagerProvider): string {
  return path.join(path.dirname(pkgManager.getIndexFilePath()), "conan");
}

/** The message of an error of unknown type. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Describes what keeps a remote from working, if anything. A remote Conan
 * couldn't be set up for can't be indexed either, so its config error wins.
 */
function toRemoteError(
  configError: CfsPackageRemoteConfigError | undefined,
  failure: CustomRemoteFailure | undefined,
): PackageManagerRemoteError | undefined {
  if (configError) {
    // The message only names the step that failed; the cause says why.
    const cause = "cause" in configError ? configError.cause : undefined;

    return {
      kind: configError.code === "REMOTE_AUTH_FAILED" ? "auth" : "config",
      message: errorMessage(cause ?? configError),
    };
  }

  if (failure) {
    return {
      kind: failure.auth ? "auth" : "fetch",
      message: errorMessage(failure.error),
    };
  }

  return undefined;
}

/**
 * Flattens a remote so it can cross the messenger boundary.
 * @param remote - the remote
 * @param failure - why the last update could not index it, if it couldn't
 */
function toWebviewRemote(
  remote: CfsPackageRemote,
  failure: CustomRemoteFailure | undefined,
): PackageManagerRemote {
  // A disabled remote isn't indexed, so an earlier failure no longer applies.
  const error = toRemoteError(
    remote.configError,
    remote.disabled ? undefined : failure,
  );
  const flattened: PackageManagerRemote = {
    name: remote.name,
    url: remote.url.href,
    disabled: remote.disabled,
    custom: remote.custom,
    ...(error && { error }),
  };

  if (!remote.auth) {
    return flattened;
  }

  if (remote.auth.public) {
    return { ...flattened, auth: "none" };
  }

  return "username" in remote.auth
    ? { ...flattened, auth: "usernamePassword", username: remote.auth.username }
    : { ...flattened, auth: "myAnalog" };
}

/**
 * Lists the remotes for the webview: custom ones first, then managed ones,
 * each alphabetical.
 */
export async function listWebviewRemotes(
  pkgManager: CfsPackageManagerProvider,
  customRemoteCatalog: CustomRemoteCatalogService | undefined,
): Promise<PackageManagerRemote[]> {
  const remotes = await pkgManager.listRemotes();

  return remotes
    .map((remote) =>
      toWebviewRemote(remote, customRemoteCatalog?.getFailure(remote.name)),
    )
    .sort(
      (a, b) =>
        Number(b.custom) - Number(a.custom) || a.name.localeCompare(b.name),
    );
}
