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
import { CfsFeature, CfsProject, CfsWorkspace, CfsConfig } from "cfs-plugins-api";
import { CfsPluginServiceType } from "../services/cfs-plugin-services.js";
import { CfsPluginServiceProvider } from "../services/cfs-plugin-service-provider.js";
export declare abstract class CfsGenerator implements CfsPluginServiceProvider {
    protected pluginPath: string;
    protected cfsFeature: CfsFeature;
    protected context: CfsWorkspace | CfsProject | CfsConfig;
    /**
     * Constructor
     * @param pluginPath - The path to the plugin.
     * @param cfsFeature - The feature information required for code generation.
     * @param context - The workspace information required for code generation.
     */
    constructor(pluginPath: string, cfsFeature: CfsFeature, context: CfsWorkspace | CfsProject | CfsConfig);
    /**
     * Gets the service (ex: CfsCopyFilesService, EtaTemplateService)
     * @param service - The name of the service to retrieve (ex: "copyFiles", "template")
     * @returns An instance of the requested service type.
     */
    abstract getService<T>(service: CfsPluginServiceType): T;
}
