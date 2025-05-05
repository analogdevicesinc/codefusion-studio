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
import { CfsWorkspace, CfsWorkspaceGenerator } from "cfs-plugins-api";
import { CfsEtaGenerator } from "./cfs-eta-generator.js";
export declare class CfsEtaWorkspaceGenerator extends CfsEtaGenerator implements CfsWorkspaceGenerator {
    /**
     * Generates the workspace by copying files and rendering templates.
     * @param cfsWorkspace - The workspace information required for code generation.
     * @returns A promise that resolves when the workspace generation is complete.
     */
    generateWorkspace(cfsWorkspace: CfsWorkspace): Promise<void>;
}
