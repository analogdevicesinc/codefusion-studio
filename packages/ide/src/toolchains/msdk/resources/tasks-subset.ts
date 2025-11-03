/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

export default {
  version: "2.0.0",
  type: "shell",
  tasks: [
    {
      label: "clean",
      type: "shell",
      command:
        "make -j 8 clean --output-sync=target --no-print-directory TARGET=${config:cfs.project.target} BOARD=${config:cfs.project.board} MAKE=make PROJECT=${config:cfs.project.name}",
      group: "build",
      problemMatcher: [],
    },
    {
      label: "clean-periph",
      type: "shell",
      command:
        "make -j 8 distclean --output-sync=target --no-print-directory TARGET=${config:cfs.project.target} BOARD=${config:cfs.project.board} MAKE=make PROJECT=${config:cfs.project.name}",
      group: "build",
      problemMatcher: [],
    }
  ],
};
