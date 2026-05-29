/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
"use strict";

var path = require("path");

var CfsFeatureScope;
(function (CfsFeatureScope) {
  CfsFeatureScope["Workspace"] = "workspace";
  CfsFeatureScope["Project"] = "project";
  CfsFeatureScope["CodeGen"] = "codegen";
  CfsFeatureScope["Memory"] = "memory";
  CfsFeatureScope["Peripheral"] = "peripheral";
  CfsFeatureScope["PinConfig"] = "pinConfig";
  CfsFeatureScope["ClockConfig"] = "clockConfig";
  CfsFeatureScope["DFG"] = "dfg";
})(CfsFeatureScope || (CfsFeatureScope = {}));

function evalNestedTemplateLiterals(template, context) {
  return new Function("context", `return \`${template}\`;`)(context);
}

function updateControlsFromPlugin(soc, currentControls, directive) {
  const {
    supportedControls,
    addedControls,
    removedControls,
    modifiedControls,
    defaultOverrides,
  } = directive;

  if (supportedControls) {
    currentControls = currentControls.filter((control) =>
      supportedControls.find((supportedControl) => {
        if (typeof supportedControl.partRegexp === "string") {
          const regexp = new RegExp(supportedControl.partRegexp);
          if (!regexp.test(soc.Name)) {
            return false;
          }
        }

        return control.Id === supportedControl.Id;
      }),
    );
  } else if (removedControls) {
    removedControls.forEach((removedControl) => {
      currentControls = currentControls.filter((control) => {
        if (typeof removedControl.partRegexp === "string") {
          const regexp = new RegExp(removedControl.partRegexp);
          if (!regexp.test(soc.Name)) {
            return true;
          }
        }

        return control.Id !== removedControl.Id;
      });
    });
  }

  if (addedControls) {
    addedControls.forEach((addedControl) => {
      if (typeof addedControl.partRegexp === "string") {
        const regexp = new RegExp(addedControl.partRegexp);
        if (!regexp.test(soc.Name)) {
          return;
        }
      }

      currentControls.push({
        ...addedControl,
        PluginOption: true,
      });
    });
  }

  if (modifiedControls) {
    modifiedControls.forEach((modifiedControl) => {
      const controlIndex = currentControls.findIndex((control) => {
        if (typeof modifiedControl.partRegexp === "string") {
          const regexp = new RegExp(modifiedControl.partRegexp);
          if (!regexp.test(soc.Name)) {
            return false;
          }
        }

        return control.Id === modifiedControl.Id;
      });

      if (controlIndex !== -1) {
        currentControls[controlIndex] = {
          ...currentControls[controlIndex],
          ...modifiedControl,
        };
      }
    });
  }

  if (defaultOverrides && soc) {
    defaultOverrides.forEach((defaultOverride) => {
      if (typeof defaultOverride.partRegexp === "string") {
        const regexp = new RegExp(defaultOverride.partRegexp);
        if (!regexp.test(soc.Name)) {
          return;
        }
      }

      const controlIndex = currentControls.findIndex(
        (control) => control.Id === defaultOverride.Id,
      );

      if (controlIndex !== -1) {
        currentControls[controlIndex] = {
          ...currentControls[controlIndex],
          Default: defaultOverride.Value,
        };
      }
    });
  }

  return currentControls;
}

class CfsSocControlsOverride {
  constructor(cfsPluginInfo) {
    this.cfsPluginInfo = cfsPluginInfo;
  }

  overrideControls(scope, soc) {
    const controls = JSON.parse(JSON.stringify(soc.Controls));

    if (scope === CfsFeatureScope.Peripheral) {
      delete controls.ClockConfig;
      delete controls.PinConfig;
      const directives = this.cfsPluginInfo.properties?.[scope];

      const result = Object.entries(controls).reduce(
        (acc, [targetName, targetControls]) => {
          if (directives && !targetName.match(" DFG(Stream|Gasket)Config")) {
            const directiveKey = Object.keys(directives).find((k) =>
              targetName.match("^" + k + "$"),
            );

            if (directiveKey) {
              acc[targetName] = updateControlsFromPlugin(
                soc,
                [...targetControls],
                directives[directiveKey],
              );
            } else {
              acc[targetName] = targetControls;
            }
          }

          return acc;
        },
        {},
      );

      return result;
    }

    if (scope === CfsFeatureScope.DFG) {
      delete controls.ClockConfig;
      delete controls.PinConfig;
      const directives = this.cfsPluginInfo.properties?.[scope];

      const result = Object.entries(controls).reduce(
        (acc, [targetName, targetControls]) => {
          if (targetName.match(" DFG(Stream|Gasket)Config")) {
            const directiveKey = directives
              ? Object.keys(directives).find((k) =>
                  targetName.match("^" + k + "$"),
                )
              : undefined;

            if (directives && directiveKey) {
              acc[targetName] = updateControlsFromPlugin(
                soc,
                [...targetControls],
                directives[directiveKey],
              );
            } else {
              acc[targetName] = targetControls;
            }
          }

          return acc;
        },
        {},
      );

      return result;
    }

    if (scope === CfsFeatureScope.Memory) {
      const directives = this.cfsPluginInfo.properties?.[scope];
      const memoryControls = [];

      if (directives?.addedControls) {
        directives.addedControls.forEach((control) => {
          memoryControls.push({
            ...control,
            PluginOption: true,
          });
        });
      }

      return { [scope]: memoryControls };
    }

    if (scope === CfsFeatureScope.PinConfig) {
      const formattedScope = scope.charAt(0).toUpperCase() + scope.slice(1);
      const directives = this.cfsPluginInfo.properties?.[scope];
      const targetControls = updateControlsFromPlugin(
        soc,
        [...controls[formattedScope]],
        directives ?? {},
      );

      return { [formattedScope]: targetControls };
    }

    if (scope === CfsFeatureScope.ClockConfig) {
      const result = {};
      const formattedScope = scope.charAt(0).toUpperCase() + scope.slice(1);
      const directives = this.cfsPluginInfo.properties?.[scope];

      for (const clockNode of soc.ClockNodes) {
        const nodeName = clockNode.Name;
        const directiveKey = directives
          ? Object.keys(directives).find((k) => nodeName.match("^" + k + "$"))
          : undefined;

        if (clockNode.ConfigUIOrder === undefined) {
          continue;
        }

        let nodeControls = [];

        if (controls[formattedScope]) {
          for (const controlId of clockNode.ConfigUIOrder) {
            const control = controls[formattedScope].find(
              (c) => c.Id === controlId,
            );
            if (control) {
              nodeControls.push({ ...control });
            }
          }
        }

        if (directives && directiveKey) {
          nodeControls = updateControlsFromPlugin(
            soc,
            nodeControls,
            directives[directiveKey],
          );
        }

        if (nodeControls.length > 0) {
          result[nodeName] = nodeControls;
        }
      }

      return result;
    }

    return {};
  }
}

