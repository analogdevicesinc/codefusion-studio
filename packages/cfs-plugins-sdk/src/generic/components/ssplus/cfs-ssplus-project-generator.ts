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

import { exec } from "child_process";
import type { CfsProject } from "cfs-types";

export class CfsSSPlusProjectGenerator {
  /**
   * Generate a SigmaStudio+ project using SStudioPlusConsole.exe.
   * @param baseDir - Directory location for the files generated.
   * @param context - The project context.
   * @returns A promise that resolves when the project generation is complete.
   */
  async generateProject(
    baseDir: string,
    context: CfsProject
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!context.platformConfig.CreateSigmaStudioPlusProject) {
        resolve();
        return;
      }

      if (!context.platformConfig.SigmaStudioPlusProjectName) {
        reject(
          new Error(
            "SigmaStudio+ Project Name not set in core configuration"
          )
        );
        return;
      }

      let projectName = context.platformConfig
        .SigmaStudioPlusProjectName as string;
      // Trim the file extension - we'll add it later on the command line.
      projectName = projectName.replace(/\.ssprj$/, "");

      if (!context.platformConfig.SigmaStudioPlusPath) {
        reject(
          new Error(
            "SigmaStudio+ Installation Path not set in core configuration"
          )
        );
        return;
      }

      const ssPlusPath = (
        context.platformConfig.SigmaStudioPlusPath as string
      ).replace(/\/$/, "");

      const projectPath = [baseDir, "src", "FastDSP"].join("/");

      // Run SStudioPlusConsole.exe to create the project
      exec(
        `"${ssPlusPath}/Host/SStudioPlusConsole.exe" createproject -n "${projectName}.ssprj" -f ${projectPath}/"SStudioPlusConfig.json" -p ${projectPath} > ${projectPath}/SStudioPlusConsole.log`,
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    });
  }
}
