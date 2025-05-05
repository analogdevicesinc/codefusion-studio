'use strict';

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

exports.CfsGenerator = CfsGenerator;
//# sourceMappingURL=cfs-generator.cjs.map
