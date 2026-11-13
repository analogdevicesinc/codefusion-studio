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
import { LiveTracing } from "../debug-tools/profiler/live-tracing";
import { toZephelinConfig } from "../debug-tools/profiler/zephelin-config";
import { IDEShellEnvProvider } from "../toolchains/shell-env-provider";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Utils, getWorkspaceRoot } from "../utils/utils";
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
  isLiveTracingEnabled: false,
  tcpServerHost: "127.0.0.1",
  tcpServerPort: 5000,
  backendHost: "127.0.0.1",
  backendPort: 8000,
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

type ActiveCapture =
  | {
      mode: "offline";
      recording: Recording;
    }
  | {
      mode: "live";
      liveTracing: LiveTracing;
    };

// "stopping" is a distinct state (rather than folding it into
// "recording") so handleRecordingError can tell an active capture
// apart from one that's already being torn down and no-op instead of
// racing the in-progress stop — see stopRecording/handleRecordingError.
type RecordingDetails =
  | {
      status: "recording";
      capture: ActiveCapture;
      startTime: number;
    }
  | {
      status: "stopping";
      capture: ActiveCapture;
      startTime: number;
    }
  | {
      status: "idle";
      error?: string;
    };

const ZEPHELIN_MODULE_PATH = path.join("modules", "zephelin");
const ZEPHELIN_BACKEND_ENTRY_POINT = path.join("server", "run_backend.py");
const ZEPHELIN_REQUIREMENTS = [
  "requirements.txt",
  path.join("server", "requirements.txt"),
];
const ZEPHELIN_VENV_DIR = ".venv-zephelin";
const ZEPHELIN_VENV_PYTHON =
  process.platform === "win32"
    ? path.join(ZEPHELIN_VENV_DIR, "Scripts", "python.exe")
    : path.join(ZEPHELIN_VENV_DIR, "bin", "python");

/**
 * Runs a Python command.
 *
 * @param executable - The interpreter to run.
 * @param args - The arguments to pass to it.
 * @param cwd - The directory to run in.
 * @param token - Cancellation token that kills the process.
 */
function runPython(
  executable: string,
  args: string[],
  cwd: string,
  token: vscode.CancellationToken,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      executable,
      args,
      { cwd, maxBuffer: 32 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          const reason = stderr.trim().split("\n").slice(-3).join("\n");
          reject(new Error(reason || error.message));
          return;
        }

        resolve();
      },
    );

    token.onCancellationRequested(() => child.kill());
  });
}

/**
 * Resolves the interpreter that builds the virtual environment. The CFS SDK
 * ships one, so a user without a system Python can still set it up.
 *
 * @returns the interpreter to create the virtual environment with
 */
async function resolveSdkPython(): Promise<string> {
  const sdkPath = await Utils.getSdkPath();
  const isWindows = process.platform === "win32";
  const sdkPython = sdkPath
    ? path.join(
        sdkPath,
        "Tools",
        "python",
        isWindows ? "python.exe" : path.join("bin", "python3"),
      )
    : undefined;

  if (sdkPython && fs.existsSync(sdkPython)) {
    return sdkPython;
  }

  return isWindows ? "python" : "python3";
}

/**
 * Offers to create the virtual environment the Zephelin backend runs in,
 * inside the user's workspace.
 *
 * @param repositoryPath - The Zephelin repository the backend runs from.
 * @param workspaceRoot - The workspace the virtual environment is created in.
 * @returns the interpreter that was created, or undefined when it was not
 */
