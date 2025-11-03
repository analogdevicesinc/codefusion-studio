/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
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
  Disposable,
  Uri,
  ViewColumn,
  Webview,
  WebviewPanel,
  window,
} from "vscode";
import * as vscode from "vscode";

import {
  BROWSE_MSDK_EXAMPLES_COMMAND_ID,
  CONFIG_TOOLS_COMMANDS,
  ELF_EXPLORER_COMMANDS,
  OPEN_ONLINE_DOCUMENTATION_COMMAND_ID,
  OPEN_WALKTHROUGH_COMMAND_ID,
  WORKSPACE_CREATION_COMMANDS,
} from "../commands/constants";
import { YesNoEnum } from "../configurations/configureWorkspace";
import {
  BROWSE_EXAMPLES,
  CFS_IDE_OPEN_HOME_PAGE_AT_STARTUP,
  CREATE_NEW_CFS_WORKSPACE,
  EXTENSION_ID,
  GET_SOC_DOCUMENTATION_LINKS,
  OPEN_CFS_WORKSPACE,
  OPEN_ELF_FILE,
  OPEN_EXISTING_CONFIG_FILE,
  OPEN_WALKTHROUGH,
  PROJECT,
  REQUEST_HOME_PAGE_CHECKBOX_STATE,
  SHOW_HOME_PAGE_AT_STARTUP_CHECKBOX,
  TARGET,
  VIEW_ONLINE_DOCUMENTATION,
} from "../constants";
import { getNonce } from "../utils/getNonce";
import { getUri } from "../utils/getUri";
import { readFileSync } from "node:fs";
import { CatalogManager } from "../catalog/catalogManager";
import { SoC } from "cfs-ccm-lib";
import { getCatalogManager } from "../utils/catalog";

export interface Message {
  id: string;
  type: string;
  body?: Record<string, unknown>;
}

/**
 * This class manages the state and behavior of the CFS Home Page webview panel.
 */

export class HomePagePanel {
  public static currentPanel: HomePagePanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  private _catalogManager: CatalogManager | undefined;
  public readonly webview: vscode.Webview;

  /**
   * The HomePagePanel class private constructor.
   * @param panel - A reference to the webview panel
   * @param extensionUri - The URI of the directory containing the extension
   */

  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;

    this.webview = panel.webview;

