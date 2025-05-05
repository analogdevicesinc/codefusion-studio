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
import { CfsFileMap } from "cfs-plugins-api";
import { CfsCopyFilesService } from "./cfs-plugin-services.js";
/**
 * Copies the provided files to the specified destination.
 *
 * @param files - An array of CfsFileMap objects representing the files to be copied.
 * @returns A promise that resolves when the files have been copied.
 */
export declare class CfsFsCopyFilesService implements CfsCopyFilesService {
    protected pluginPath: string;
    protected context: Record<string, unknown>;
    /**
     * Constructor
     * @param pluginPath - The path to the plugin.
     * @param context - The context containing workspace information.
     */
    constructor(pluginPath: string, context: Record<string, unknown>);
    copyFiles(files: CfsFileMap[], baseDir?: string): Promise<void>;
}
