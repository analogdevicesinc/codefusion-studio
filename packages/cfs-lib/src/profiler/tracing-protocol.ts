/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
 * Marks the beginning of a CTF trace. Zephelin discards everything before
 * it, so a stream without one decodes to nothing.
 */
export const CTF_TRACE_START_TAG = Buffer.from("_zpl_ctf_start__");

/**
 * Command written to the data source to trigger the start of profiling
 * when the device is configured with TRACING_HANDLE_HOST_CMD.
 */
export const ENABLE_COMMAND = "enable";

/** Command that tells the device to stop streaming traces. */
export const DISABLE_COMMAND = "disable";
