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

import * as vscode from "vscode";
import { EventTreeDataProvider } from "./tree-provider";
import { EventContentProvider } from "./content-provider";
import { EventEditorProvider } from "./custom-editor";
import { CfsDataModelManager } from "cfs-lib";
import { CfsDebugManager } from "../debug-manager";
import {
  SEV_OPEN_COMMAND_ID,
  SEV_EDITOR_ID,
  SEV_VIEW_ID,
  SEV_SCHEMA,
  SEV_SUPPORTED_SOCS_CONTEXT_ID,
} from "../../constants";
import { TraceManager } from "./hardware/trace-manager";
import { SystemEventViewerWebviewProvider } from "./webview-provider";

/*
 * This class wraps and registers all the other components of system event viewer
 * and should be the only one directly instantiated on extension activation.
 *
 * Currently it sets up:
 * - A tree view to configure events on VS code debug view
 * - A content provider for 'cfs-sev:' schema URIs
 * - A custom editor provider for '.cfsevents' files and 'cfs-sev:' schema
 * - A command to open the system event viewer for the active debug session
 * - A webview provider for SEV in the debug panel
 *
 */

export class SystemEventViewer {
  private static nInstances: number = 0;
  private disposables: vscode.Disposable[] = [];
  private traceManager: TraceManager;

  constructor(
    context: vscode.ExtensionContext,
    debugManager: CfsDebugManager,
    dmManager: CfsDataModelManager,
  ) {
    // Detect multiple instances without falling into singleton trap
    // (i.e. forcing dependency injection if actually needed)
    SystemEventViewer.nInstances++;
    if (SystemEventViewer.nInstances > 1) {
      throw new Error("Only one instance of SystemEventViewer is allowed.");
    }

    // Trace Manager
    this.traceManager = new TraceManager(dmManager, debugManager);

    // Tree View Setup
    const treeDataProvider = new EventTreeDataProvider(
      this.traceManager,
      debugManager,
    );

    const eventWebviewProvider = new SystemEventViewerWebviewProvider(
      debugManager,
      treeDataProvider,
      context.extensionUri,
    );
    this.disposables.push(
      eventWebviewProvider.onDidChangeCheckboxState(async (e) => {
        for (const item of e.items) {
          const [element, checkboxState] = item;
          if (checkboxState === vscode.TreeItemCheckboxState.Checked) {
            await this.enableEvent(element.path);
          } else if (checkboxState === vscode.TreeItemCheckboxState.Unchecked) {
            await this.disableEvent(element.path);
          }
        }
      }),
    );

    this.disposables.push(
      vscode.window.registerWebviewViewProvider(
        SEV_VIEW_ID,
        eventWebviewProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        },
      ),
    );

    this.disposables.push(eventWebviewProvider);

    dmManager.listDataModels().then((dms) => {
      const supportedSocs = dms
        .filter((dm) => dm.traceInfo)
        .map((dm) => dm.name);
      vscode.commands.executeCommand(
        "setContext",
        SEV_SUPPORTED_SOCS_CONTEXT_ID,
        supportedSocs,
      );
    });

    // Command Registration
    this.disposables.push(
      vscode.commands.registerCommand(SEV_OPEN_COMMAND_ID, () => {
        // The '/' character is necessary for custom editor selector to match against
        // full path rather than only filename:
        // https://github.com/microsoft/vscode/blob/b1975ec3582252503e58265bdeced9969a598cb6/src/vs/workbench/services/editor/common/editorResolverService.ts#L221
        const uri = vscode.Uri.parse(
          `${SEV_SCHEMA}:/${debugManager.getActiveSession()?.vscodeSession.id}`,
        );
        vscode.commands.executeCommand("vscode.open", uri, { preview: false });
      }),
    );

    // Content Provider
    const eventContentProvider = new EventContentProvider(
      debugManager,
      this.traceManager,
    );
    this.disposables.push(
      vscode.workspace.registerTextDocumentContentProvider(
        SEV_SCHEMA,
        eventContentProvider,
      ),
      eventContentProvider,
    );

    // Editor Provider
    const eventEditorProvider = new EventEditorProvider(context);
    this.disposables.push(
      vscode.window.registerCustomEditorProvider(
        SEV_EDITOR_ID,
        eventEditorProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        },
      ),
    );
  }

  public dispose() {
    // Add disposal logic if needed
    this.disposables.forEach((d) => d.dispose());
  }

  private async enableEvent(eventPath: string): Promise<void> {
    await this.traceManager.enableEvent(`*.${eventPath}`);
    // Enable all trace. This is temporary until we have proper trace configuration
    // management in place.
    await this.traceManager.enableTrace();
  }

  private async disableEvent(eventPath: string): Promise<void> {
    await this.traceManager.disableEvent(`*.${eventPath}`);
  }
}
