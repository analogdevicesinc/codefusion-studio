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
 * CoreDumpConfig defines the configuration required to retrieve a core dump.
 * - address: Start address in flash where the core dump is stored.
 * - size: Size (in bytes) of the core dump region to retrieve.
 * - binFile: Path to the bin file where the core dump will be saved and analyzed.
 */
export interface CoreDumpConfig {
  address: string;
  size: number;
  binFile: string;
  elfFile?: string;
  logFile?: string;
  projectFolder?: string;
  gdbPort?: string;
}

/**
 * CoreDumpInfo represents the result of parsing a core dump.
 * - summary: Short description of the analysis result.
 * - details: Additional details and metadata extracted from the core dump.
 */
export interface CoreDumpInfo {
  summary: string;
  details: Record<string, unknown>;
}

// Panel data interfaces for type safety
export interface CrashPanelData {
  summary: string;
  crashCause: any[];
}
export interface TasksPanelData {
  summary: string;
  tasks: any[];
}
export interface HeapPanelData {
  summary: string;
  heap: { total: number; used: number; max: number; message: string };
}
