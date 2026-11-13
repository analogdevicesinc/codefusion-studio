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

import type {
  CfsAiCompatibilityReport,
  CfsAiCompatMemoryIssue,
  CfsAiCompatOperatorIssue,
  CfsAiCompatUnsupportedTypeIssue,
  CfsAiProfilingLayerPerformance,
  CfsAiProfilingReport,
  CfsAiRuntimeLayerPerformance,
  CfsAiRuntimeProfilingReport,
} from "cfs-types";

/** Any report the report viewer can display. */
export type Report =
  | CfsAiCompatibilityReport
  | CfsAiProfilingReport
  | CfsAiRuntimeProfilingReport;

/** Reports that contain per-layer performance data. */
export type LayerReport = CfsAiProfilingReport | CfsAiRuntimeProfilingReport;

// Compatibility

export type CompatibilityIssue =
  | CfsAiCompatMemoryIssue
  | CfsAiCompatOperatorIssue
  | CfsAiCompatUnsupportedTypeIssue;

export function isMemoryIssue(
  issue: CompatibilityIssue,
): issue is CfsAiCompatMemoryIssue {
  return "memory_type" in issue;
}

export function isOperatorIssue(
  issue: CompatibilityIssue,
): issue is CfsAiCompatOperatorIssue {
  return "operator" in issue;
}

export function isUnsupportedTypeIssue(
  issue: CompatibilityIssue,
): issue is CfsAiCompatUnsupportedTypeIssue {
  return "operation_type" in issue;
}

// Layer queries

export type FilterdLayerData = StaticFilterdLayerData | RuntimeFilterdLayerData;

export type StaticFilterdLayerData = {
  kind: "profile";
  columns: (keyof CfsAiProfilingLayerPerformance)[];
  rows: Partial<CfsAiProfilingLayerPerformance>[];
};

export type RuntimeFilterdLayerData = {
  kind: "runtime-profile";
  columns: (keyof CfsAiRuntimeLayerPerformance)[];
  rows: Partial<CfsAiRuntimeLayerPerformance>[];
};
