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
import { ViewProviderPanel } from "../view-provider/view-provider-panel";
import { CfsSerialPortManager } from "../debug-tools/serial-port-manager";
import { OPEN_TRACE_CONFIGURATION_COMMAND_ID } from "../commands/constants";
import {
  TraceConfiguration,
  TraceRecordingState,
} from "@ide-types/trace-types";
import { Messenger } from "vscode-messenger";
import type { WebviewIdMessageParticipant } from "vscode-messenger-common";
import {
  traceConfigRequest,
  traceConfigChangedNotification,
  traceOpenConfigurationViewNotification,
  traceSerialPortsRequest,
  traceConfigUpdateNotification,
  traceRecordingStateRequest,
  traceRecordingStateChangedNotification,
  traceStartRecordingNotification,
  traceStopRecordingNotification,
} from "@constants/messages/trace-messages";
import { Recording } from "../debug-tools/profiler/recording";
import { SerialSourceConfig } from "../debug-tools/profiler/data-source-factory";
import { IDEShellEnvProvider } from "../toolchains/shell-env-provider";
import path from "node:path";
import { getWorkspaceRoot } from "../utils/utils";
import { startTraceConversion } from "../debug-tools/profiler/trace-conversion-ui-helper";

const TRACE_CONFIGURATION_KEY = "traceCapture.configuration";

export const DEFAULT_TRACE_CONFIGURATION: TraceConfiguration = {
  interfaceType: "uart",
  serialPort: "",
  baudRate: 115200,
  outputDirectory: "",
  autoReset: false,
  elfFile: "",
  buildDir: "",
  aiModels: [],
};

type RegisteredWebview = {
  participant: WebviewIdMessageParticipant;
  handlers: vscode.Disposable[];
};

type RecordingDetails =
  | {
      isRecording: true;
      recording: Recording;
      startTime: number;
    }
  | {
      isRecording: false;
      error?: string;
    };

export class TraceCaptureService {
  private readonly webviews = new Map<string, RegisteredWebview>();
  private recordingDetails: RecordingDetails = {
    isRecording: false,
  };
  private lastRecording: Recording | undefined;

