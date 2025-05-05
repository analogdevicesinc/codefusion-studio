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
import { CfsPlugin, CfsFeatureScope, CfsPluginProperty, SocControl, CfsSocDataModel } from "cfs-plugins-api";
declare class MsdkProjectPlugin extends CfsPlugin {
    getService<T>(service: string): T;
    getEnvironmentVariables(): never[];
    getGenerator<T>(generator: CfsFeatureScope): T;
    getProperties(scope: CfsFeatureScope, soc?: CfsSocDataModel): Record<string, SocControl[]> | CfsPluginProperty[];
}
export default MsdkProjectPlugin;