class CfsMemoryAccessOverrides {
  constructor(cfsPluginInfo) {
    this.cfsPluginInfo = cfsPluginInfo;
  }

  getMemoryAccessOverrides(_partName, _coreId) {
    return undefined;
  }
}

class BasePropertyProvider {
  constructor(cfsPluginInfo) {
    this.cfsPluginInfo = cfsPluginInfo;
    this.socControlsOverride = new CfsSocControlsOverride(cfsPluginInfo);
    this.socMemoryAccessOverrides = new CfsMemoryAccessOverrides(cfsPluginInfo);
  }

  getProperties(scope, context) {
    const targetProperties = this.cfsPluginInfo.properties?.[scope];

    if (targetProperties === undefined) {
      return [];
    }

    const filteredProperties = targetProperties.filter((pluginProp) => {
      if (typeof pluginProp.condition === "undefined") {
        return true;
      }

      return (
        evalNestedTemplateLiterals(pluginProp.condition, context ?? {}) ===
        "true"
      );
    });

    if (context === undefined) {
      return filteredProperties;
    }

    return filteredProperties.map((pluginProperties) => {
      if (
        typeof pluginProperties.default === "string" &&
        pluginProperties.default
      ) {
        const parsedDefault = evalNestedTemplateLiterals(
          pluginProperties.default,
          context,
        );

        return {
          ...pluginProperties,
          default: parsedDefault === "undefined" ? "" : parsedDefault,
        };
      }

      return pluginProperties;
    });
  }

  overrideControls(scope, soc) {
    return this.socControlsOverride.overrideControls(scope, soc);
  }

  getMemoryAccessOverrides(partName, coreId) {
    return this.socMemoryAccessOverrides.getMemoryAccessOverrides(
      partName,
      coreId,
    );
  }
}

function getGeneratedCodePaths(cfsPluginInfo, data, baseDir) {
  const projectId = data?.projectId;
  const projects = data?.cfsconfig?.Projects;

  if (!projectId || !Array.isArray(projects)) {
    throw new Error(
      "Code generation requires cfsconfig.Projects and projectId.",
    );
  }

  const projectConfig = projects.find((proj) => proj.ProjectId === projectId);

  if (!projectConfig) {
    throw new Error(`Project with ID ${projectId} not found in cfsconfig.`);
  }

  const projectName = projectConfig?.PlatformConfig?.ProjectName;

  if (typeof projectName !== "string" || !projectName.length) {
    throw new Error(
      `Project ${projectId} does not have PlatformConfig.ProjectName.`,
    );
  }

  const projectDir = path.join(baseDir, projectName).replace(/\\/g, "/");
  const codegenFeature = cfsPluginInfo?.features?.codegen ?? {};
  const files = Array.isArray(codegenFeature.files) ? codegenFeature.files : [];
  const templates = Array.isArray(codegenFeature.templates)
    ? codegenFeature.templates
    : [];
  const entries = [...files, ...templates];

  return entries.reduce((generatedFiles, entry) => {
    if (typeof entry?.dst !== "string") {
      return generatedFiles;
    }

    if (
      typeof entry.condition === "string" &&
      evalNestedTemplateLiterals(entry.condition, data) !== "true"
    ) {
      return generatedFiles;
    }

    const evaluatedDst = evalNestedTemplateLiterals(entry.dst, data);

    if (!evaluatedDst || evaluatedDst === "undefined") {
      return generatedFiles;
    }

    generatedFiles.push(
      path.join(projectDir, evaluatedDst).replace(/\\/g, "/"),
    );
    return generatedFiles;
  }, []);
}

module.exports = {
  CfsFeatureScope,
  evalNestedTemplateLiterals,
  BasePropertyProvider,
  getGeneratedCodePaths,
};
