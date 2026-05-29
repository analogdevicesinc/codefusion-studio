/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import type * as vscode from "vscode";
import { AbstractViewProvider } from "./view-provider-abstract";
import type { MissingDependencyError } from "cfs-lib";

export class ViewProviderPanel extends AbstractViewProvider {
  constructor(
    context: vscode.ExtensionContext,
    options?: {
      distDir: string;
      indexPath: string;
    },
  ) {
    super(context, {
      distDir: options?.distDir ?? "build/ui",
      indexPath: options?.indexPath ?? "build/ui/index.html",
    });
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewPanel | vscode.WebviewView,
    commandArgs?: Record<string, unknown>,
  ) {
    const { webview } = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webview.html = await this.getWebviewHtml(webview, commandArgs);
  }

  async resolveWebviewErrorView(
    webviewView: vscode.WebviewPanel,
    error: unknown,
  ) {
    const { webview } = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    let html = await this.getWebviewHtml(webview);

    // Transform error into webview payload
    let errorPayload: { type: string; body: unknown };

    // Handle MissingDependencyError
    if (
      error &&
      typeof error === "object" &&
      "dependencyType" in error &&
      "details" in error
    ) {
      const depError = error as MissingDependencyError;
      errorPayload = {
        type: depError.dependencyType,
        body: depError.details,
      };
    } else if (error instanceof Error) {
      // Handle generic Error
      errorPayload = {
        type: "exception",
        body: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    } else {
      // Handle unknown error types
      errorPayload = {
        type: "unknown",
        body: String(error),
      };
    }

    const payload = JSON.stringify(errorPayload);

    html = html.replace(
      '<div id="root"></div>',
      `<div id="error" data-error='${payload}'></div>`,
    );

    webview.html = html;
  }
}
