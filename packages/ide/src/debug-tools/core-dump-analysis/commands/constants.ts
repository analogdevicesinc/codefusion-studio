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

// Command IDs
export const CORE_DUMP_TREE_VIEW_COMMAND_ID = "cfs.coreDumpTreeView";
export const CORE_DUMP_RETRIEVE_AND_ANALYZE_COMMAND_ID =
  "cfs.retrieveAndAnalyzeCoreDump";
export const CORE_DUMP_ANALYZE_COMMAND_ID = "cfs.analyzeExistingCoreDump";
export const CORE_DUMP_RETRIEVE_COMMAND_ID = "cfs.retrieveCoreDump";
export const CORE_DUMP_DOWNLOAD_REPORT_COMMAND_ID =
  "cfs.downloadCoreDumpReport";
export const CORE_DUMP_VIEW_VISIBLE_COMMAND_ID = "cfs.coreDumpViewsVisible";
export const CORE_DUMP_NODE_CLICK_COMMAND_ID = "cfs.coreDump.nodeClick";
export const CORE_DUMP_COPY_ADDRESS = "cfs.coreDumpCopyAddress";
export const CORE_DUMP_COPY_FILE_PATH = "cfs.coreDumpCopyFilePath";

// Config
export const CORE_DUMP_CONFIG = "cfs.coreDump";

// Constants
export const CORE_DUMP_RETRIEVE_TASK_NAME = "retrieve core dump (JLink)";

// Core dump config keys
export const CORE_DUMP_LOG_FILE_KEY = "coreDump.logFile";
export const CORE_DUMP_ADDRESS_KEY = "coreDump.address";
export const CORE_DUMP_SIZE_KEY = "coreDump.size";
export const CORE_DUMP_BIN_FILE_KEY = "coreDump.binFile";
export const CORE_DUMP_ELF_FILE_KEY = "coreDump.elfFile";
