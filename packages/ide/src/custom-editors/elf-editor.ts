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
import * as vscode from "vscode";
import { ElfFileParser } from "elf-parser/src/index";
import type { ElfDataModel } from "elf-parser/src/ElfDataModel";
import { elfMessageHandler } from "../utils/elf-message-handler";
import { ViewProviderPanel } from "../view-provider/view-provider-panel";

export const ELF_EDITOR_ID = "elf.fileEditor";

class ElfDocument implements vscode.CustomDocument {
  private readonly _uri: vscode.Uri;
  private parser: ElfFileParser | undefined;

  get uri() {
    return this._uri;
  }

  constructor(uri: vscode.Uri) {
    this._uri = uri;
  }

  public async loadParser(): Promise<void> {
    try {
      this.parser = new ElfFileParser(this._uri.fsPath); // Use fsPath instead of path due to Windows and Mac compatibility
      await this.parser.initialize();
    } catch (error) {
      const fileName = this._uri.fsPath.split("/").pop();
      vscode.window.showErrorMessage(
        `File "${fileName}" could not be loaded: file doesn't contain valid ELF header`,
      );
      throw new Error("Error loading the parser: " + error);
    }
  }

  public getElfDataModel = (): ElfDataModel => {
    const elfModel = this.parser?.getDataModel();

    return elfModel!;
  };

  public getParser = (): ElfFileParser => this.parser!;

  async dispose(): Promise<void> {
    await this.parser?.dropSymbolsTable();
  }
}

export class ElfEditor
  implements vscode.CustomReadonlyEditorProvider<ElfDocument>
{
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new ElfEditor(context);

    const providerRegistration = vscode.window.registerCustomEditorProvider(
      ElfEditor.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    );

    return providerRegistration;
  }

  private static get viewType() {
    return ELF_EDITOR_ID;
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: { backupId?: string },
    _token: vscode.CancellationToken,
  ): Promise<any> {
    try {
      const elfDocument = new ElfDocument(uri);
      await elfDocument.loadParser();

      return elfDocument;
    } catch (error) {
      throw new Error(`Error opening custom document: ${error.message}`);
    }
  }

  async resolveCustomEditor(
    document: any,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    try {
      const elfModel: ElfDataModel = document.getElfDataModel();
      const parser: ElfFileParser = document.getParser();
      const viewProviderPanel = new ViewProviderPanel(this.context, {
        distDir: "out/elf-explorer",
        indexPath: "out/elf-explorer/index.html",
      });

      webviewPanel.webview.options = {
        enableScripts: true,
      };

      webviewPanel.webview.onDidReceiveMessage(
        async (message) =>
          elfMessageHandler(message, webviewPanel, parser, elfModel),
        undefined,
      );

      const fileName = document.uri.fsPath.split("/").pop();
      const numberOfSymbols = elfModel.numberOfSymbols;
      const numberOfSu = parser.numberOfSuFiles;
      const text = `ELF file "${fileName}" loaded (${numberOfSymbols} symbols found, ${numberOfSu} .su files processed)`;

      void vscode.window.showInformationMessage(text as string);

      await viewProviderPanel.resolveWebviewView(webviewPanel);
    } catch (error) {
      console.error("Error resolving custom editor", error);
    }
  }
}
