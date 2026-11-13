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
import {
  v0_2,
  v0_3,
  v1_0,
  CfsEventsData,
  LatestCfsEventsFile,
} from "./cfsevents-schema";
import { SaveDialogOptions } from "vscode";
import path from "path";
import { TELEMETRY_ACTIONS } from "../../telemetry/action-names";
import { getTelemetryManager } from "../../telemetry/telemetry";
import { EventContentProvider } from "./content-provider";

const CREATE_FILE_REQ_ID = "sev-create-file";
const SEV_READY = "sev-ready";
const SEV_UPDATE_INDEX = "sev-update-event-source-index";

type SaveType = "export" | "save";

// Let's use some lazy initialization for these since it is possible that
// only one of the validators is used during the lifetime of the extension,
// and we don't want to compile both schemas if not needed.
let v0_2Validator: ValidateFunction<v0_2.CfsEventsFile> | undefined;
let v0_3Validator: ValidateFunction<v0_3.CfsEventsFile> | undefined;
let v1_0Validator: ValidateFunction<v1_0.CfsEventsFile> | undefined;

interface SevWebviewMessage {
  id: number;
  type: string;
  body?: any;
}

interface SaveFileRequest {
  saveType?: SaveType;
}

interface UpdateIndexRequest {
  eventSourceIndex: CfsEventsData["eventSourceIndex"];
}

class EventEditor {
  private content: CfsEventsData | undefined = undefined;
  // Backing field for the document getter/setter. Access through this.document
  private _internalDocument: vscode.TextDocument;
  private isApplyingEdit = false;

  readonly webviewResolved: Promise<void>;
  private webviewReady: Promise<void>;

