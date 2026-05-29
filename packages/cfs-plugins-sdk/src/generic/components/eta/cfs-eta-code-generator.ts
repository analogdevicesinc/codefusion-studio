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

import type {
  CfsConfig,
  ConfiguredProject,
  CfsFeature
} from "cfs-types";
import { renderTemplates } from "../../utilities/eta-utils.js";
import { copyFiles } from "../../utilities/fs-utils.js";
import { evalNestedTemplateLiterals } from "../../utilities/cfs-utilities.js";
import path from "path";

export class CfsEtaCodeGenerator {
  /**
   * Constructor
   * @param pluginPath - The path to the plugin.
   * @param cfsFeature - The feature information required for code generation.
   * @param context - The workspace information required for code generation.
   */
  constructor(
    protected pluginPath: string,
    protected cfsFeature: CfsFeature
  ) {}

  /**
   * Generates code by copying files and rendering templates.
   * @param data - The data needed for rendering eta templates.
   * @param baseDir - Directory location for the files generated.
   * @returns A promise that resolves when the code generation is complete.
   */
  async generateCode(
    data: Record<string, unknown>,
    baseDir: string
  ): Promise<string[]> {
    const projectId = data.projectId as string;

    const projectConfig = (data.cfsconfig as CfsConfig).Projects.find(
      (proj: ConfiguredProject) => proj.ProjectId === projectId
    );

    if (!projectConfig) {
      throw new Error(
        `Project with ID ${projectId} not found in cfsconfig.`
      );
    }

    const projectDir = path
      .join(
        baseDir,
        (projectConfig.PlatformConfig as { ProjectName: string })
          .ProjectName
      )
      .replace(/\\/g, "/");

    const formattedFiles = this.cfsFeature.files.map((file) => {
      const evaluatedDst = evalNestedTemplateLiterals(file.dst, data);

      return {
        ...file,
        src: path.join(this.pluginPath, file.src),
        dst: path.join(projectDir, evaluatedDst)
      };
    });

    await copyFiles(formattedFiles, data);

    const formattedTemplates = this.cfsFeature.templates.map(
      (template) => {
        const evaluatedDst = evalNestedTemplateLiterals(
          template.dst,
          data
        );

        return {
          ...template,
          dst: path.join(projectDir, evaluatedDst)
        };
      }
    );

    const filesCreated = await renderTemplates(
      formattedTemplates,
      data,
      this.pluginPath
    );
    return filesCreated;
  }
}
