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
import { OPEN_TRACE_CONFIGURATION_COMMAND_ID } from "../commands/constants";
import {
  TraceConfiguration,
  TraceRecordingState,
  TraceSourceConfiguration,
  UsbDeviceSelection,
} from "@ide-types/trace-types";
import { Messenger } from "vscode-messenger";
import type { WebviewIdMessageParticipant } from "vscode-messenger-common";
import {
  traceConfigRequest,
  traceConfigChangedNotification,
  traceOpenConfigurationViewNotification,
  traceSerialPortsRequest,
  traceUsbDevicesRequest,
  traceConfigUpdateNotification,
  traceRecordingStateRequest,
  traceRecordingStateChangedNotification,
  traceStartRecordingNotification,
  traceStopRecordingNotification,
} from "@constants/messages/trace-messages";
import {
  Recording,
  SerialSourceConfig,
  UsbSourceConfig,
  findUsbDevice,
  listUsbDevices,
  onUsbDeviceDetached,
} from "cfs-lib";
import { SerialPort } from "serialport";
import { IDEShellEnvProvider } from "../toolchains/shell-env-provider";
import path from "node:path";
import { getWorkspaceRoot } from "../utils/utils";
import { startTraceConversion } from "../debug-tools/profiler/trace-conversion-ui-helper";
import { TELEMETRY_ACTIONS } from "../telemetry/action-names";
import { getTelemetryManager } from "../telemetry/telemetry";
import { logger } from "../utils/logger";

const TRACE_CONFIGURATION_KEY = "traceCapture.configuration";
const DEFAULT_BAUD_RATE = 115200;

export const DEFAULT_TRACE_CONFIGURATION: TraceConfiguration = {
  source: { type: "uart", serialPort: "", baudRate: DEFAULT_BAUD_RATE },
  outputDirectory: "",
  autoReset: false,
  elfFile: "",
  buildDir: "",
  aiModels: [],
};

// The trace capture configuration shipped as a flat object (interfaceType
// / serialPort / baudRate at the top level) before 2.3.0 introduced other
// interface types and nested them under `source`. Workspaces that
// configured trace capture on an earlier version may still have this
// shape persisted in their settings.
type LegacyFlatTraceConfiguration = {
  interfaceType?: string;
  serialPort?: string;
  baudRate?: number;
};

function normalizeUartSource(
  serialPort: string | undefined,
  baudRate: number | undefined,
): TraceSourceConfiguration {
  return {
    type: "uart",
    serialPort: serialPort ?? "",
    baudRate: baudRate ?? DEFAULT_BAUD_RATE,
  };
}

function normalizeUsbDevice(
  usbDevice: Partial<UsbDeviceSelection> | undefined,
): UsbDeviceSelection | undefined {
  if (
    typeof usbDevice?.busNumber !== "number" ||
    typeof usbDevice.deviceAddress !== "number"
  ) {
    return undefined;
  }

  return {
    busNumber: usbDevice.busNumber,
    deviceAddress: usbDevice.deviceAddress,
  };
}

/**
 * Resolves the trace source configuration from persisted settings,
 * migrating the legacy flat shape to the current nested `source` shape
 * so existing UART users don't lose their configured port/baud rate,
 * and normalizing an incomplete nested `source` (see above).
 * @param rawConfiguration - The raw, persisted configuration value.
 */
function resolveSourceConfiguration(
  rawConfiguration:
    | (TraceConfiguration & LegacyFlatTraceConfiguration)
    | undefined,
): TraceSourceConfiguration {
  const source = rawConfiguration?.source;

  if (source?.type === "uart") {
    return normalizeUartSource(source.serialPort, source.baudRate);
  }

  if (source?.type === "usb") {
    return { type: "usb", usbDevice: normalizeUsbDevice(source.usbDevice) };
  }

  if (rawConfiguration?.interfaceType === "uart") {
    return normalizeUartSource(
      rawConfiguration.serialPort,
      rawConfiguration.baudRate,
    );
  }

  return DEFAULT_TRACE_CONFIGURATION.source;
}

type RegisteredWebview = {
  participant: WebviewIdMessageParticipant;
  handlers: vscode.Disposable[];
};

// "stopping" is a distinct state (rather than folding it into
// "recording") so handleRecordingError can tell an active recording
// apart from one that's already being torn down and no-op instead of
// racing the in-progress stop — see stopRecording/handleRecordingError.
type RecordingDetails =
  | {
      status: "recording";
      recording: Recording;
      startTime: number;
    }
  | {
      status: "stopping";
      recording: Recording;
      startTime: number;
    }
  | {
      status: "idle";
      error?: string;
    };