  private disposables: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    document: vscode.TextDocument,
    private webviewPanel: vscode.WebviewPanel,
    private contentProvider: EventContentProvider | undefined,
  ) {
    this._internalDocument = document;

    // Send updates whenever the .cfsevents document changes
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          this._internalDocument = e.document;
          if (this.isApplyingEdit) {
            return;
          }
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
    });
  }

  get document(): vscode.TextDocument {
    return this._internalDocument;
  }

  set document(document: vscode.TextDocument) {
    try {
      const parsed = parseCfsEventFile(document);
      this.content = parsed;

      void this.postMessage({
        type: "sev-data",
        body: this.content,
      });
      void getTelemetryManager().then((telemetryManager) => {
        telemetryManager.logAction(TELEMETRY_ACTIONS.SEV_FILE_STATISTICS, {
          state: this.content?.state,
          eventCounts: Object.values(this.content?.eventSources ?? {}).reduce(
            (acc: number[], entry) => [...acc, entry.events.length],
            [],
          ),
          eventSourceCount: Object.keys(this.content?.eventSources ?? {})
            .length,
        });
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
        case SEV_UPDATE_INDEX:
          await this.handleUpdateIndex(message.body);
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

    void getTelemetryManager().then((telemetryManager) => {
      telemetryManager.logAction(TELEMETRY_ACTIONS.SEV_FILE_SAVED, {
        saveType,
      });
    });

    vscode.window
      .showInformationMessage(`Events saved at ${saveUri.fsPath}`, "Open")
      .then((selection) => {
        if (selection === "Open") {
          vscode.commands.executeCommand("vscode.open", saveUri);
        }
      });
  }

  /**
   * Handles an eventSourceIndex update from the webview.
   *
   * For a real `.cfsevents` file the new index is written back into the JSON
   * via a workspace edit and the resulting document-change event is suppressed
   * (the webview already reflects the new state).
   *
   * For a live virtual document the index is forwarded to the content provider,
   * which persists it in the session context so it survives editor reopens.
   */
  private async handleUpdateIndex(request?: UpdateIndexRequest): Promise<void> {
    if (!request) return;
    const { eventSourceIndex } = request;

    // Update in-memory content immediately so saves reflect the latest layout
    if (this.content) {
      this.content = { ...this.content, eventSourceIndex };
    }

    if (this.document.uri.scheme === "cfs-sev") {
      this.contentProvider?.updateEventSourceIndex(eventSourceIndex);
    } else {
      await this.saveContent();
    }
  }

  /**
   * Persists the current in-memory content to the document on disk.
   */
  private async saveContent(): Promise<void> {
    if (!this.content) return;

    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      this.document.uri,
      new vscode.Range(0, 0, this.document.lineCount, 0),
      JSON.stringify(
        { ...this.content, schemaVersion: "1.0" } as v1_0.CfsEventsFile,
        undefined,
        2,
      ),
    );

    this.isApplyingEdit = true;
    try {
      const ok = await vscode.workspace.applyEdit(edit);
      if (!ok) {
        throw new Error("Failed to persist content");
      }
    } finally {
      this.isApplyingEdit = false;
    }
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
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly contentProvider?: EventContentProvider,
  ) {}

  public resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token?: vscode.CancellationToken,
  ) {
    // TODO: Handle cancellation
    void token;

    void getTelemetryManager().then((telemetryManager) => {
      telemetryManager.logAction(TELEMETRY_ACTIONS.FEATURE_ACCESSED, {
        feature: "system_event_viewer",
      });
    });

    const editor = new EventEditor(
      this.context,
      document,
      webviewPanel,
      this.contentProvider,
    );
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
 * Currently schemas 0.2, 0.3 and 1.0 are supported, but the method will always return a
 * CfsEventsData type as that is the type used on the rest of the file.
 *
 * @param content The content of the CFS events file as a string.
 * @returns The parsed and validated CFS events file.
 * @throws {SevJsonValidationError} If the content is not valid JSON or does not match the SEV schema.
 */
function parseCfsEventFile(document: vscode.TextDocument): CfsEventsData {
  let parsedFile;

  try {
    parsedFile = JSON.parse(document.getText());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Throw an error if the JSON structure is incorrect
    throw new SevJsonValidationError([`Invalid JSON: ${message}`]);
  }

  if (
    typeof parsedFile !== "object" ||
    parsedFile === null ||
    Array.isArray(parsedFile)
  ) {
    throw new SevJsonValidationError([
      "Invalid JSON: root value must be an object.",
    ]);
  }

  switch (parsedFile.schemaVersion) {
    case "0.2": {
      if (!v0_2Validator) {
        v0_2Validator = ajv.compile<v0_2.CfsEventsFile>(v0_2.cfsEventsSchema);
      }
      if (!v0_2Validator(parsedFile)) {
        const errors = (v0_2Validator.errors ?? []).map((err) =>
          `${err.instancePath} ${err.message ?? ""}`.trim(),
        );
        throw new SevJsonValidationError(errors);
      }
      return {
        lastUpdate: parsedFile.lastUpdate,
        tickFrequency: parsedFile.tickFrequency,
        tickEpoch: parsedFile.ticksEpoch,
        state: parsedFile.state,
        eventSources: Object.fromEntries(
          Object.entries(parsedFile.events).map(([eventSource, entry]) => [
            eventSource,
            {
              events: entry.timestamps.map((ts) => ({ ts })),
            },
          ]),
        ),
      };
    }
    case "0.3": {
      if (!v0_3Validator) {
        v0_3Validator = ajv.compile<v0_3.CfsEventsFile>(v0_3.cfsEventsSchema);
      }
      if (!v0_3Validator(parsedFile)) {
        const errors = (v0_3Validator.errors ?? []).map((err) =>
          `${err.instancePath} ${err.message ?? ""}`.trim(),
        );
        throw new SevJsonValidationError(errors);
      }

      const { ticksEpoch, schemaVersion, ...data } = {
        ...parsedFile,
        tickEpoch: parsedFile.ticksEpoch,
      };
      void ticksEpoch;
      void schemaVersion;

      return data;
    }
    case "1.0": {
      if (!v1_0Validator) {
        v1_0Validator = ajv.compile<v1_0.CfsEventsFile>(v1_0.cfsEventsSchema);
      }
      if (!v1_0Validator(parsedFile)) {
        const errors = (v1_0Validator.errors ?? []).map((err) =>
          `${err.instancePath} ${err.message ?? ""}`.trim(),
        );
        throw new SevJsonValidationError(errors);
      }
      const { schemaVersion, ...data } = parsedFile;
      void schemaVersion;

      return data;
    }
    default:
      throw new SevJsonValidationError([
        `Unsupported schema version: ${parsedFile.schemaVersion}`,
      ]);
  }
}

class SevJsonValidationError extends Error {
  constructor(public validationErrors: string[]) {
    super("Error Validating SEV event file");
  }
}

interface SevSaveInfo {
  filters: SaveDialogOptions["filters"];
  parsers: Record<string, (content: CfsEventsData) => string>;
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
      ".cfsevents": (content: CfsEventsData) => {
        // Override state in case the data is coming from a live session.
        return JSON.stringify(
          {
            ...content,
            schemaVersion: "1.0",
            state: "file",
          } as LatestCfsEventsFile,
          undefined,
          2,
        );
      },
    },
  },
};

function cfsEventsToCsv(parsedFile: CfsEventsData): string {
  if (!parsedFile.eventSources) {
    return "";
  }
  const events = Object.entries(parsedFile.eventSources).flatMap(
    ([eventSource, entry]) => {
      return entry.events.map(({ ts, msg }) => ({
        eventSource,
        ts,
        msg,
      }));
    },
  );

  events.sort((a, b) => a.ts - b.ts);

  const csvRows = events.map(
    ({ eventSource, ts, msg }) =>
      `${escapeCsvValue(eventSource)},${ts},${escapeCsvValue(msg ?? "")}`,
  );

  const csvHeader = "event_source,timestamp,message";
  return [csvHeader, ...csvRows].join("\n");
}

function cfsEventsToJson(parsedFile: CfsEventsData): string {
  if (!parsedFile.eventSources) {
    return "";
  }
  const events = Object.entries(parsedFile.eventSources).flatMap(
    ([eventSource, entry]) => {
      return entry.events.map(({ ts, msg }) => ({
        eventSource,
        ts,
        msg,
      }));
    },
  );

  events.sort((a, b) => a.ts - b.ts);
  return JSON.stringify(events, undefined, 2);
}

function escapeCsvValue(value: string): string {
  // If the value does not contain commas, quotes, newlines, or carriage returns, return it as is
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  // Otherwise, escape quotes and wrap the value in quotes
  return `"${value.replaceAll('"', '""')}"`;
}
