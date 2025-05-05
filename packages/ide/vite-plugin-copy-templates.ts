/**
 *
 * Copyright (c) 2024 Analog Devices, Inc. All Rights Reserved.
 * This software is proprietary to Analog Devices, Inc. and its licensors.
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

import { Plugin } from "vite";
import { exec } from "child_process";
import path from "path";

export function copyTemplatesPlugin(): Plugin {
  return {
    name: "copy-templates-plugin",
    apply: "build",
    closeBundle() {
      return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(
          __dirname,
          "../cfs-lib/copyTemplatesCfsIde.mjs",
        );
        exec(`node ${scriptPath}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error executing copyTemplatesCfsIde.mjs: ${stderr}`);
            reject(error);
          } else if (stderr) {
            console.log(`Errors: ${stderr}`);
            reject(stderr);
          } else {
            console.log(`copyTemplatesCfsIde.mjs output: ${stdout}`);
            resolve();
          }
        });
      });
    },
  };
}
