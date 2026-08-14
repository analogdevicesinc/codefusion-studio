/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { expect } from "chai";
import { describe, it } from "mocha";
import type { ConfiguredProject } from "cfs-types";
import { mergePeripheralProjectUpdates } from "../../utils/project-persistence";

function createProject(
  overrides: Partial<ConfiguredProject> = {}
): ConfiguredProject {
  return {
    CoreId: "CM4",
    ProjectId: "CM4",
    PluginId: "com.analog.project.zephyr.plugin",
    PluginVersion: "1.0.0",
    FirmwarePlatform: "zephyr",
    ExternallyManaged: false,
    PlatformConfig: {},
    Partitions: [],
    Peripherals: [],
    ...overrides,
  };
}

describe("mergePeripheralProjectUpdates", () => {
  it("preserves current profiling and AI model settings", () => {
    const profiling = {
      Zephelin: {
        Enabled: true,
        RtosEventsEnabled: true,
        ProfilingMemoryUsageEnabled: true,
        ProfilingMemoryUsageInterval: 500,
        ProfilingCpuLoadEnabled: true,
        ProfilingCpuLoadInterval: 250,
        AIEnabled: true,
        InstrumentationSubsystemEnabled: true,
        Interface: { Type: "UART" as const, Port: "UART2" },
        Format: "CTF",
      },
    };
    const aiModels = [
      {
        Name: "configured-model",
        Enabled: true,
        Files: { Model: "./models/configured.tflite" },
        OutDir: "generated/models",
        Target: { Core: "CM4" },
        Backend: { Name: "tflm", Extensions: { ArenaSize: 12345 } },
      },
    ];
    const persistedProjects = [
      createProject({ Profiling: profiling, AIModels: aiModels }),
    ];
    const peripheralUpdates = [
      createProject({
        Profiling: {
          Zephelin: {
            ...profiling.Zephelin,
            Enabled: false,
            AIEnabled: false,
          },
        },
        AIModels: [],
        Partitions: [
          {
            Name: "flash",
            StartAddress: "0x10000000",
            Size: 1024,
            IsOwner: true,
            Access: "R",
            Config: {},
          },
        ],
        Peripherals: [
          {
            Name: "CAN0",
            Signals: [],
            Config: {},
          },
        ],
      }),
    ];

    const result = mergePeripheralProjectUpdates(
      persistedProjects,
      peripheralUpdates
    );

    expect(result[0].Profiling).to.deep.equal(profiling);
    expect(result[0].AIModels).to.deep.equal(aiModels);
    expect(result[0].Partitions).to.deep.equal(peripheralUpdates[0].Partitions);
    expect(result[0].Peripherals).to.deep.equal(
      peripheralUpdates[0].Peripherals
    );
  });

  it("ignores updates for projects removed from the current document", () => {
    const persistedProjects = [createProject()];
    const peripheralUpdates = [
      createProject({
        ProjectId: "removed-project",
        Partitions: [
          {
            Name: "flash",
            StartAddress: "0x10000000",
            Size: 1024,
            IsOwner: true,
            Access: "R",
            Config: {},
          },
        ],
        Peripherals: [
          {
            Name: "CAN0",
            Signals: [],
            Config: {},
          },
        ],
      }),
    ];

    const result = mergePeripheralProjectUpdates(
      persistedProjects,
      peripheralUpdates
    );

    expect(result).to.deep.equal(persistedProjects);
  });
});
