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

import type { CfsFeature, CfsProject } from "cfs-types";
import { renderTemplates } from "../../utilities/eta-utils.js";
import { copyFiles } from "../../utilities/fs-utils.js";
import path from "path";
import { evalNestedTemplateLiterals } from "../../utilities/cfs-utilities.js";

export class CfsEtaProjectGenerator {
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
   * Generates the project by copying files and rendering templates.
   * @param baseDir - Directory location for the files generated.
   * @returns A promise that resolves when the project generation is complete.
   */
  async generateProject(
    baseDir: string,
    context: CfsProject
  ): Promise<void> {
    const formattedFiles = this.cfsFeature.files.map((file) => {
      const evaluatedDst = evalNestedTemplateLiterals(
        file.dst,
        context
      );

      return {
        ...file,
        src: path.join(this.pluginPath, file.src),
        dst: baseDir ? path.join(baseDir, evaluatedDst) : evaluatedDst
      };
    });

    await copyFiles(formattedFiles, context);

    const formattedTemplates = this.cfsFeature.templates.map(
      (template) => {
        const evaluatedDst = evalNestedTemplateLiterals(
          template.dst,
          context
        );

        return {
          ...template,
          dst: baseDir
            ? path.join(baseDir, evaluatedDst)
            : evaluatedDst
        };
      }
    );

    await renderTemplates(
      formattedTemplates,
      context,
      this.pluginPath
    );
  }
}
