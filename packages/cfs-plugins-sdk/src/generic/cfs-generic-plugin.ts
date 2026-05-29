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

import path from "path";
import type {
  CfsPluginInfo,
  CfsWorkspaceGenerationService,
  CfsProjectGenerationService,
  CfsCodeGenerationService,
  CfsPropertyProviderService,
  CfsSocControlsOverrideService,
  CfsProjectConfigService,
  CfsSystemConfigService,
  CfsSocDataModel,
  SocControl,
  ConfiguredProject,
  CfsConfig,
  CfsFeatureScope,
  CfsWorkspace,
  CfsProject,
  CfsPluginProperty
} from "cfs-types";
import { CfsMemoryAccessOverrideService } from "cfs-types";
import { CfsEtaWorkspaceGenerator } from "./components/eta/cfs-eta-workspace-generator.js";
import { CfsEtaProjectGenerator } from "./components/eta/cfs-eta-project-generator.js";
import { CfsEtaCodeGenerator } from "./components/eta/cfs-eta-code-generator.js";
import { PropertyProvider } from "./components/cfs-property-provider.js";
import { CfsJsonProjectConfig } from "./components/cfs-json-project-config.js";
import { CfsJsonSystemConfig } from "./components/cfs-json-system-config.js";

/**
 * Generic plugin class that implements services based on the features defined in CfsPluginInfo
 */
export class GenericPlugin
  implements
    Partial<
      CfsWorkspaceGenerationService &
        CfsProjectGenerationService &
        CfsCodeGenerationService &
        CfsPropertyProviderService &
        CfsSocControlsOverrideService &
        CfsMemoryAccessOverrideService &
        CfsProjectConfigService &
        CfsSystemConfigService
    >
{
  private workspaceGenerator?: CfsEtaWorkspaceGenerator;
  private projectGenerator?: CfsEtaProjectGenerator;
  private codeGenerator?: CfsEtaCodeGenerator;
  private propertyProvider?: PropertyProvider;
  private projectConfig?: CfsJsonProjectConfig;
  private systemConfig?: CfsJsonSystemConfig;

  constructor(protected cfsPluginInfo: CfsPluginInfo) {
    const pluginDir = path.dirname(cfsPluginInfo.pluginPath);
    const features = cfsPluginInfo.features as Partial<
      CfsPluginInfo["features"]
    >;
    this.propertyProvider = new PropertyProvider(cfsPluginInfo);

    // Initialize workspace generator if workspace feature is present
    if (features.workspace) {
      this.workspaceGenerator = new CfsEtaWorkspaceGenerator(
        pluginDir,
        features.workspace
      );
    }

    // Initialize project generator if project feature is present
    if (features.project) {
      this.projectGenerator = new CfsEtaProjectGenerator(
        pluginDir,
        features.project
      );
      // Project-related services are typically initialized together
      this.projectConfig = new CfsJsonProjectConfig(cfsPluginInfo);
      this.systemConfig = new CfsJsonSystemConfig(cfsPluginInfo);
    }

    // Initialize code generator if codegen feature is present
    if (features.codegen) {
      this.codeGenerator = new CfsEtaCodeGenerator(
        pluginDir,
        features.codegen
      );
    }
  }

  // Centralized service validation helper
  private _requireService<T>(
    service: T | undefined,
    serviceName: string
  ): T {
    if (!service) {
      throw new Error(
        `Plugin ${this.cfsPluginInfo.pluginId} does not support ${serviceName}`
      );
    }

    return service;
  }

  // Workspace Generation Service
  public async generateWorkspace(
    cfsWorkspace: CfsWorkspace
  ): Promise<void> {
    return this._requireService(
      this.workspaceGenerator,
      "workspace generation"
    ).generateWorkspace(cfsWorkspace);
  }

  // Project Generation Service
  public async generateProject(
    baseDir: string,
    context: CfsProject
  ): Promise<void> {
    return this._requireService(
      this.projectGenerator,
      "project generation"
    ).generateProject(baseDir, context);
  }

  // Code Generation Service
  public async generateCode(
    data: Record<string, unknown>,
    baseDir: string
  ): Promise<string[]> {
    return this._requireService(
      this.codeGenerator,
      "code generation"
    ).generateCode(data, baseDir);
  }

  // Property Provider Service
  public getProperties(
    scope: CfsFeatureScope,
    context?: Record<string, unknown>
  ): CfsPluginProperty[] {
    return this._requireService(
      this.propertyProvider,
      "property provider service"
    ).getProperties(scope, context);
  }

  // SoC Controls Override Service
  public overrideControls(
    scope: CfsFeatureScope,
    soc: CfsSocDataModel
  ): Record<string, SocControl[]> {
    return this._requireService(
      this.propertyProvider,
      "SoC controls override service"
    ).overrideControls(scope, soc);
  }

  // Memory Access Override Service
  public getMemoryAccessOverrides(
    partName: string,
    coreId: string
  ): Record<string, string[] | undefined> | undefined {
    return this._requireService(
      this.propertyProvider,
      "memory access override service"
    ).getMemoryAccessOverrides(partName, coreId);
  }

  // Project Config Service
  public async configureProject(
    soc: string,
    config: ConfiguredProject
  ): Promise<ConfiguredProject> {
    return this._requireService(
      this.projectConfig,
      "project configuration service"
    ).configureProject(soc, config);
  }

  // System Config Service
  public async configureSystem(
    config: CfsConfig
  ): Promise<CfsConfig> {
    return this._requireService(
      this.systemConfig,
      "system configuration service"
    ).configureSystem(config);
  }
}