async function offerZephelinVirtualEnvironment(
  repositoryPath: string,
  workspaceRoot: string,
): Promise<string | undefined> {
  const venvDir = path.join(workspaceRoot, ZEPHELIN_VENV_DIR);
  const createItem: vscode.QuickPickItem = {
    label: "Create the Python environment",
    detail: `Creates ${venvDir} and installs the dependencies. Requires network access.`,
  };
  const answer = await vscode.window.showQuickPick([createItem], {
    title:
      "CFS: Live tracing needs a Python environment for the Zephelin server backend",
    placeHolder: "Select an option, or press Escape to cancel",
    ignoreFocusOut: true,
  });

  if (answer !== createItem) {
    return undefined;
  }

  const venvPython = path.join(workspaceRoot, ZEPHELIN_VENV_PYTHON);

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "CFS: Creating the Zephelin Python environment...",
      cancellable: true,
    },
    async (progress, token) => {
      try {
        const sdkPython = await resolveSdkPython();

        await runPython(
          sdkPython,
          ["-m", "venv", venvDir],
          workspaceRoot,
          token,
        );

        progress.report({ message: "Installing the backend requirements" });

        await runPython(
          venvPython,
          [
            "-m",
            "pip",
            "install",
            ...ZEPHELIN_REQUIREMENTS.flatMap((requirements) => [
              "-r",
              requirements,
            ]),
          ],
          repositoryPath,
          token,
        );

        return venvPython;
      } catch (error: unknown) {
        // A partial environment would be mistaken for a working one next time.
        await fs.promises.rm(venvDir, { recursive: true, force: true });

        if (token.isCancellationRequested) {
          return undefined;
        }

        vscode.window.showErrorMessage(
          `CFS: Failed to create the Zephelin Python environment. ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        return undefined;
      }
    },
  );
}

/**
 * Derives where the Zephelin backend lives and which interpreter runs it, so
 * live tracing works against the Zephelin repository shipped with the
 * installed Zephyr package without the user pointing at a clone by hand.
 *
 * Looks for the interpreter in `.venv-zephelin` at the workspace root, and
 * offers to create it there when it is missing.
 *
 * @param zephyrBase - The resolved Zephyr repository root (ZEPHYR_BASE).
 * @returns the backend paths to forward, each set only when CFS derived it
 */
async function resolveZephelinBackend(zephyrBase: string): Promise<{
  backendPath?: string;
  pythonPath?: string;
}> {
  const zephelinSettings = vscode.workspace.getConfiguration("zephelin");
  const configuredBackendPath = zephelinSettings.get<string>("backendPath");

  const modulePath = zephyrBase
    ? path.join(path.dirname(zephyrBase), ZEPHELIN_MODULE_PATH)
    : undefined;
  const derivedBackendPath =
    modulePath &&
    fs.existsSync(path.join(modulePath, ZEPHELIN_BACKEND_ENTRY_POINT))
      ? modulePath
      : undefined;

  const repositoryPath = configuredBackendPath || derivedBackendPath;
  const backendPath = configuredBackendPath ? undefined : derivedBackendPath;

  const workspaceRoot = getWorkspaceRoot();

  if (
    !repositoryPath ||
    !workspaceRoot ||
    zephelinSettings.get<string>("pythonPath")
  ) {
    return { backendPath };
  }

  const venvPython = path.join(workspaceRoot, ZEPHELIN_VENV_PYTHON);
  const pythonPath = fs.existsSync(venvPython)
    ? venvPython
    : await offerZephelinVirtualEnvironment(repositoryPath, workspaceRoot);

  return { backendPath, pythonPath };
}

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
      .get<TraceConfiguration & LegacyFlatTraceConfiguration>(
        TRACE_CONFIGURATION_KEY,
      );

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
      isLiveTracingEnabled:
        rawConfiguration?.isLiveTracingEnabled ??
        DEFAULT_TRACE_CONFIGURATION.isLiveTracingEnabled,
      tcpServerHost:
        rawConfiguration?.tcpServerHost ??
        DEFAULT_TRACE_CONFIGURATION.tcpServerHost,
      tcpServerPort:
        rawConfiguration?.tcpServerPort ??
        DEFAULT_TRACE_CONFIGURATION.tcpServerPort,
      backendHost:
        rawConfiguration?.backendHost ??
        DEFAULT_TRACE_CONFIGURATION.backendHost,
      backendPort:
        rawConfiguration?.backendPort ??
        DEFAULT_TRACE_CONFIGURATION.backendPort,
    };
  }

  private async syncZephelinSettings(
    configuration: TraceConfiguration,
  ): Promise<void> {
    try {
      const zephelinConfig = vscode.workspace.getConfiguration("zephelin");

      const forwarded = toZephelinConfig(configuration, getWorkspaceRoot());

      await Promise.all(
        Object.entries(forwarded).map(([key, value]) =>
          zephelinConfig.update(
            key,
            value,
            vscode.ConfigurationTarget.Workspace,
          ),
        ),
      );
    } catch (error) {
      logger.error(
        "Failed to sync settings to Zephelin workspace config:",
        error,
      );
    }
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

    await this.syncZephelinSettings(configuration);

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

      let capture: ActiveCapture;

      if (configuration.isLiveTracingEnabled) {
        const zephyrBase = (await this.shellEnvProvider.getZephyrBase()) || "";
        const configuredZephyrBase = vscode.workspace
          .getConfiguration("zephelin")
          .get<string>("zephyrBase");

        const liveTracing = await LiveTracing.start({
          source: sourceConfig,
          tcpServerHost: configuration.tcpServerHost,
          tcpServerPort: configuration.tcpServerPort,
          backendHost: configuration.backendHost,
          backendPort: configuration.backendPort,
          aiModels: configuration.aiModels,
          buildDir: configuration.buildDir,
          zephyrBase: configuredZephyrBase ? "" : zephyrBase,
          ...(await resolveZephelinBackend(zephyrBase)),
        });

        capture = { mode: "live", liveTracing };

        liveTracing.onError((error) => {
          void this.handleRecordingError(capture, error);
        });
      } else {
        const recording = await Recording.start({
          source: sourceConfig,
          outputFolder: path.isAbsolute(configuration.outputDirectory)
            ? configuration.outputDirectory
            : path.join(
                getWorkspaceRoot() ?? "",
                configuration.outputDirectory,
              ),
          sendEnableCommand: configuration.source.type === "usb",
        });
        this.lastRecording = recording;

        capture = { mode: "offline", recording };

        recording.onError((error) => {
          void this.handleRecordingError(capture, error);
        });
      }

      const startTime = Date.now();
      this.recordingDetails = { status: "recording", capture, startTime };
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
    const { capture, startTime } = this.recordingDetails;
    this.recordingDetails = { status: "stopping", capture, startTime };

    try {
      await this.stopCapture(capture);
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

    // Live tracing streams straight to the viewer, so there is no trace
    // file to convert. The static TEF file of live-tracing session can
    // be exported from the viewer menu.
    if (capture.mode === "offline") {
      const config = this.getConfiguration();

      await startTraceConversion(capture.recording, this.shellEnvProvider, {
        aiModelPaths: config.aiModels,
        buildDir: config.buildDir,
        zephyrElfPath: config.elfFile,
      });
    }
  }

  /**
   * Tears down an active capture, whichever mode it is in.
   * @param capture - The capture to stop.
   */
  private async stopCapture(capture: ActiveCapture): Promise<void> {
    if (capture.mode === "live") {
      await capture.liveTracing.stop();
      capture.liveTracing.dispose();
      return;
    }

    await capture.recording.stop();
  }

  /**
   * Reacts to a data source error during an active capture: transitions
   * to the error state and stops the capture. Guards against reacting
   * twice if the capture is already being stopped (whether by this
   * method or by a user-initiated stopRecording()).
   * @param capture - The capture that reported the error.
   * @param error - The error reported by the data source.
   */
  private async handleRecordingError(
    capture: ActiveCapture,
    error: Error,
  ): Promise<void> {
    if (
      this.recordingDetails.status !== "recording" ||
      this.recordingDetails.capture !== capture
    ) {
      return;
    }

    this.recordingDetails = {
      status: "stopping",
      capture,
      startTime: this.recordingDetails.startTime,
    };

    try {
      await this.stopCapture(capture);
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

    // Convert whatever was captured before the error so a mid-recording
    // failure (e.g. a device disconnect) still salvages the traces. Live
    // tracing streams straight to the viewer, so there is nothing to convert.
    if (capture.mode === "offline") {
      const config = this.getConfiguration();

      await startTraceConversion(capture.recording, this.shellEnvProvider, {
        aiModelPaths: config.aiModels,
        buildDir: config.buildDir,
        zephyrElfPath: config.elfFile,
      });
    }
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
