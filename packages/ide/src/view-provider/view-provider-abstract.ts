/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import * as vscode from "vscode";
import { modifyHtml } from "../utils/html-modifier";

export type ViewProviderOptions = {
  distDir: string;
  indexPath: string;
};

export abstract class AbstractViewProvider {
  public static defaultTranslations: string = "";
  static WEBVIEW_INJECT_IN_MARK = "__webview_public_path__";
  static WEBVIEW_INJECT_RESOURCES_PATH = "__webview_resources_path__";
  static WEBVIEW_COMMAND_ARGS = "__command_args__";
  static WEBVIEW_LOCALE_TRANSLATION = "__webview_localization_resources__";
  private static htmlCache = new Map<string, string>();

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

    let translations = vscode.l10n.bundle
      ? JSON.stringify(vscode.l10n.bundle)
      : "default";

    const commandArgsString = JSON.stringify(commandArgs);

    const cacheKey = `${webviewUri}|${translations}|${commandArgsString}`;

    if (AbstractViewProvider.htmlCache.has(cacheKey)) {
      return AbstractViewProvider.htmlCache.get(cacheKey)!;
    }

    if (!vscode.l10n.bundle) {
      translations = AbstractViewProvider.defaultTranslations;
    }

    const injectInContent = `
		<script>
			window.${AbstractViewProvider.WEBVIEW_INJECT_IN_MARK} = "${webviewUri}";
			window.${AbstractViewProvider.WEBVIEW_INJECT_RESOURCES_PATH} = "${resourcesUri}";
      window.${AbstractViewProvider.WEBVIEW_LOCALE_TRANSLATION} = ${translations};
		</script>
		`;

    const injectCommandArgs = `<script> window.${AbstractViewProvider.WEBVIEW_COMMAND_ARGS} = ${commandArgsString}</script>`;

    const htmlPath = `${this.context.extensionPath}/${indexPath}`;
    const htmlText = fs.readFileSync(htmlPath).toString();

    const modifiedHtml = await modifyHtml(htmlText, {
      onopentag(name, attribs) {
        if (name === "script" && attribs.src) {
          attribs.src = `${webviewUri}/${attribs.src}`;
        }
        if (name === "link" && attribs.href) {
          attribs.href = `${webviewUri}/${attribs.href}`;
        }
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

    AbstractViewProvider.htmlCache.set(cacheKey, modifiedHtml);
    return modifiedHtml;
  }
}