  private ignoreForUpdateBroadcast?: WebviewIdMessageParticipant;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly messenger: Messenger,
    private readonly shellEnvProvider: IDEShellEnvProvider,
  ) {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(`cfs.${TRACE_CONFIGURATION_KEY}`)) {
          this.broadcastConfiguration(this.ignoreForUpdateBroadcast);
        }
      }),
    );
  }

  registerWebview(id: string, participant: WebviewIdMessageParticipant): void {
    this.unregisterWebview(id);
    const handlers = this.registerMessageHandlers(participant);
    this.webviews.set(id, { participant, handlers });
  }

  unregisterWebview(id: string): void {
    const registered = this.webviews.get(id);
    if (!registered) {
      return;
    }

    registered.handlers.forEach((handler) => handler.dispose());
    this.webviews.delete(id);
  }

  private getConfiguration(): TraceConfiguration {
    const rawConfiguration = vscode.workspace
      .getConfiguration("cfs")
      .get<TraceConfiguration>(TRACE_CONFIGURATION_KEY);

    const firstCoreFolder = vscode.workspace.workspaceFolders?.find(
      (f) => f.name !== ".cfs",
    )?.name;

    return {
      ...DEFAULT_TRACE_CONFIGURATION,
      buildDir: rawConfiguration?.buildDir || `${firstCoreFolder}/build`,
      elfFile:
        rawConfiguration?.elfFile ||
        `${firstCoreFolder}/build/zephyr/zephyr.elf`,
      outputDirectory:
        rawConfiguration?.outputDirectory || `${firstCoreFolder}/tracefiles`,
      ...rawConfiguration,
    };
  }

  private async saveConfiguration(
    configuration: TraceConfiguration,
  ): Promise<TraceConfiguration> {
    await vscode.workspace
      .getConfiguration("cfs")
      .update(
        TRACE_CONFIGURATION_KEY,
        configuration,
        vscode.ConfigurationTarget.Workspace,
      );

    return configuration;
  }

  private broadcastConfiguration(exclude?: WebviewIdMessageParticipant): void {
    for (const { participant } of this.webviews.values()) {
      if (participant === exclude) {
        continue;
      }
      this.messenger.sendNotification(
        traceConfigChangedNotification,
        participant,
        this.getConfiguration(),
      );
    }
  }

  private getRecordingState(): TraceRecordingState {
    if (this.recordingDetails.isRecording) {
      return {
        isRecording: true,
        startTime: this.recordingDetails.startTime,
      };
    } else {
      return {
        isRecording: false,
        error: this.recordingDetails.error,
      };
    }
  }

  private async startRecording(): Promise<void> {
    if (this.recordingDetails.isRecording) {
      throw new Error("Recording is already in progress.");
    }

    const configuration = this.getConfiguration();

    if (configuration.interfaceType !== "uart") {
      throw new Error(
        `Interface type ${configuration.interfaceType} is not supported.`,
      );
    }

    try {
      const sourceConfig = new SerialSourceConfig(
        configuration.serialPort,
        configuration.baudRate,
      );

      const recording = await Recording.start({
        source: sourceConfig,
        outputFolder: path.isAbsolute(configuration.outputDirectory)
          ? configuration.outputDirectory
          : path.join(getWorkspaceRoot() ?? "", configuration.outputDirectory),
      });
      this.lastRecording = recording;

      recording.onError((error) => this.handleRecordingError(error));

      const startTime = Date.now();
      this.recordingDetails = { isRecording: true, recording, startTime };
    } catch (error: unknown) {
      this.recordingDetails = {
        isRecording: false,
        error: `Failed to start recording: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async stopRecording(): Promise<void> {
    if (!this.recordingDetails.isRecording) {
      throw new Error("No recording is currently in progress.");
    }

    let recording: Recording;

    try {
      await this.recordingDetails.recording.stop();
      recording = this.recordingDetails.recording;
      this.recordingDetails = { isRecording: false };
    } catch (error: unknown) {
      this.recordingDetails = {
        isRecording: false,
        error: `Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`,
      };
      return;
    } finally {
      this.broadcastRecordingState();
    }

    const config = this.getConfiguration();

    await startTraceConversion(recording, this.shellEnvProvider, {
      aiModelPaths: config.aiModels,
      buildDir: config.buildDir,
      zephyrElfPath: config.elfFile,
    });
  }

  private handleRecordingError(error: Error): void {
    this.recordingDetails = {
      isRecording: false,
      error: `Recording error: ${error.message}`,
    };

    this.broadcastRecordingState();
  }

  private broadcastRecordingState(exclude?: WebviewIdMessageParticipant): void {
    for (const { participant } of this.webviews.values()) {
      if (participant === exclude) {
        continue;
      }
      this.messenger.sendNotification(
        traceRecordingStateChangedNotification,
        participant,
        this.getRecordingState(),
      );
    }
  }

  private registerMessageHandlers(
    participant: WebviewIdMessageParticipant,
  ): vscode.Disposable[] {
    return [
      this.messenger.onRequest(
        traceConfigRequest,
        () => {
          return this.getConfiguration();
        },
        { sender: participant },
      ),

      this.messenger.onNotification(
        traceConfigUpdateNotification,
        async (updatedConfiguration) => {
          this.ignoreForUpdateBroadcast = participant;
          await this.saveConfiguration(updatedConfiguration).finally(() => {
            this.ignoreForUpdateBroadcast = undefined;
          });
        },
        { sender: participant },
      ),

      this.messenger.onRequest(
        traceRecordingStateRequest,
        () => {
          return this.getRecordingState();
        },
        { sender: participant },
      ),

      this.messenger.onNotification(
        traceStartRecordingNotification,
        async () => {
          await this.startRecording();
          this.broadcastRecordingState();
        },
        { sender: participant },
      ),

      this.messenger.onNotification(
        traceStopRecordingNotification,
        async () => {
          await this.stopRecording();
        },
        { sender: participant },
      ),

      this.messenger.onRequest(
        traceSerialPortsRequest,
        () => {
          return CfsSerialPortManager.listPorts();
        },
        { sender: participant },
      ),

      this.messenger.onNotification(
        traceOpenConfigurationViewNotification,
        () => {
          void this.openConfigurationView();
        },
        { sender: participant },
      ),
    ];
  }

  private async openConfigurationView(): Promise<void> {
    await vscode.commands.executeCommand(OPEN_TRACE_CONFIGURATION_COMMAND_ID);
  }
}

export class TraceSidePanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "cfs.traceCapturePanel";

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly service: TraceCaptureService,
    private readonly messenger: Messenger,
  ) {}

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewView.webview.options = {
      enableScripts: true,
    };

    const participant = this.messenger.registerWebviewView(webviewView);
    this.service.registerWebview(TraceSidePanelProvider.viewType, participant);
    webviewView.onDidDispose(() => {
      this.service.unregisterWebview(TraceSidePanelProvider.viewType);
    });

    const viewPanelProvider = new ViewProviderPanel(this.context, {
      distDir: "out/trace-side-panel",
      indexPath: "out/trace-side-panel/index.html",
    });

    await viewPanelProvider.resolveWebviewView(webviewView);
  }
}

export class TraceConfigurationProvider {
  private panel: vscode.WebviewPanel | undefined;
  private static readonly panelId = "cfs.traceConfiguration.panel";

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly service: TraceCaptureService,
    private readonly messenger: Messenger,
  ) {}

  async open(): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      TraceConfigurationProvider.panelId,
      "Trace Configuration",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      },
    );

    this.panel = panel;
    const participant = this.messenger.registerWebviewPanel(panel);
    this.service.registerWebview(
      TraceConfigurationProvider.panelId,
      participant,
    );
    panel.onDidDispose(() => {
      this.service.unregisterWebview(TraceConfigurationProvider.panelId);
      this.panel = undefined;
    });

    const viewPanelProvider = new ViewProviderPanel(this.context, {
      distDir: "out/trace-configuration",
      indexPath: "out/trace-configuration/index.html",
    });

    await viewPanelProvider.resolveWebviewView(panel);
  }
}
