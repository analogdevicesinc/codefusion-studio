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
import * as os from "node:os";
import * as path from "node:path";
import { ViewProviderPanel } from "../view-provider/view-provider-panel";
import { AI_HARDWARE_PROFILING_EDITOR_ID, PRISTINE_BUILD } from "../constants";
import { Messenger } from "vscode-messenger";
import {
  applicationStatusUpdate,
  deployModelForProfiling,
  getProfilingViewData,
  stopDeployment,
  updateProfilingConfiguration,
} from "../constants/messages/ai-hardware-profiling-messages";
import type {
  BuildStatus,
  DeployStatus,
} from "../types/ai-hardware-profiling-types";
import { CfsSerialPortManager } from "../debug-tools/serial-port-manager";
import { MessageParticipant } from "vscode-messenger-common";
import { Utils } from "../utils/utils";
import { CfsAiProfilingData, CfsConfig } from "cfs-types";
import { Recording } from "../debug-tools/profiler/recording";
import { SerialSourceConfig } from "../debug-tools/profiler/data-source-factory";
import { IDEShellEnvProvider } from "../toolchains/shell-env-provider";
import {
  CfsDataModelManager,
  CfsToolManager,
  globFiles,
  readJsonFile,
} from "cfs-lib";
import { AIToolsService, getCfsaiPath } from "../services/ai-tools-service";
import { CodeGenerationFailure } from "cfs-lib/dist/types/code-generation";
import { startTraceConversion } from "../debug-tools/profiler/trace-conversion-ui-helper";

