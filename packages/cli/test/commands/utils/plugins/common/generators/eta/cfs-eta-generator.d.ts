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
import { CfsPluginServiceType } from "../../services/cfs-plugin-services.js";
import { CfsGenerator } from "../cfs-generator.js";
export declare class CfsEtaGenerator extends CfsGenerator {
    /**
     * Retrieves a service instance based on the provided service type.
     *
     * @template T - The type of the service to be returned.
     * @param {CfsPluginServiceType} service - The type of service to retrieve.
     * @returns {T} - An instance of the requested service type.
     * @throws {Error} - Throws an error if the requested service type is not supported.
     */
    getService<T>(service: CfsPluginServiceType): T | never;
}
