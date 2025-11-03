/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
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

export const INFO = {
  configureWorkspace:
    "CFS: Configure workspace as a CodeFusion Studio project?",
  workspaceAlreadyConfigured:
    "CFS: Workspace already configured as a CodeFusion Studio project.",
  workspaceConfigured:
    "CFS: Configured workspace as a CodeFusion Studio project.",
};

export const WARNING = {
  toolchainNotSelected: "CFS: Toolchain not selected. Please select toolchain.",
  sdkPathNotSelected: "CFS: Please select the SDK path",
  toolchainNotSupported: "CFS: Toolchain not supported",
  duplicateToolFound: "CFS: Duplicate tool found:\n",
  packageManagerInitError: "CFS: Package manager failed to initialize",
};

export const ERROR = {
  architectureResolutionFailed:
    "CFS: Failed to resolve the architecture used. Please check the .cproject file.",
  sdkPathMissing: "CFS: CodeFusion Studio SDK path missing.",
  jlinkExecutablePathMissing: "CFS: JLink executable path missing.",
  invalidFolderName: "CFS: Invalid folder name.",
  noToolSearchDirectories: "CFS: No tool search directories found.",
  updateSdkPathFailed: "CFS: Error while updating SDK path",
};

export const PROMPTS = {
  enterProjectName: "Enter your Project Name.",
  selectProcessor: "Select the Processor",
  createNewProject: "CFS: Create new project",
  selectNewProjectLocation: "Select the new project location",
};
