'use strict';

var eta = require('eta');
var fs = require('fs');
var glob = require('glob');
var path = require('path');

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

exports.CfsEtaTemplateService = CfsEtaTemplateService;
//# sourceMappingURL=cfs-eta-template-service.cjs.map
