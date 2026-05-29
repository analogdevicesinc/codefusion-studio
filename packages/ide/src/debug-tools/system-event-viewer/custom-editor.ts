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
import type { ValidateFunction } from "ajv";
import { ajv } from "../../utils/ajv-wrapper";
import { ViewProviderPanel } from "../../view-provider/view-provider-panel";
import { cfsEventsSchema, type CfsEventsFile } from "./cfsevents-schema";
import { SaveDialogOptions } from "vscode";
import path from "path";

const CREATE_FILE_REQ_ID = "sev-create-file";
const SEV_READY = "sev-ready";

type SaveType = "export" | "save";

const cfsEventsValidator: ValidateFunction<CfsEventsFile> =
  ajv.compile<CfsEventsFile>(cfsEventsSchema);

interface SevWebviewMessage {
  id: number;
  type: string;
  body?: any;
}

interface SaveFileRequest {
  saveType?: SaveType;
}

class EventEditor {
  private content: CfsEventsFile | undefined = undefined;

  readonly webviewResolved: Promise<void>;
  private webviewReady: Promise<void>;

  private disposables: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    document: vscode.TextDocument,
    private webviewPanel: vscode.WebviewPanel,
  ) {
    // Send updates whenever the .cfsevents document changes
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          this.document = e.document;
        }
      }),
    );

    // Handle messages from the webview
    this.disposables.push(
      webviewPanel.webview.onDidReceiveMessage((message) => {
        this.handleWebviewMessage(message);
      }),
    );

    webviewPanel.onDidDispose(() => {
      this.disposables.forEach((d) => d.dispose());
    });

    const viewProviderPanel = new ViewProviderPanel(this.context, {
      distDir: "out/system-event-viewer",
      indexPath: "out/system-event-viewer/index.html",
    });

    // Important note: webviewReady needs to be initialized before resolveWebviewView, otherwise
    // The ready message would be sent before we start listening to it.
    this.webviewReady = this.waitForWebviewReady(webviewPanel.webview).then(
      // Do not set document until webview is ready to receive messages.
      () => {
        this.document = document;
      },
    );
    this.webviewResolved = viewProviderPanel.resolveWebviewView(webviewPanel);
  }

  public async isReady(): Promise<void> {
    await Promise.all([this.webviewReady, this.webviewResolved]);
  }

  private async waitForWebviewReady(webview: vscode.Webview): Promise<void> {
    return new Promise((resolve) => {
      const disposable = webview.onDidReceiveMessage((message) => {
        if (message.type === SEV_READY) {
          disposable.dispose();
          resolve();
        }
      });
      console.log("Waiting for webview ready message...");
    });
  }

  // For the moment there is no need to retrieve the document content after the initial load,
  // but if in the future we need to do so, we can store the document in a private variable
  // and use a getter to retrieve its content when needed.
  // eslint-disable-next-line accessor-pairs
  set document(document: vscode.TextDocument) {
    try {
      this.content = parseCfsEventFile(document);

      void this.postMessage({
        type: "sev-data",
        body: this.content,
      });
    } catch (error) {
      let errMessage;

      if (error instanceof SevJsonValidationError) {
        errMessage = error.validationErrors;
      }

      void this.postMessage({
        type: "sev-json-errors",
        errors: errMessage ?? ["Unknown error"],
      });
      this.content = undefined;
    }
  }

  private postMessage(message: any) {
    void this.webviewPanel.webview.postMessage(message);
  }

  private async handleWebviewMessage(
    message: SevWebviewMessage,
  ): Promise<void> {
    try {
      switch (message.type) {
        case SEV_READY:
          return;
        case CREATE_FILE_REQ_ID:
          await this.saveFileRequest(message.body);
          break;
        default:
          console.warn("Unknown message type", message);
          return;
      }

      this.postMessage({
        type: "api-response",
        id: message.id,
      });
    } catch (error: Error | unknown) {
      this.postMessage({
        type: "api-response",
        id: message.id,
        error: error instanceof Error ? error.message : "error",
      });
    }
  }

  private async saveFileRequest(request?: SaveFileRequest): Promise<void> {
    if (!this.content) {
      vscode.window.showErrorMessage(
        "Cannot create file: No valid content available",
      );
      return;
    }

    const saveType = request?.saveType;

    if (!saveType) return;
    if (!saveTypeInfo[saveType]) return;

    const { filters, parsers } = saveTypeInfo[saveType];

    const saveUri = await vscode.window.showSaveDialog({
      filters: filters,
    });

    if (!saveUri) {
      return;
    }

    const fileExtension = path.extname(saveUri.fsPath);
    const parser = parsers[fileExtension];

    if (!parser) {
      vscode.window.showErrorMessage(`Unsupported file type: ${fileExtension}`);
      return;
    }

    await vscode.workspace.fs.writeFile(
      saveUri,
      new TextEncoder().encode(parser(this.content)),
    );

    vscode.window
      .showInformationMessage(`Events saved at ${saveUri.fsPath}`, "Open")
      .then((selection) => {
        if (selection === "Open") {
          vscode.commands.executeCommand("vscode.open", saveUri);
        }
      });
  }
}

