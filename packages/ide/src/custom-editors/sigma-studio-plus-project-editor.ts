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

import * as vscode from "vscode";
import { ViewProviderPanel } from "../view-provider/view-provider-panel";

export class SigmaStudioPlusProjectEditor
  implements vscode.CustomTextEditorProvider
{
  static readonly viewType = "cfs.editor.sigmaStudioPlusProject";

  constructor(private context: vscode.ExtensionContext) {}

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      SigmaStudioPlusProjectEditor.viewType,
      new SigmaStudioPlusProjectEditor(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    );
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    const viewProviderPanel = new ViewProviderPanel(this.context, {
      distDir: "out/sigma-studio-plus-project",
      indexPath: "out/sigma-studio-plus-project/index.html",
    });

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      let request;

      switch (message.type) {
        case "openWithSigmaStudioPlus":
          request = vscode.commands.executeCommand(
            "cfs.explorer.openWithSSPlus",
            document.uri,
          );
          break;
        default:
          return;
      }

      if (request) {
        const { body, error } = await request.then(
          (body) => ({ body, error: undefined }),
          (error) => ({ body: undefined, error: error?.message }),
        );

        // Send result to the webview
        await webviewPanel.webview.postMessage({
          type: "api-response",
          id: message.id,
          body,
          error,
        });
      }
    });

    await viewProviderPanel.resolveWebviewView(webviewPanel);
  }
}
