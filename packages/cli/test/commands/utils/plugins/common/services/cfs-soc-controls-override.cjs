'use strict';

/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
var CfsFeatureScope;
(function (CfsFeatureScope) {
    /**
     * Feature scope relating to workspace generation
     */
    CfsFeatureScope["Workspace"] = "workspace";
    /**
     * Feature scope relating to project generation
     */
    CfsFeatureScope["Project"] = "project";
    /**
     * Feature scope relating to code generation
     */
    CfsFeatureScope["CodeGen"] = "codegen";
    /**
     * Feature scope relating to memory allocation
     */
    CfsFeatureScope["Memory"] = "memory";
    /**
     * Feature scope relating to peripheral configuration
     */
    CfsFeatureScope["Peripheral"] = "peripheral";
    /**
     * Feature scope relating to Pin configuration
     */
    CfsFeatureScope["PinConfig"] = "pinConfig";
    /**
     * Feature scope relating to clock configuration
     */
    CfsFeatureScope["ClockConfig"] = "clockConfig";
})(CfsFeatureScope = CfsFeatureScope || (CfsFeatureScope = {}));

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
/**
 * Service for handling property control directives in CFS plugins
 */
class CfsSocControlsOverride {
    cfsPluginInfo;
    /**
     * Constructor
     * @param cfsPluginInfo - The plugin information containing property directives
     */
    constructor(cfsPluginInfo) {
        this.cfsPluginInfo = cfsPluginInfo;
    }
    /**
     * Get properties for a specific scope with control directives applied
     * @param scope - The scope of properties to retrieve (Peripheral, PinConfig, etc.)
     * @param soc - Optional SoC data model containing control definitions
     * @returns The properties with control directives applied
     */
    overrideControls(scope, soc) {
        // When no soc is provided, we can assume that the user is not interested in
        // overriding SoC controls, so we can return the regular properties (if found)
        if (soc === undefined) {
            return (this.cfsPluginInfo.properties?.[scope] ?? []);
        }
        const controls = JSON.parse(JSON.stringify(soc.Controls));
        if (scope === CfsFeatureScope.Peripheral) {
            delete controls.ClockConfig;
            delete controls.PinConfig;
            const directives = this.cfsPluginInfo.properties?.[scope];
            const result = Object.entries(controls).reduce((acc, [targetName, targetControls]) => {
                const directive = directives[targetName];
                if (Object.keys(directive ?? {}).length > 0) {
                    const { supportedControls, addedControls, removedControls, modifiedControls, defaultOverrides, } = directive;
                    let modifiedPeripheralControls = [...targetControls];
                    // Apply supported or removed controls
                    if (supportedControls) {
                        modifiedPeripheralControls = modifiedPeripheralControls.filter((control) => supportedControls.find((supportedControl) => control.Id === supportedControl.Id));
                    }
                    else if (removedControls) {
                        removedControls.forEach((removedControl) => {
                            modifiedPeripheralControls = modifiedPeripheralControls.filter((control) => control.Id !== removedControl.Id);
                        });
                    }
                    // Add controls
                    if (addedControls) {
                        addedControls.forEach((addedControl) => {
                            modifiedPeripheralControls.push({
                                ...addedControl,
                                PluginOption: true,
                            });
                        });
                    }
                    // Modify controls
                    if (modifiedControls) {
                        modifiedControls.forEach((modifiedControl) => {
                            const controlIndex = modifiedPeripheralControls.findIndex((control) => control.Id === modifiedControl.Id);
                            if (controlIndex !== -1) {
                                modifiedPeripheralControls[controlIndex] = {
                                    ...modifiedPeripheralControls[controlIndex],
                                    ...modifiedControl,
                                };
                            }
                        });
                    }
                    // Apply default overrides
                    if (defaultOverrides && soc) {
                        defaultOverrides.forEach((defaultOverride) => {
                            if (typeof defaultOverride.partRegexp === "string") {
                                const regexp = new RegExp(defaultOverride.partRegexp);
                                if (!regexp.test(soc.Name)) {
                                    return;
                                }
                            }
                            const controlIndex = modifiedPeripheralControls.findIndex((control) => control.Id === defaultOverride.Id);
                            if (controlIndex !== -1) {
                                modifiedPeripheralControls[controlIndex] = {
                                    ...modifiedPeripheralControls[controlIndex],
                                    Default: defaultOverride.Value,
                                };
                            }
                        });
                    }
                    acc[targetName] = modifiedPeripheralControls;
                }
                else {
                    acc[targetName] = targetControls;
                }
                return acc;
            }, {});
            return result;
        }
        // Handle Memory scope
        if (scope === CfsFeatureScope.Memory) {
            const directives = this.cfsPluginInfo.properties?.[scope];
            const memoryControls = [];
            if (directives && directives.addedControls) {
                directives.addedControls.forEach((control) => {
                    memoryControls.push({
                        ...control,
                        PluginOption: true,
                    });
                });
            }
            return { [scope]: memoryControls };
        }
        // Handle PinConfig scope
        if (scope === CfsFeatureScope.PinConfig) {
            const formattedScope = scope.charAt(0).toUpperCase() + scope.slice(1);
            const directives = this.cfsPluginInfo.properties?.[scope];
            const { supportedControls, addedControls, removedControls, modifiedControls, } = directives ?? {};
            let targetControls = [...controls[formattedScope]];
            // Apply supported or removed controls
            if (supportedControls) {
                targetControls = targetControls.filter((control) => supportedControls.find((supportedControl) => control.Id === supportedControl.Id));
            }
            else if (removedControls) {
                removedControls.forEach((removedControl) => {
                    targetControls = targetControls.filter((control) => control.Id !== removedControl.Id);
                });
            }
            // Add controls
            if (addedControls) {
                addedControls.forEach((addedControl) => {
                    targetControls.push({
                        ...addedControl,
                        PluginOption: true,
                    });
                });
            }
            // Modify controls
            if (modifiedControls) {
                modifiedControls.forEach((modifiedControl) => {
                    const controlIndex = targetControls.findIndex((control) => control.Id === modifiedControl.Id);
                    if (controlIndex !== -1) {
                        targetControls[controlIndex] = {
                            ...targetControls[controlIndex],
                            ...modifiedControl,
                        };
                    }
                });
            }
            return { [formattedScope]: targetControls };
        }
        if (scope === CfsFeatureScope.ClockConfig) {
            const result = {};
            const formattedScope = scope.charAt(0).toUpperCase() + scope.slice(1);
            const directives = this.cfsPluginInfo.properties?.[scope];
            // Process each clock node
            for (const clockNode of soc.ClockNodes) {
                const nodeName = clockNode.Name;
                const directive = directives[nodeName];
                // Skip nodes that don't have a ConfigUIOrder property
                if (clockNode.ConfigUIOrder === undefined) {
                    continue;
                }
                let nodeControls = [];
                if (controls[formattedScope] && clockNode.ConfigUIOrder) {
                    // Build nodeControls in the order defined by ConfigUIOrder
                    for (const controlId of clockNode.ConfigUIOrder) {
                        const control = controls[formattedScope].find((c) => c.Id === controlId);
                        if (control) {
                            nodeControls.push({ ...control });
                        }
                    }
                }
                // Apply directive modifications if present
                if (directive && Object.keys(directive).length > 0) {
                    const { supportedControls, addedControls, removedControls, modifiedControls, defaultOverrides, } = directive;
                    // Apply supported or removed controls
                    if (supportedControls) {
                        nodeControls = nodeControls.filter((control) => supportedControls.find((supportedControl) => control.Id === supportedControl.Id));
                    }
                    else if (removedControls) {
                        removedControls.forEach((removedControl) => {
                            nodeControls = nodeControls.filter((control) => control.Id !== removedControl.Id);
                        });
                    }
                    // Add controls
                    if (addedControls) {
                        addedControls.forEach((addedControl) => {
                            nodeControls.push({
                                ...addedControl,
                                PluginOption: true,
                                ClockNode: nodeName,
                            });
                        });
                    }
                    // Modify controls
                    if (modifiedControls) {
                        modifiedControls.forEach((modifiedControl) => {
                            const controlIndex = nodeControls.findIndex((control) => control.Id === modifiedControl.Id);
                            if (controlIndex !== -1) {
                                nodeControls[controlIndex] = {
                                    ...nodeControls[controlIndex],
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
                            const controlIndex = nodeControls.findIndex((control) => control.Id === defaultOverride.Id);
                            if (controlIndex !== -1) {
                                nodeControls[controlIndex] = {
                                    ...nodeControls[controlIndex],
                                    Default: defaultOverride.Value,
                                };
                            }
                        });
                    }
                }
                if (nodeControls.length > 0) {
                    result[nodeName] = nodeControls;
                }
            }
            return result;
        }
        return [];
    }
}

exports.CfsSocControlsOverride = CfsSocControlsOverride;
//# sourceMappingURL=cfs-soc-controls-override.cjs.map
