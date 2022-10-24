/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { modifyHtml } from "../utils/html-modifier";

export type ViewProviderOptions = {
  distDir: string;
  indexPath: string;
};

export abstract class AbstractViewProvider {
  static WEBVIEW_INJECT_IN_MARK = "__webview_public_path__";
  static WEBVIEW_INJECT_RESOURCES_PATH = "__webview_resources_path__";
  static WEBVIEW_COMMAND_ARGS = "__command_args__";
  static WEBVIEW_LOCALE_TRANSLATION = "__webview_localization_resources__";

  /**
   * @param context vscode.ExtensionContext
   * @param options ViewProviderOptions
   */
  constructor(
    protected context: vscode.ExtensionContext,
    protected options: ViewProviderOptions,
  ) {}

  /**
   * @param webviewView vscode.WebviewView | vscode.WebviewPanel
   */
  abstract resolveWebviewView(
    webviewView: vscode.WebviewView | vscode.WebviewPanel,
    commandArgs?: Record<string, unknown>,
  ): void;

  /**
   * @param webview vscode.Webview
   * @returns string
   */
  protected async getWebviewHtml(
    webview: vscode.Webview,
    commandArgs?: Record<string, unknown>,
  ) {
    const { distDir, indexPath } = this.options;

    const webviewUri = webview
      .asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, distDir))
      .toString();

    const resourcesUri = webview
      .asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "resources"))
      .toString();

    let translations = vscode.l10n.bundle;

    if (!translations) {
      const fileUri = vscode.Uri.joinPath(
        this.context.extensionUri,
        "l10n/bundle.l10n.en.json",
      );
      const enJSON = await vscode.workspace.fs.readFile(fileUri);
      translations = JSON.parse(Buffer.from(enJSON).toString("utf8"));
    }

    const injectInContent = `
		<script>
			window.${AbstractViewProvider.WEBVIEW_INJECT_IN_MARK} = "${webviewUri}";
			window.${AbstractViewProvider.WEBVIEW_INJECT_RESOURCES_PATH} = "${resourcesUri}";
      window.${AbstractViewProvider.WEBVIEW_LOCALE_TRANSLATION} = ${JSON.stringify(translations)};
		</script>
		`;

    const injectCommandArgs = `<script> window.__command_args__ = ${JSON.stringify(commandArgs)}</script>`;

    const htmlPath = path.join(this.context.extensionPath, indexPath);

    const htmlText = fs.readFileSync(htmlPath).toString();

    return modifyHtml(htmlText, {
      onopentag(name, attribs) {
        if (name === "script") attribs.src = path.join(webviewUri, attribs.src);
        if (name === "link") attribs.href = path.join(webviewUri, attribs.href);

        return { name, attribs };
      },
      oncomment(data) {
        const hasMark = data
          ?.toString()
          .toLowerCase()
          .includes(AbstractViewProvider.WEBVIEW_INJECT_IN_MARK);

        return hasMark
          ? {
              data: injectInContent + injectCommandArgs,
              clearComment: true,
            }
          : { data };
      },
    });
  }
}
