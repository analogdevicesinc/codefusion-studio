/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

export interface CfsPluginProperty {
  id: string;
  /** Property name */
  name: string;
  /** Property description (shown in UI) */
  description?: string;
  /** Property category used to group common properties (shown in UI) */
  category?: string;
  /** Default value */
  default?: string;
  /** Property type, e.g. "string" | "integer" | "float" | "boolean" | "array" */
  type: string;
  /** Valid options, presented as a drop down list */
  enum?: {
    label: string;
    value: string;
  }[];
  /** Required fields will be checked at runtime to ensure they are set */
  required?: boolean;
  /** If true, don't show to user */
  readonly?: boolean;
  placeholder?: string;
  condition?: string;
}
