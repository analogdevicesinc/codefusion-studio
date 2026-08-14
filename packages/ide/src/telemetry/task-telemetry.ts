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

import { TELEMETRY_ACTIONS } from "./action-names";
import { getTelemetryManager } from "./telemetry";
import { type Task, ShellExecution } from "vscode";
import { Utils } from "../utils/utils";

/**
 * Sends telemetry data for a started task.
 * Only sends telemetry for CFS tasks.
 * @param task - The task to inspect.
 */
export async function sendTaskStartTelemetry(task: Task): Promise<void> {
  const taskType = getTrackedTaskType(task);

  if (taskType !== "build" && taskType !== "flash") {
    return;
  }

  // Check if the scope is a folder object
  const workspaceFolder =
    typeof task.scope === "object" ? task.scope : undefined;
  const firmwarePlatform = workspaceFolder
    ? Utils.getProjectFirmwarePlatform(workspaceFolder)
    : undefined;

  const telemetryManager = await getTelemetryManager();

  if (taskType === "build") {
    telemetryManager.logAction(TELEMETRY_ACTIONS.BUILD_FW_STARTED, {
      buildSystem: getBuildSystem(task),
      firmwarePlatform,
    });
  } else {
    const flashMethod = getFlashMethod(task);
    telemetryManager.logAction(TELEMETRY_ACTIONS.FLASH_FW_STARTED, {
      connectionType: flashMethod,
      flashMode: flashMethod,
      firmwarePlatform,
    });
  }
}

/**
 * Sends telemetry data for a completed task, including its exit code and duration.
 * Only sends telemetry for CFS tasks.
 * @param task
 * @param exitCode
 * @param durationMs
 */
export async function sendTaskEndTelemetry(
  task: Task,
  socName: string | undefined,
  socPackage: string | undefined,
  exitCode: number | undefined,
  durationMs: number | undefined,
): Promise<void> {
  const telemetryManager = await getTelemetryManager();
  const taskType = getTrackedTaskType(task);

  if (taskType !== "build" && taskType !== "flash") {
    return;
  }
  const action =
    taskType === "build"
      ? exitCode === 0
        ? TELEMETRY_ACTIONS.BUILD_FW_SUCCESS
        : TELEMETRY_ACTIONS.BUILD_FW_FAILURE
      : exitCode === 0
        ? TELEMETRY_ACTIONS.FLASH_FW_SUCCESS
        : TELEMETRY_ACTIONS.FLASH_FW_FAILURE;

  telemetryManager.logAction(action, {
    exitCode,
    durationMs,
    soc: socName,
    socPackage,
    ...(taskType === "build"
      ? { buildSystem: getBuildSystem(task) }
      : { flashMethod: getFlashMethod(task) }),
  });
}

/**
 * Determines whether a task is a CFS build or flash task that should be tracked
 * for telemetry.
 * @param task - The task to inspect.
 * @returns "build" or "flash" or "ozone" for tracked CFS tasks, otherwise undefined.
 */
function getTrackedTaskType(task: Task): "build" | "flash" | undefined {
  const taskName = task.name.toLowerCase();
  const isCfsTask =
    task.source === "CFS" ||
    (task.source === "Workspace" && taskName.includes("cfs"));

  if (!isCfsTask) {
    return undefined;
  }

  if (taskName.includes("build")) {
    return "build";
  }

  if (taskName.includes("flash")) {
    return "flash";
  }

  return undefined;
}

/**
 * Determines the build system used by a build task from its command line.
 * @param task - The build task to inspect.
 * @returns "ninja", "cmake", "make", or "west", or undefined if none is detected.
 */
function getBuildSystem(task: Task): string | undefined {
  const commandLine =
    task.execution instanceof ShellExecution
      ? (task.execution.commandLine?.toLowerCase() ?? "")
      : "";

  // Check ninja and cmake before make since "cmake" contains "make".
  if (commandLine.includes("ninja")) {
    return "ninja";
  }

  if (commandLine.includes("cmake")) {
    return "cmake";
  }

  if (commandLine.includes("make")) {
    return "make";
  }

  if (commandLine.includes("west")) {
    return "west";
  }

  return undefined;
}

/**
 * Determines the flash method used by a flash task from its name.
 * @param task - The flash task to inspect.
 * @returns "jlink" or "openocd", or undefined if neither is detected.
 */
function getFlashMethod(task: Task): string | undefined {
  const taskName = task.name.toLowerCase();

  if (taskName.includes("jlink")) {
    return "jlink";
  }

  if (taskName.includes("openocd")) {
    return "openocd";
  }

  return undefined;
}
