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
  PackageLicenseReporter,
  SessionManager,
  MyAnalogCloudsmithCredentialProvider,
} from "cfs-lib";
import type {
  CfsPackageLicenseReporter,
  CfsPackageLicenseInfo,
  CfsPackageManifest,
  CfsPackageReference,
  CfsPackageRemoteCredentialProvider,
} from "cfs-package-manager";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { AuthConfigParser } from "../utils/auth-config";
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

export async function getPackageManagerProviders(): Promise<
  [CfsPackageRemoteCredentialProvider, CfsPackageLicenseReporter] | undefined
> {
  const authConfig = new AuthConfigParser().getConfig();
  const sessionManager = new SessionManager(authConfig);
  const session = await sessionManager.getSession();
  if (session) {
    const apiClient = new CfsApiClient({
      baseUrl: authConfig.ccmUrl,
      authorizer: session.authorizer,
    });
    return [
      new MyAnalogCloudsmithCredentialProvider(apiClient),
      new PackageLicenseReporter(apiClient),
    ];
  }
  return undefined;
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
