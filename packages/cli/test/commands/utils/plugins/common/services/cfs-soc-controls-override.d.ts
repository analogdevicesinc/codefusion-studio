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
import { CfsFeatureScope, CfsPluginInfo, CfsPluginProperty, CfsSocDataModel, SocControl } from "cfs-plugins-api";
import { CfsSocControlsOverrideService } from "./cfs-plugin-services.js";
/**
 * Service for handling property control directives in CFS plugins
 */
export declare class CfsSocControlsOverride implements CfsSocControlsOverrideService {
    protected cfsPluginInfo: CfsPluginInfo;
    /**
     * Constructor
     * @param cfsPluginInfo - The plugin information containing property directives
     */
    constructor(cfsPluginInfo: CfsPluginInfo);
    /**
     * Get properties for a specific scope with control directives applied
     * @param scope - The scope of properties to retrieve (Peripheral, PinConfig, etc.)
     * @param soc - Optional SoC data model containing control definitions
     * @returns The properties with control directives applied
     */
    overrideControls(scope: CfsFeatureScope, soc?: CfsSocDataModel): Record<string, SocControl[]> | CfsPluginProperty[];
}
