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

import type { CfsFeature, CfsWorkspace } from "cfs-types";
import { renderTemplates } from "../../utilities/eta-utils.js";
import { copyFiles } from "../../utilities/fs-utils.js";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { convertToPascalCase } from "../../utilities/cfs-utilities.js";
import { evalNestedTemplateLiterals } from "../../utilities/cfs-utilities.js";

export class CfsEtaWorkspaceGenerator {
  /**
   * Constructor
   * @param pluginPath - The path to the plugin.
   * @param cfsFeature - The feature information required for code generation.
   */
  constructor(
    protected pluginPath: string,
    protected cfsFeature: CfsFeature
  ) {}

  /**
   * Generates the workspace by copying files and rendering templates.
   * @param cfsWorkspace - The workspace information required for code generation.
   * @returns A promise that resolves when the workspace generation is complete.
   */
  async generateWorkspace(cfsWorkspace: CfsWorkspace) {
    if (!cfsWorkspace.location) {
      throw new Error("Workspace location is undefined");
    }

    const workspacePath = path.join(
      cfsWorkspace.location,
      cfsWorkspace.workspaceName
    );

    // Create the workspace directory
    await mkdir(workspacePath, { recursive: true });

    // Create the .cfs directory within the workspace directory
    const cfsDir = path.join(workspacePath, ".cfs");
    await mkdir(cfsDir, { recursive: true });

    // Create the .cfsworkspace file inside the .cfs directory
    const cfsWorkspaceFile = path.join(cfsDir, ".cfsworkspace");

    const titleCasedWorkspace = convertToPascalCase(cfsWorkspace);

    await writeFile(
      cfsWorkspaceFile,
      JSON.stringify(titleCasedWorkspace, null, 2)
    );

    const formattedFiles = this.cfsFeature.files.map((file) => {
      const evaluatedDst = evalNestedTemplateLiterals(
        file.dst,
        cfsWorkspace
      );

      return {
        ...file,
        src: path.join(this.pluginPath, file.src),
        dst: path.join(workspacePath, evaluatedDst)
      };
    });

    await copyFiles(formattedFiles, cfsWorkspace);

    const formattedTemplates = this.cfsFeature.templates.map(
      (template) => {
        const evaluatedDst = evalNestedTemplateLiterals(
          template.dst,
          cfsWorkspace
        );

        return {
          ...template,
          dst: path.join(workspacePath, evaluatedDst)
        };
      }
    );

    await renderTemplates(
      formattedTemplates,
      cfsWorkspace,
      this.pluginPath
    );
  }
}
