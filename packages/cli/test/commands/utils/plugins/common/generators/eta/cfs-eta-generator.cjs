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

exports.CfsEtaGenerator = CfsEtaGenerator;
//# sourceMappingURL=cfs-eta-generator.cjs.map