    // Sets an event listener to listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Sets the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri,
    );

    // Sets an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);

    this.setConfigurationChangeListener(this._panel.webview);

    // Clean up and dispose of the catalog manager when the panel is closed
    this._disposables.push({
      dispose: () => {
        void this._catalogManager?.dispose();
      },
    });
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel will be created and displayed.
   * @param extensionUri - The URI of the directory containing the extension.
   */

  public static render(extensionUri: Uri) {
    if (HomePagePanel.currentPanel) {
      // If the webview panel already exists reveal it
      HomePagePanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        "homepagePanel",
        // Panel title
        "CFS Home Page",
        // The editor column the panel should be displayed in
        ViewColumn.One,
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          // Persists Home Page State
          retainContextWhenHidden: true,
          // Restrict the webview to only load resources from the `out` directory
          localResourceRoots: [Uri.joinPath(extensionUri, "out")],
        },
      );

      const HomeTabIcon = vscode.Uri.file(
        `${extensionUri.fsPath}/media/images/cfs-activitybar-icon.svg`,
      );

      panel.iconPath = HomeTabIcon;

      HomePagePanel.currentPanel = new HomePagePanel(panel, extensionUri);
    }
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */

  public dispose() {
    HomePagePanel.currentPanel = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) associated with the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Fetches the list of System on Chips (SoCs) from the catalog.
   * @returns A promise that resolves to an array of SoCs.
   */
  private async getSocsFromCatalog(): Promise<SoC[]> {
    let socs: SoC[] = [];

    try {
      this._catalogManager ??= await getCatalogManager();
      if (this._catalogManager) {
        await this._catalogManager.loadCatalog();
        socs = await this._catalogManager.socCatalog.getAll();
      }
    } catch (error) {
      console.error("Catalog could not be loaded.", error);
      void vscode.window.showErrorMessage(
        "Catalog Manager failed to load catalog. Catalog data unavailable.",
      );
    }

    return socs;
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   * @remarks This is also the place where references to CSS and JavaScript files are created and inserted into the webview HTML.
   * @param webview - A reference to the extension webview
   * @param extensionUri - The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be rendered within the webview panel
   */

  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    let translations = vscode.l10n.bundle;

    if (!translations) {
      const translationUri = getUri(webview, extensionUri, [
        "l10n",
        "bundle.l10n.en.json",
      ]);
      const enJSON = readFileSync(translationUri.fsPath);
      translations = JSON.parse(Buffer.from(enJSON).toString("utf8"));
    }
    const scriptUri = getUri(webview, extensionUri, [
      "out",
      "home-page",
      "index.js",
    ]);

    const stylesUri = getUri(webview, extensionUri, [
      "out",
      "home-page",
      "index.css",
    ]);
    const nonce = getNonce();

    const htmlContent = /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
        </head>
        <body>
					<div id="root"></div>
          <div id="modal-root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        <script>
          window.__webview_localization_resources__ = ${JSON.stringify(translations)}
        </script>
      </html>
    `;
    return htmlContent;
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and executes code based on the message that is recieved.
   * @param webview - A reference to the extension webview
   */

  private _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      async (message: Message) => {
        let request;
        const command = message.type;
        switch (command) {
          case CREATE_NEW_CFS_WORKSPACE:
            vscode.commands.executeCommand(
              WORKSPACE_CREATION_COMMANDS.NEW_WORKSPACE,
            );
            return;
          case OPEN_CFS_WORKSPACE:
            vscode.commands.executeCommand(
              WORKSPACE_CREATION_COMMANDS.OPEN_CFS_WORKSPACE_COMMAND_ID,
            );
            return;
          case OPEN_EXISTING_CONFIG_FILE:
            vscode.commands.executeCommand(
              CONFIG_TOOLS_COMMANDS.LOAD_CONFIG_FILE,
            );
            return;
          case OPEN_ELF_FILE:
            vscode.commands.executeCommand(ELF_EXPLORER_COMMANDS.LOAD_ELF_FILE);
            return;
          case BROWSE_EXAMPLES:
            vscode.commands.executeCommand(BROWSE_MSDK_EXAMPLES_COMMAND_ID);
            return;
          case VIEW_ONLINE_DOCUMENTATION:
            vscode.commands.executeCommand(
              OPEN_ONLINE_DOCUMENTATION_COMMAND_ID,
            );
            return;
          case OPEN_WALKTHROUGH:
            vscode.commands.executeCommand(OPEN_WALKTHROUGH_COMMAND_ID);
            return;
          case SHOW_HOME_PAGE_AT_STARTUP_CHECKBOX:
            const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
            if (message.body?.data === true) {
              conf.update(
                CFS_IDE_OPEN_HOME_PAGE_AT_STARTUP,
                YesNoEnum[YesNoEnum.Yes],
                false,
              );
            }
            if (message.body?.data === false) {
              conf.update(
                CFS_IDE_OPEN_HOME_PAGE_AT_STARTUP,
                YesNoEnum[YesNoEnum.No],
                false,
              );
            }
            return;
          case REQUEST_HOME_PAGE_CHECKBOX_STATE:
            const config = vscode.workspace.getConfiguration(EXTENSION_ID);
            const checkboxState = config.get(CFS_IDE_OPEN_HOME_PAGE_AT_STARTUP);
            if (checkboxState === "Yes") {
              webview.postMessage({
                command: "setCheckboxState",
                data: true,
              });
            }
            if (checkboxState === "No") {
              webview.postMessage({
                command: "setCheckboxState",
                data: false,
              });
            }
            return;
          case GET_SOC_DOCUMENTATION_LINKS:
            const socs = await this.getSocsFromCatalog();
            if (socs.length > 0) {
              const config = vscode.workspace.getConfiguration(EXTENSION_ID);
              const target = config.get<string>(`${PROJECT}.${TARGET}`);
              const result = (
                target ? socs.filter((soc) => soc.name === target) : socs
              )
                .filter(
                  (soc) => soc.documentation && soc.documentation.length > 0,
                )
                .flatMap((soc) => soc.documentation)
                .filter(
                  (doc, index, self) =>
                    self.findIndex((u) => u?.url === doc?.url) === index,
                );
              request = Promise.resolve(result);
            } else {
              request = Promise.reject(new Error("No SoCs found."));
            }
            break;
        }

        if (request) {
          const { body, error } = await request.then(
            (body) => ({ body, error: undefined }),
            (error) => ({ body: undefined, error: error?.message ?? "error" }),
          );

          // Send result to the webview
          await webview.postMessage({
            type: "api-response",
            id: message.id,
            body,
            error,
          });
        }
      },
      undefined,
      this._disposables,
    );
  }

  private setConfigurationChangeListener(webview: Webview) {
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (
          event.affectsConfiguration(
            EXTENSION_ID + "." + CFS_IDE_OPEN_HOME_PAGE_AT_STARTUP,
          )
        ) {
          const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
          const checkboxState = conf.get(CFS_IDE_OPEN_HOME_PAGE_AT_STARTUP);

          if (checkboxState === "Yes") {
            webview.postMessage({
              command: "setCheckboxState",
              data: true,
            });
          }
          if (checkboxState === "No") {
            webview.postMessage({
              command: "setCheckboxState",
              data: false,
            });
          }
        }
      },
    );

    this._disposables.push(configChangeListener);
  }
}
