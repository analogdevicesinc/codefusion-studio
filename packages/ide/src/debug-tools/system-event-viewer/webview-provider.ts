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

import * as vscode from "vscode";
import { readFileSync } from "fs";
import { CfsDebugManager, CfsDebugSession } from "../debug-manager";
import { EventNode, EventTreeDataProvider } from "./tree-provider";
import { getUri } from "../../utils/getUri";
import { getNonce } from "../../utils/getNonce";

const INFO_CARD_ID = "set-info-card";
const TREE_DATA_CHANGE_ID = "tree-data-change";
const GET_CHILDREN_REQ_ID = "get-children";
const GET_TREE_ITEM_REQ_ID = "get-tree-item";
const SET_NODE_CHECKBOX_REQ_ID = "set-node-checkbox";
const READY_EVENT_ID = "sev-ready";

type SevContentCard = {
  icon: "info" | "error";
  title: string;
  description?: string;
};

type GetChildrenMessage = {
  id: number;
  type: typeof GET_CHILDREN_REQ_ID;
  body?: {
    element?: EventNode;
  };
};

type GetTreeItemMessage = {
  id: number;
  type: typeof GET_TREE_ITEM_REQ_ID;
  body: {
    element: EventNode;
  };
};

type SetNodeCheckboxMessage = {
  id: number;
  type: typeof SET_NODE_CHECKBOX_REQ_ID;
  body: {
    node: EventNode;
    value: boolean;
  };
};

type ReadyMessage = {
  type: typeof READY_EVENT_ID;
};

type SevWebviewRequest =
  | GetChildrenMessage
  | GetTreeItemMessage
  | SetNodeCheckboxMessage
  | ReadyMessage;

type SevStateChangeMessage = {
  type: typeof INFO_CARD_ID;
  content?: SevContentCard;
};