export class AiHardwareProfilingEditor
  implements vscode.CustomTextEditorProvider
{
  static readonly viewType = AI_HARDWARE_PROFILING_EDITOR_ID;

  private buildStatus: BuildStatus = "idle";
  private deployStatus: DeployStatus = "undeployed";
  private recording: Recording | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private messenger: Messenger,
    private shellEnvProvider: IDEShellEnvProvider,
    private toolManager: CfsToolManager,
    private dataModelManager: CfsDataModelManager,
  ) {}

  static register(
    context: vscode.ExtensionContext,
    messenger: Messenger,
    shellEnvProvider: IDEShellEnvProvider,
    toolManager: CfsToolManager,
    dataModelManager: CfsDataModelManager,
  ): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      AiHardwareProfilingEditor.viewType,
      new AiHardwareProfilingEditor(
        context,
        messenger,
        shellEnvProvider,
        toolManager,
        dataModelManager,
      ),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    );
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    const viewProviderPanel = new ViewProviderPanel(this.context, {
      distDir: "out/ai-hardware-profiling",
      indexPath: "out/ai-hardware-profiling/index.html",
    });

    const participant = this.messenger.registerWebviewPanel(webviewPanel);

    this.registerMessageHandlers(document, participant);

    await viewProviderPanel.resolveWebviewView(webviewPanel);

    this.startBuild();
  }

  private registerMessageHandlers(
    document: vscode.TextDocument,
    participant: MessageParticipant,
  ) {
    const aiProfilingData: CfsAiProfilingData = JSON.parse(
      document.getText() || "{}",
    );

    this.messenger.onRequest(
      getProfilingViewData,
      async () => {
        return {
          hardwareResources: {
            debuggers: Object.keys(aiProfilingData.Debuggers ?? {}),
            usbPorts: (await CfsSerialPortManager.listPorts()).map(
              (port) => port.path,
            ),
            port: aiProfilingData.Output?.Port,
          },
          profilingConfig: {
            selectedDebugger: aiProfilingData.SelectedDebugger,
            selectedUsbPort: aiProfilingData.SelectedPort,
          },
          applicationStatus: {
            buildStatus: this.buildStatus,
            deployStatus: this.deployStatus,
          },
        };
      },
      { sender: participant },
    );

    this.messenger.onNotification(
      updateProfilingConfiguration,
      async (config) => {
        const currentData: CfsAiProfilingData = JSON.parse(
          document.getText() || "{}",
        );

        const updatedData: CfsAiProfilingData = {
          ...currentData,
          SelectedDebugger: config.selectedDebugger,
          SelectedPort: config.selectedUsbPort,
        };

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length),
        );
        edit.replace(
          document.uri,
          fullRange,
          JSON.stringify(updatedData, null, 2),
        );
        await vscode.workspace.applyEdit(edit);
      },
      { sender: participant },
    );

    this.messenger.onNotification(
      deployModelForProfiling,
      async () => {
        const aiProfilingData: CfsAiProfilingData = JSON.parse(
          document.getText() || "{}",
        );

        if (
          !aiProfilingData.SelectedDebugger ||
          !aiProfilingData.SelectedPort
        ) {
          vscode.window.showErrorMessage(
            "Please select both a debugger and a USB port before deploying.",
          );
          return;
        }

        this.updateDeployStatus("deploying");
        try {
          await Utils.executeAndWaitForCFSTask(
            aiProfilingData.Debuggers[aiProfilingData.SelectedDebugger],
          );

          await this.startRecording(
            aiProfilingData.SelectedPort,
            this.getProfilingOutputFolder(),
          );

          this.updateDeployStatus("running");
        } catch (error) {
          vscode.window.showErrorMessage(`Model Deployment failed: ${error}`);
          console.error("Error during deployment process:", error);
          this.updateDeployStatus("error");
        }
      },
      { sender: participant },
    );

    this.messenger.onNotification(
      stopDeployment,
      async () => {
        await this.stopRecordingAndHandleOutput();
      },
      { sender: participant },
    );
  }

  private getProfilingOutputFolder(): string {
    return path.join(os.tmpdir(), "cfs-ai-traces");
  }

  private async startRecording(
    serialPort: string,
    outputFolder: string,
  ): Promise<void> {
    try {
      const sourceConfig = new SerialSourceConfig(serialPort, 115200);
      this.recording = await Recording.start({
        source: sourceConfig,
        outputFolder,
      });

      this.recording.onError((error) => {
        this.updateDeployStatus("error");
        vscode.window.showErrorMessage(`Recording error: ${error.message}`);
      });
    } catch (error: unknown) {
      const errorMessage = `Failed to start recording: ${error instanceof Error ? error.message : String(error)}`;
      throw new Error(errorMessage);
    }
  }

  private async stopRecordingAndHandleOutput(): Promise<void> {
    if (!this.recording) {
      return;
    }

    try {
      await this.recording.stop();
      this.updateDeployStatus("stopped");
    } catch (error: unknown) {
      const errorMessage = `Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`;
      this.recording = undefined;
      this.updateDeployStatus("error");
      vscode.window.showErrorMessage(errorMessage);
      console.error("Error during trace stop/conversion process:", error);
    }

    if (!this.recording) {
      return;
    }

    await startTraceConversion(this.recording, this.shellEnvProvider);
    this.recording = undefined;
  }

  private async startBuild() {
    try {
      this.updateBuildStatus("building");

      await Utils.isExtensionReady();

      const aiToolsService = new AIToolsService(
        await getCfsaiPath(this.toolManager),
      );

      const workspaceFile = vscode.workspace.workspaceFile;

      const workspacePath = workspaceFile
        ? path.dirname(workspaceFile.fsPath)
        : path.join(os.tmpdir(), "cfs").replace(/\\/g, "/");

      const cfsconfig = (
        await globFiles(["**/*.cfsconfig"], {
          cwd: workspacePath,
          deep: 2,
          absolute: true,
        })
      )[0];

      if (!cfsconfig) {
        throw new Error("No .cfsconfig file found.");
      }

      const cfsConfig = (await readJsonFile(cfsconfig)) as CfsConfig;

      const datamodel = await this.dataModelManager.getDataModel(
        cfsConfig.Soc,
        cfsConfig.Package,
        cfsConfig.DataModelVersion,
      );

      if (!datamodel) {
        throw new Error(
          `Data model not found for SoC ${cfsConfig.Soc}, Package ${cfsConfig.Package}, Version ${cfsConfig.DataModelVersion}`,
        );
      }

      const codeGenRes = await aiToolsService.generateAiModelCode(
        cfsConfig,
        datamodel,
        workspacePath,
      );

      if (codeGenRes.some((res) => typeof res === "object" && "error" in res)) {
        throw new Error(
          `Code generation failed: ${codeGenRes
            .filter((res) => typeof res === "object" && "error" in res)
            .map((res) => (res as CodeGenerationFailure).error)
            .join(", ")}`,
        );
      }

      const exitCode = await Utils.executeAndWaitForCFSTask(
        PRISTINE_BUILD,
        vscode.TaskGroup.Build,
      );

      this.updateBuildStatus(exitCode === 0 ? "built" : "error");
    } catch (error) {
      console.error("Error during build process:", error);
      this.updateBuildStatus("error");
    }
  }

  updateBuildStatus(status: BuildStatus) {
    this.buildStatus = status;
    this.notifyStatusUpdate();
  }

  updateDeployStatus(status: DeployStatus) {
    this.deployStatus = status;
    this.notifyStatusUpdate();
  }

  private notifyStatusUpdate() {
    this.messenger.sendNotification(
      applicationStatusUpdate,
      { type: "webview", webviewType: AiHardwareProfilingEditor.viewType },
      {
        buildStatus: this.buildStatus,
        deployStatus: this.deployStatus,
      },
    );
  }
}
