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
 * AJV instance with formats added
 * Wraper around Ajv to avoid having to import and configure Ajv in multiple places, and to ensure consistent configuration across the extension
 */
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

export const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  useDefaults: true,
});
addFormats(ajv);
