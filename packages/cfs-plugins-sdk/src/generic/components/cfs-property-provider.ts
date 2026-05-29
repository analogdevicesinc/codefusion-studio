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

import { CfsFeatureScope } from "cfs-types";
import type {
  CfsSocDataModel,
  SocControl,
  CfsPluginProperty,
  CfsPluginInfo
} from "cfs-types";
import { CfsSocControlsOverride } from "./cfs-soc-controls-override.js";
import { evalNestedTemplateLiterals } from "../utilities/cfs-utilities.js";
import { CfsMemoryAccessOverrides } from "./cfs-memory-access-override.js";

export class PropertyProvider {
  protected cfsPluginInfo: CfsPluginInfo;
  private socControlsOverride: CfsSocControlsOverride;
  private socMemoryAccessOverrides: CfsMemoryAccessOverrides;

  constructor(cfsPluginInfo: CfsPluginInfo) {
    this.cfsPluginInfo = cfsPluginInfo;
    this.socControlsOverride = new CfsSocControlsOverride(
      cfsPluginInfo
    );
    this.socMemoryAccessOverrides = new CfsMemoryAccessOverrides(
      cfsPluginInfo
    );
  }

  getProperties(
    scope: CfsFeatureScope,
    context?: Record<string, unknown>
  ): CfsPluginProperty[] {
    const targetProperties = this.cfsPluginInfo.properties?.[scope];

    if (targetProperties === undefined) {
      return [];
    }

    // Conditionally remove properties that should not be included for the current context
    const filteredProperties = targetProperties.filter(
      (pluginProp) => {
        if (typeof pluginProp.condition === "undefined") {
          return true;
        }

        return (
          evalNestedTemplateLiterals(
            pluginProp.condition,
            context ?? {}
          ) === "true"
        );
      }
    );

    if (context === undefined) {
      return filteredProperties;
    }

    // Parse default values if present
    const propertiesWithParsedDefaults = filteredProperties.map(
      (pluginProperties) => {
        if (
          typeof pluginProperties.default === "string" &&
          pluginProperties.default
        ) {
          const parsedDefault = evalNestedTemplateLiterals(
            pluginProperties.default,
            context
          );

          return {
            ...pluginProperties,
            default:
              parsedDefault === "undefined" ? "" : parsedDefault
          };
        }

        return pluginProperties;
      }
    );

    return propertiesWithParsedDefaults;
  }

  overrideControls(
    scope: CfsFeatureScope,
    soc: CfsSocDataModel
  ): Record<string, SocControl[]> {
    return this.socControlsOverride.overrideControls(scope, soc);
  }

  getMemoryAccessOverrides(
    partName: string,
    coreId: string
  ): Record<string, string[] | undefined> | undefined {
    return this.socMemoryAccessOverrides.getMemoryAccessOverrides(
      partName,
      coreId
    );
  }
}
