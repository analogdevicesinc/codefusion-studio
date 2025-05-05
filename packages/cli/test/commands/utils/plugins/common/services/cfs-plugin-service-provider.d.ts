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
import { CfsPluginServiceType } from "./cfs-plugin-services.js";
export interface CfsPluginServiceProvider {
    /**
     * Get a service instance of the requested type
     * @param service - The type of the service to retrieve
     * @returns - An instance of the requested service
     */
    getService<T>(service: CfsPluginServiceType): T;
}
