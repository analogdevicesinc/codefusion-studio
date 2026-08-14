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
 * Workaround to be able to use the old @use '#colors' as colors; imports within the newer Sass versions
 * Using this function as importer bypasses newer Sass resolution, falling back to package.json imports section
 */
export const forceLegacyImports = {
  canonicalize() {
    return null;
  },
  load() {
    return null; // let Sass load the file normally
  },
};