/*
 * This class implements a custom editor provider for system event viewer.
 *
 * Associated to .cfsevents files and 'cfs-sev:' schema (for content provided
 * by EventContentProvider), it displays the events on a custom webview.
 *
 * Currently it just displays a placeholder webview with the raw content of
 * the file but once CFSIO-14895 defines the file format, it will be modified
 * to show the final webview as part of CFSIO-14896.
 */
export class EventEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token?: vscode.CancellationToken,
  ) {
    // TODO: Handle cancellation
    void token;

    const editor = new EventEditor(this.context, document, webviewPanel);
    // The idea here was to return editor.isReady() in a similar way on  how it is done on the
    // configuration treeview, however there it works because the webview view is loaded even before
    // the promise is resolved, while here it looks like vscode does not render the webview editor until
    // the promise is resolved, therefore we cannot wait for the webview response here since that will
    // only happen once the returned promise is resolved, creating a deadlock.
    //
    // Not that this is a huge problem, but just in case someone wonders why not returning editor.isReady().
    return editor.webviewResolved;
  }
}

/**
 * Parses the content of a CFS events file and validates it against the SEV schema.
 * @param content The content of the CFS events file as a string.
 * @returns The parsed and validated CFS events file.
 * @throws {SevJsonValidationError} If the content is not valid JSON or does not match the SEV schema.
 */
function parseCfsEventFile(document: vscode.TextDocument): CfsEventsFile {
  let parsedFile;

  try {
    parsedFile = JSON.parse(document.getText());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Throw an error if the JSON structure is incorrect
    throw new SevJsonValidationError([`Invalid JSON: ${message}`]);
  }

  if (!cfsEventsValidator(parsedFile)) {
    const errors = (cfsEventsValidator.errors ?? []).map((err) =>
      `${err.instancePath} ${err.message ?? ""}`.trim(),
    );

    // Throw an error if the JSON doesn't match the SEV schema
    throw new SevJsonValidationError(errors);
  }

  return parsedFile;
}

class SevJsonValidationError extends Error {
  constructor(public validationErrors: string[]) {
    super("Error Validating SEV event file");
  }
}

interface SevSaveInfo {
  filters: SaveDialogOptions["filters"];
  parsers: Record<string, (content: CfsEventsFile) => string>;
}

const saveTypeInfo: Record<SaveType, SevSaveInfo> = {
  export: {
    filters: {
      "*.csv": ["csv"],
      "*.json": ["json"],
    },
    parsers: {
      ".csv": cfsEventsToCsv,
      ".json": cfsEventsToJson,
    },
  },

  save: {
    filters: {
      "*.cfsevents": ["cfsevents"],
    },
    parsers: {
      ".cfsevents": (content: CfsEventsFile) => {
        // Override state in case the data is coming from a live session.
        return JSON.stringify(
          { ...content, state: "file" } as CfsEventsFile,
          undefined,
          2,
        );
      },
    },
  },
};

function cfsEventsToCsv(parsedFile: CfsEventsFile): string {
  if (!parsedFile.events) {
    return "";
  }
  const events = Object.entries(parsedFile.events).flatMap(
    ([eventSource, entry]) => {
      return entry.timestamps.map((timestamp) => ({
        eventSource,
        timestamp,
      }));
    },
  );

  events.sort((a, b) => a.timestamp - b.timestamp);

  const csvRows = events.map(
    ({ eventSource, timestamp }) =>
      `${escapeCsvValue(eventSource)},${timestamp}`,
  );

  const csvHeader = "event_source,timestamp";
  return [csvHeader, ...csvRows].join("\n");
}

function cfsEventsToJson(parsedFile: CfsEventsFile): string {
  if (!parsedFile.events) {
    return "";
  }
  const events = Object.entries(parsedFile.events).flatMap(
    ([eventSource, entry]) => {
      return entry.timestamps.map((timestamp) => ({
        eventSource,
        timestamp,
      }));
    },
  );

  events.sort((a, b) => a.timestamp - b.timestamp);
  return JSON.stringify(events, undefined, 2);
}

function escapeCsvValue(value: string): string {
  // If the value does not contain commas, quotes, or newlines, return it as is
  if (!/[",\n]/.test(value)) {
    return value;
  }

  // Otherwise, escape quotes and wrap the value in quotes
  return `"${value.replaceAll('"', '""')}"`;
}