export class TraceCaptureService {
  private readonly webviews = new Map<string, RegisteredWebview>();
  private recordingDetails: RecordingDetails = {
    status: "idle",
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

    this.registerUsbDetachListener();
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
      .get<
        TraceConfiguration & LegacyFlatTraceConfiguration
      >(TRACE_CONFIGURATION_KEY);

    const firstCoreFolder = vscode.workspace.workspaceFolders?.find(
      (f) => f.name !== ".cfs",
    )?.name;

    // Built up field-by-field (rather than spreading rawConfiguration)
    // so that a legacy flat configuration's interfaceType/serialPort/
    // baudRate properties can never leak into the returned object.
    return {
      source: resolveSourceConfiguration(rawConfiguration),
      buildDir: rawConfiguration?.buildDir || `${firstCoreFolder}/build`,
      elfFile:
        rawConfiguration?.elfFile ||
        `${firstCoreFolder}/build/zephyr/zephyr.elf`,
      outputDirectory:
        rawConfiguration?.outputDirectory || `${firstCoreFolder}/tracefiles`,
      autoReset:
        rawConfiguration?.autoReset ?? DEFAULT_TRACE_CONFIGURATION.autoReset,
      aiModels:
        rawConfiguration?.aiModels ?? DEFAULT_TRACE_CONFIGURATION.aiModels,
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
    if (this.recordingDetails.status === "idle") {
      return {
        isRecording: false,
        error: this.recordingDetails.error,
      };
    }

    return {
      isRecording: true,
      startTime: this.recordingDetails.startTime,
    };
  }

  /**
   * Builds the data source configuration for the given trace source,
   * resolving a configured USB device back to a live `Device` handle.
   * @param source - The configured trace source.
   */
  private createSourceConfig(
    source: TraceSourceConfiguration,
  ): SerialSourceConfig | UsbSourceConfig {
    if (source.type === "uart") {
      return new SerialSourceConfig(source.serialPort, source.baudRate);
    }

    if (!source.usbDevice) {
      throw new Error("No USB device selected.");
    }

    const device = findUsbDevice(
      source.usbDevice.busNumber,
      source.usbDevice.deviceAddress,
    );

    if (!device) {
      throw new Error("The selected USB device is not connected.");
    }

    return new UsbSourceConfig(device);
  }

  /**
   * Checks whether the configured trace source is still available on the
   * host. If it isn't, returns the source with its source-specific field
   * cleared (serialPort/usbDevice) so the caller can persist the
   * correction; `correctedSource` is undefined when the source was
   * already unconfigured, so callers don't rewrite unchanged settings.
   * @param source - The configured trace source.
   */
  private async checkSourceAvailability(
    source: TraceSourceConfiguration,
  ): Promise<
    | { available: true }
    | {
        available: false;
        correctedSource: TraceSourceConfiguration | undefined;
      }
  > {
    if (source.type === "uart") {
      if (source.serialPort === "") {
        return { available: false, correctedSource: undefined };
      }

      const ports = await SerialPort.list();
      if (ports.some((port) => port.path === source.serialPort)) {
        return { available: true };
      }

      return {
        available: false,
        correctedSource: {
          type: "uart",
          serialPort: "",
          baudRate: source.baudRate,
        },
      };
    }

    if (!source.usbDevice) {
      return { available: false, correctedSource: undefined };
    }

    const device = findUsbDevice(
      source.usbDevice.busNumber,
      source.usbDevice.deviceAddress,
    );

    if (device) {
      return { available: true };
    }

    return {
      available: false,
      correctedSource: { type: "usb", usbDevice: undefined },
    };
  }

  private async persistCorrectedSource(
    configuration: TraceConfiguration,
    correctedSource: TraceSourceConfiguration,
  ): Promise<void> {
    await this.saveConfiguration({
      ...configuration,
      source: correctedSource,
    });
  }

  /**
   * Re-checks the configured trace source's availability and persists a
   * correction if it's no longer reachable (e.g. a USB device unplugged
   * without the side panel noticing), so every view reading the
   * configuration - not just the one that happens to re-fetch live
   * device lists - shows the same state. Failures are logged and
   * swallowed rather than surfaced, so a transient enumeration error
   * never blocks opening the configuration view.
   */
  async revalidateConfiguredSource(): Promise<void> {
    const configuration = this.getConfiguration();

    try {
      const availability = await this.checkSourceAvailability(
        configuration.source,
      );

      if (!availability.available && availability.correctedSource) {
        await this.persistCorrectedSource(
          configuration,
          availability.correctedSource,
        );
      }
    } catch (error: unknown) {
      logger.error(
        `Failed to revalidate the configured trace source: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async startRecording(): Promise<void> {
    if (this.recordingDetails.status !== "idle") {
      throw new Error("Recording is already in progress.");
    }

    const configuration = this.getConfiguration();

    try {
      const availability = await this.checkSourceAvailability(
        configuration.source,
      );

      if (!availability.available) {
        if (availability.correctedSource) {
          await this.persistCorrectedSource(
            configuration,
            availability.correctedSource,
          );
        }
        return;
      }

      const sourceConfig = this.createSourceConfig(configuration.source);

      void getTelemetryManager().then((telemetryManager) => {
        telemetryManager.logAction(TELEMETRY_ACTIONS.HW_PROFILING_STARTED, {});
      });

      const recording = await Recording.start({
        source: sourceConfig,
        outputFolder: path.isAbsolute(configuration.outputDirectory)
          ? configuration.outputDirectory
          : path.join(getWorkspaceRoot() ?? "", configuration.outputDirectory),
        sendEnableCommand: configuration.source.type === "usb",
      });
      this.lastRecording = recording;

      recording.onError((error) => {
        void this.handleRecordingError(recording, error);
      });

      const startTime = Date.now();
      this.recordingDetails = { status: "recording", recording, startTime };
    } catch (error: unknown) {
      this.recordingDetails = {
        status: "idle",
        error: `Failed to start recording: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  private async stopRecording(): Promise<void> {
    if (this.recordingDetails.status !== "recording") {
      throw new Error("No recording is currently in progress.");
    }

    // Captured locally, and the state flipped to "stopping" before
    // awaiting: handleRecordingError only acts while status is
    // "recording", so it can't race this method and swap
    // recordingDetails out from under it while this awaits.
    const { recording, startTime } = this.recordingDetails;
    this.recordingDetails = { status: "stopping", recording, startTime };

    try {
      await recording.stop();
      this.recordingDetails = { status: "idle" };

      void getTelemetryManager().then((telemetryManager) => {
        telemetryManager.logAction(
          TELEMETRY_ACTIONS.HW_PROFILING_COMPLETED,
          {},
        );
      });
    } catch (error: unknown) {
      this.recordingDetails = {
        status: "idle",
        error: `Failed to stop recording: ${
          error instanceof Error ? error.message : String(error)
        }`,
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

  /**
   * Reacts to a data source error during an active recording:
   * transitions to the error state and stops the recording. Guards
   * against reacting twice if the recording is already being stopped
   * (whether by this method or by a user-initiated stopRecording()).
   * @param recording - The recording that reported the error.
   * @param error - The error reported by the data source.
   */
  private async handleRecordingError(
    recording: Recording,
    error: Error,
  ): Promise<void> {
    if (
      this.recordingDetails.status !== "recording" ||
      this.recordingDetails.recording !== recording
    ) {
      return;
    }

    this.recordingDetails = {
      status: "stopping",
      recording,
      startTime: this.recordingDetails.startTime,
    };

    try {
      await recording.stop();
    } catch (stopError: unknown) {
      logger.error(
        `Failed to stop recording after an error: ${
          stopError instanceof Error ? stopError.message : String(stopError)
        }`,
      );
    }

    this.recordingDetails = {
      status: "idle",
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
          if (this.recordingDetails.status === "recording") {
            const telemetryManager = await getTelemetryManager();
            await telemetryManager.logAction(
              TELEMETRY_ACTIONS.TRACE_CAPTURE_STARTED,
              {},
            );
          }
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
          return SerialPort.list();
        },
        { sender: participant },
      ),

      this.messenger.onRequest(
        traceUsbDevicesRequest,
        () => {
          return listUsbDevices();
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

  /**
   * Re-checks the configured source as soon as a USB device is
   * unplugged, rather than waiting for the user to click Start
   * Recording or open the configuration view - a no-op for a uart
   * source or for a usb source that isn't the one that just
   * disconnected.
   */
  private registerUsbDetachListener(): void {
    const unsubscribe = onUsbDeviceDetached(() => {
      if (this.recordingDetails.status !== "idle") {
        return;
      }

      void this.revalidateConfiguredSource();
    });

    this.context.subscriptions.push(
      new vscode.Disposable(() => {
        unsubscribe();
      }),
    );
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
    await this.service.revalidateConfiguredSource();

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
