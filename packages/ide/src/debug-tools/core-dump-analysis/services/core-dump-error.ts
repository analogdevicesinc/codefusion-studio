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
 * Custom error class for core dump analysis errors.
 * Use this class to throw and identify errors specific to core dump operations.
 */
export class CoreDumpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoreDumpError";
  }
}
