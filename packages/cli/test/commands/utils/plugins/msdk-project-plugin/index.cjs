'use strict';

var eta = require('eta');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var fs$1 = require('fs/promises');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);
var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs$1);

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
class CfsPlugin {
    cfsPluginInfo;
    context;
    /**
     * Constructor
     * @param cfsPluginInfo - The .cfsplugin file contents
     * @param context - The context for this plugin
     */
    constructor(cfsPluginInfo, context) {
        this.cfsPluginInfo = cfsPluginInfo;
        this.context = context;
    }
    /** Plugin Properties */
    /**
     * Get all properties supported by the plugin. These are shown in the UI and passed back to the plugin via "setProperty"
     * @param scope - The scope of the properties to retrieve, such as "workspace", "project", "code", or "memory".
     * @returns The properties supported by the plugin.
     */
    getProperties(scope) {
        if (!(scope in (this.cfsPluginInfo.properties ?? {}))) {
            console.error(`Plugin ${this.cfsPluginInfo.pluginName} does not support properties for scope ${scope}`);
            return [];
        }
        return this.cfsPluginInfo.properties?.[scope] ?? [];
    }
    /** Environment Variables */
    /**
     * Pass environment variables from CFS to the plugin. This will include the CFS PATH and ZEPHYR variables.
     * @param env - The environment variables to set in a Key-Value pair.
     */
    setEnvironmentVariables(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    env) {
        // do nothing by default
    }
    /** Logging */
    /**
     * Write an info message to the plugin logs
     */
    log(message) {
        // TODO: Write to a plugin log file
        console.log(message);
    }
    /**
     * Write a warning message to the plugin logs
     */
    warn(message) {
        // TODO: Write to a plugin log file
        console.warn(message);
    }
    /**
     * Write an error message to the plugin logs
     */
    error(message) {
        // TODO: Write to a plugin log file
        console.error(message);
    }
}

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
class CfsGenerator {
    pluginPath;
    cfsFeature;
    context;
    /**
     * Constructor
     * @param pluginPath - The path to the plugin.
     * @param cfsFeature - The feature information required for code generation.
     * @param context - The workspace information required for code generation.
     */
    constructor(pluginPath, cfsFeature, context) {
        this.pluginPath = pluginPath;
        this.cfsFeature = cfsFeature;
        this.context = context;
    }
}

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
 * Evaluates a template string with nested template literals
 * @param template - The template string to evaluate
 * @param context - The context to evaluate the template literal from
 * @returns a function to evaluate the template string
 */
function evalNestedTemplateLiterals(template, context) {
    return new Function("context", `return \`${template}\`;`)(context);
}

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
class CfsEtaTemplateService {
    pluginPath;
    context;
    /**
     * Constructor
     * @param pluginPath - The path to the plugin.
     * @param context - The context for rendering the templates.
     */
    constructor(pluginPath, context) {
        this.pluginPath = pluginPath;
        this.context = context;
    }
    async renderTemplates(templates, data, baseDir) {
        const pluginsAbsolutePath = path.resolve(this.pluginPath, "..");
        const filesCreated = [];
        for (const template of templates) {
            const eta$1 = new eta.Eta({
                views: pluginsAbsolutePath,
                // By default ETA uses XMLEscape, which maps special HTML characters
                // (&, <, >, ", ') to their XML-escaped equivalents. We do not want
                // that for code generation.
                escapeFunction: String,
            });
            // Read note in cfs-fs-copy-files-service.ts
            const location = (baseDir ?? data.path ?? "");
            try {
                let dstPath = evalNestedTemplateLiterals(template.dst, data);
                // Check if context is CfsWorkspace and make dst path relative to CfsWorkspace.location
                if (location) {
                    dstPath = path.join(location, dstPath).replace(/\\/g, "/");
                }
                else {
                    dstPath = template.dst;
                }
                const fullPath = path
                    .join(this.pluginPath, template.src)
                    .replace(/\\/g, "/");
                const files = await glob.glob(fullPath);
                for (const file of files) {
                    const fileName = path.basename(file.replace(".eta", ""));
                    const relativePath = path
                        .relative(pluginsAbsolutePath, file)
                        .replace(/\\/g, "/");
                    const rendered = eta$1.render(relativePath, {
                        ...data,
                        timestamp: new Date().toISOString(),
                    });
                    const isFile = path.extname(dstPath) !== "";
                    if (!isFile) {
                        await fs.promises.mkdir(dstPath, { recursive: true });
                        dstPath = path.join(dstPath, fileName);
                    }
                    else {
                        await fs.promises.mkdir(path.dirname(dstPath), { recursive: true });
                    }
                    await fs.promises.writeFile(dstPath, rendered);
                    filesCreated.push(dstPath);
                }
            }
            catch (error) {
                console.error("Eta context:", data);
                throw new Error(`Failed to render template from ${template.src} to ${template.dst}: ${error.message || error}`);
            }
        }
        return filesCreated;
    }
}

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
 * Copies the provided files to the specified destination.
 *
 * @param files - An array of CfsFileMap objects representing the files to be copied.
 * @returns A promise that resolves when the files have been copied.
 */