export class SystemEventViewerWebviewProvider
  implements vscode.WebviewViewProvider, vscode.Disposable
{
  private readonly disposables: vscode.Disposable[] = [];

  private debugSession: CfsDebugSession | undefined = undefined;
  private readonly sessionDisposables: vscode.Disposable[] = [];

  // Another smell that this should be multiple classes.
  // This event should be part of a "view" not a "view provider".
  private _onDidChangeCheckboxState: vscode.EventEmitter<
    vscode.TreeCheckboxChangeEvent<EventNode>
  > = new vscode.EventEmitter<vscode.TreeCheckboxChangeEvent<EventNode>>();

  /**
   * An event to signal that an element or root has either been checked or unchecked.
   */
  readonly onDidChangeCheckboxState: vscode.Event<
    vscode.TreeCheckboxChangeEvent<EventNode>
  > = this._onDidChangeCheckboxState.event;

  constructor(
    private readonly debugManager: CfsDebugManager, // provides debug session lifecycle/state events.
    private readonly treeDataProvider: EventTreeDataProvider, // provides event-source tree data for webview requests.
    private readonly extensionUri: vscode.Uri,
  ) {}

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const { webview } = webviewView;

    // Setup message handler before loading the webview to ensure we can handle incoming messages as soon as the webview is ready
    this.disposables.push(
      webview.onDidReceiveMessage(async (message: SevWebviewRequest) => {
        await this.handleWebviewMessage(message, webview);
      }),
    );

    // Clean up. Everything will be restored on next call to resolveWebviewView.
    // This smells like this logic should go into a "webview view controller" class,
    // so the "provider" dispose and the "controller" dispose are separate, but since
    // the only purpose of provider is to resolve the webview view, both classes are
    // merged for the moment.
    this.disposables.push(webviewView.onDidDispose(() => this.dispose()));

    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    // Create the promise before loading the webview, then await until it is ready
    const readyPromise = this.waitForWebviewReady(webview, 10000);
    webview.html = this.getWebviewHtml(webview, this.extensionUri);
    await readyPromise;

    // At this point webview should be ready and responsive
    this.disposables.push(
      this.debugManager.onDidChangeActiveDebugSession((session) => {
        this.handleSessionChange(session, webview);
      }),
    );

    this.disposables.push(
      this.treeDataProvider.onDidChangeTreeData((element) => {
        void webview.postMessage({
          type: TREE_DATA_CHANGE_ID,
          body: element?.path,
        });
      }),
    );

    const activeSession = this.debugManager.getActiveSession();

    this.handleSessionChange(activeSession, webview);
  }

  private async waitForWebviewReady(
    webview: vscode.Webview,
    timeout?: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let timeoutHandle: NodeJS.Timeout | undefined = undefined;
      if (timeout !== undefined) {
        timeoutHandle = setTimeout(() => {
          disposable.dispose();
          reject(
            new Error(
              `Timeout: Webview did not signal ready within ${timeout} ms`,
            ),
          );
        }, timeout);
      }

      const disposable = webview.onDidReceiveMessage((message) => {
        if (message.type === READY_EVENT_ID) {
          disposable.dispose();
          if (timeoutHandle !== undefined) {
            clearTimeout(timeoutHandle);
          }
          resolve();
        }
      });
    });
  }

  public dispose(): void {
    this.sessionDisposables.forEach((disposable) => {
      disposable.dispose();
    });
    this.sessionDisposables.length = 0;

    this.disposables.forEach((disp) => disp.dispose());
    this.disposables.length = 0;

    this.debugSession = undefined;
  }

  // Try re-using the getWebviewHtml from AbstractViewProvider
  private getWebviewHtml(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
  ): string {
    let translations = vscode.l10n.bundle;

    if (!translations) {
      const translationUri = getUri(webview, extensionUri, [
        "l10n",
        "bundle.l10n.en.json",
      ]);
      const enJSON = readFileSync(translationUri.fsPath);
      translations = JSON.parse(enJSON.toString("utf8"));
    }

    const scriptUri = getUri(webview, extensionUri, [
      "out",
      "system-event-viewer-treeview",
      "index.js",
    ]);

    const stylesUri = getUri(webview, extensionUri, [
      "out",
      "system-event-viewer-treeview",
      "index.css",
    ]);
    const nonce = getNonce();

    return `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>SEV webview</title>
        </head>
        <body>
           <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
         <script>
          window.__webview_localization_resources__ = ${JSON.stringify(translations)}
        </script>
      </html>
    `;
  }

  private handleSessionChange(
    session: CfsDebugSession | undefined,
    webview: vscode.Webview,
  ) {
    if (this.debugSession !== undefined) {
      // Clean previous session disposables
      this.sessionDisposables.forEach((disposable) => {
        disposable.dispose();
      });
      this.sessionDisposables.length = 0;
    }

    this.debugSession = session;

    if (session !== undefined) {
      this.sessionDisposables.push(
        session.onContinue(() => {
          this.handleSessionContinue(webview);
        }),
      );
      this.sessionDisposables.push(
        session.onHalt(() => {
          this.handleSessionHalt(webview);
        }),
      );
      if (session.isRunning) {
        this.handleSessionContinue(webview);
      } else {
        this.handleSessionHalt(webview);
      }
    } else {
      this.handleSessionClose(webview);
    }
  }

  private async handleWebviewMessage(
    message: SevWebviewRequest,
    webview: vscode.Webview,
  ): Promise<void> {
    if (message.type === READY_EVENT_ID) {
      // No need to respond to ready messages.
      return;
    }

    try {
      let responseBody = undefined;

      switch (message.type) {
        case GET_CHILDREN_REQ_ID:
          responseBody = this.treeDataProvider.getChildren(
            message.body?.element,
          );
          break;
        case GET_TREE_ITEM_REQ_ID:
          responseBody = await this.treeDataProvider.getTreeItem(
            message.body.element,
          );
          break;
        case SET_NODE_CHECKBOX_REQ_ID:
          const item = message.body.node;
          const checkboxState = message.body.value
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked;
          this._onDidChangeCheckboxState.fire({
            items: [[item, checkboxState]],
          });
          break;
        default:
          console.warn("Unknown message type", message);
          return;
      }

      await webview.postMessage({
        type: "api-response",
        id: message.id,
        body: responseBody,
      });
    } catch (error: any) {
      await webview.postMessage({
        type: "api-response",
        id: message.id,
        error: error?.message ?? "error",
      });
    }
  }

  private handleSessionContinue(webview: vscode.Webview): void {
    this.setInfoMessage(webview, "Stop code to select events");
  }

  private handleSessionHalt(webview: vscode.Webview): void {
    this.clearCard(webview);
  }

  private handleSessionClose(webview: vscode.Webview): void {
    this.setInfoMessage(
      webview,
      "Start Debug Session",
      "You must be in an active debug session to view the event list.",
    );
  }

  private setCard(webview: vscode.Webview, content?: SevContentCard) {
    void webview.postMessage({
      type: INFO_CARD_ID,
      content,
    } as SevStateChangeMessage);
  }

  // Utility methods used only for readability
  private clearCard(webview: vscode.Webview) {
    this.setCard(webview);
  }

  private setInfoMessage(
    webview: vscode.Webview,
    title: string,
    description?: string,
  ) {
    this.setCard(webview, {
      icon: "info",
      title,
      description,
    });
  }

  private setErrorMessage(
    webview: vscode.Webview,
    title: string,
    description?: string,
  ) {
    this.setCard(webview, {
      icon: "error",
      title,
      description,
    });
  }
}
