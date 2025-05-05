'use strict';

var fs = require('fs/promises');
var path = require('path');
var glob = require('glob');

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

var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs);
var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);

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

exports.CfsFsCopyFilesService = CfsFsCopyFilesService;
//# sourceMappingURL=cfs-fs-copy-files-service.cjs.map