class CfsFsCopyFilesService {
    pluginPath;
    context;
    /**
     * Constructor
     * @param pluginPath - The path to the plugin.
     * @param context - The context containing workspace information.
     */
    constructor(pluginPath, context) {
        this.pluginPath = pluginPath;
        this.context = context;
    }
    async copyFiles(files, baseDir) {
        for (const file of files) {
            try {
                // Probably deriving this from the context is not the most reliable way to get the location
                // unless all configuration files share the same interface. the client of this service usually knows where files should go to.
                const location = (baseDir ?? this.context.path ?? "");
                const dstPath = evalNestedTemplateLiterals(path__namespace.join(location, file.dst).replace(/\\/g, "/"), this.context);
                const fullPath = path__namespace
                    .join(this.pluginPath, file.src)
                    .replace(/\\/g, "/");
                const filesToCopy = await glob.glob(fullPath);
                for (const fileToCopy of filesToCopy) {
                    const fileName = path__namespace.basename(fileToCopy);
                    const isFile = path__namespace.extname(dstPath) !== "";
                    if (isFile) {
                        await fs__namespace.mkdir(path__namespace.dirname(dstPath), { recursive: true });
                        await fs__namespace.copyFile(fileToCopy, dstPath);
                    }
                    else {
                        await fs__namespace.mkdir(dstPath, { recursive: true });
                        await fs__namespace.copyFile(fileToCopy, path__namespace.join(dstPath, fileName));
                    }
                }
            }
            catch (error) {
                throw new Error(`Failed to copy file from ${file.src} to ${file.dst}: ${error}`);
            }
        }
    }
}

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
var CfsPluginServiceType;
(function (CfsPluginServiceType) {
    CfsPluginServiceType["CopyFiles"] = "copyFiles";
    CfsPluginServiceType["Template"] = "template";
    CfsPluginServiceType["SocControlOverride"] = "socControlOverride";
})(CfsPluginServiceType || (CfsPluginServiceType = {}));

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
class CfsEtaGenerator extends CfsGenerator {
    /**
     * Retrieves a service instance based on the provided service type.
     *
     * @template T - The type of the service to be returned.
     * @param {CfsPluginServiceType} service - The type of service to retrieve.
     * @returns {T} - An instance of the requested service type.
     * @throws {Error} - Throws an error if the requested service type is not supported.
     */
    getService(service) {
        switch (service) {
            case CfsPluginServiceType.Template:
                return new CfsEtaTemplateService(this.pluginPath, this.context);
            case CfsPluginServiceType.CopyFiles:
                return new CfsFsCopyFilesService(this.pluginPath, this.context);
            default:
                throw new Error(`Service: ${service} is not supported yet.`);
        }
    }
}

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
class CfsEtaCodeGenerator extends CfsEtaGenerator {
    /**
     * Generates code by copying files and rendering templates.
     * @param data - The data needed for rendering eta templates.
     * @param baseDir - Directory location for the files generated.
     * @returns A promise that resolves when the code generation is complete.
     */
    async generateCode(data, baseDir) {
        const projectId = data.projectId;
        const projectConfig = data.cfsconfig.Projects.find((proj) => proj.ProjectId === projectId);
        if (!projectConfig) {
            throw new Error(`Project with ID ${projectId} not found in cfsconfig.`);
        }
        const projectDir = path
            .join(baseDir, projectConfig.PlatformConfig.ProjectName)
            .replace(/\\/g, "/");
        const copyFilesService = this.getService(CfsPluginServiceType.CopyFiles);
        await copyFilesService.copyFiles(this.cfsFeature.files, projectDir);
        const templateService = this.getService(CfsPluginServiceType.Template);
        const filesCreated = await templateService.renderTemplates(this.cfsFeature.templates, data, projectDir);
        return filesCreated;
    }
}

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
class CfsEtaProjectGenerator extends CfsEtaGenerator {
    /**
     * Generates the project by copying files and rendering templates.
     * @param baseDir - Directory location for the files generated.
     * @returns A promise that resolves when the project generation is complete.
     */
    async generateProject(baseDir) {
        const copyFilesService = this.getService(CfsPluginServiceType.CopyFiles);
        await copyFilesService.copyFiles(this.cfsFeature.files, baseDir);
        const templateService = this.getService(CfsPluginServiceType.Template);
        await templateService.renderTemplates(this.cfsFeature.templates, this.context, baseDir);
    }
}

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
class MsdkProjectPlugin extends CfsPlugin {
    getService(service) {
        if (service === CfsPluginServiceType.SocControlOverride) {
            return new CfsSocControlsOverride(this.cfsPluginInfo);
        }
        throw new Error("Method not implemented.");
    }
    getEnvironmentVariables() {
        return [];
    }
    getGenerator(generator) {
        switch (generator) {
            case CfsFeatureScope.Project:
                return new CfsEtaProjectGenerator(path.dirname(this.cfsPluginInfo.pluginPath), this.cfsPluginInfo.features.project, this.context);
            case CfsFeatureScope.CodeGen: {
                return new CfsEtaCodeGenerator(path.dirname(this.cfsPluginInfo.pluginPath), this.cfsPluginInfo.features.codegen, this.context);
            }
            default:
                throw new Error(`Generator: ${generator} is not supported`);
        }
    }
    getProperties(scope, soc) {
        const propertyService = this.getService(CfsPluginServiceType.SocControlOverride);
        return propertyService.overrideControls(scope, soc);
    }
}

module.exports = MsdkProjectPlugin;
//# sourceMappingURL=index.cjs.map
