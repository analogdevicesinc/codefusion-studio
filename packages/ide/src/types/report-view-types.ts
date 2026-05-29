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

export type Report = {
  info: {
    type: "compat" | "profile";
    timestamp: string;
    version: string;
    hardware: {
      FlashSize: number;
      RamSize: number;
      CoreClock: number;
      SupportedOps: any[];
      AccelOps: any[];
      SupportedDataTypes: any[];
      OperatorInfos: [
        {
          Name: string;
          Cycles: number;
          Energy: number;
        },
      ];
      Target: {
        Soc: string;
        Core: string;
        Package: string | null;
        Accelerator: string | null;
      } | null;
    };
  };
  model_summary: ModelSummaryBase;
};

// Common

export type Severity = "critical" | "warning" | "info";

export type ModelSummaryBase = {
  model_name: string;
  model_path: string;
};

// Profiling

export type ProfilingModelSummary = ModelSummaryBase & {
  framework: string;
  model_size_kb: number;
  target_dtype: string;
  layer_count: number;
  total_parameters: number | null;
};

export type HardwareMetrics = {
  total_cycles: number;
  estimated_latency_ms: number;
  estimated_power_mw: number;
  peak_memory_kb: number;
  peak_memory_mb: number;
  available_ram_kb: number;
  accelerated_layers: number;
  cpu_only_layers: number;
};

export type MemoryAnalysis = {
  model_peak_ram_kb: number;
  available_ram_kb: number;
  ram_utilization_percent: number;
  ram_status: string;
  memory_issues: string[];
  memory_recommendations: string[];
};

export type LayerPerformanceEntry = {
  layer_idx: number;
  layer_name: string;
  operator_type: string | null;
  cycles: number;
  latency_ms: number;
  energy_uj: number;
  power_mw: number;
  is_accelerated: boolean;
  macs: number;
  memory_kb: number;
};

export type OptimizationOpportunityEntry = {
  layer_index: number;
  op_type: string;
  parameter_memory_kb: number;
  macs: number;
  kernel_info: string;
  suggestion: string;
};

export type OptimizationOpportunities = {
  total_parameter_memory_kb: number;
  total_macs: number;
  layerwise_opportunities: OptimizationOpportunityEntry[];
  macs_opportunities: OptimizationOpportunityEntry[];
};

export type ErrorNote = {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
};

export type AIModelProfileReport = Report & {
  info: Report["info"] & {
    type: "profile";
  };
  model_summary: ProfilingModelSummary;
  hardware_metrics: HardwareMetrics;
  memory_analysis: MemoryAnalysis;
  layer_performance: LayerPerformanceEntry[];
  optimization_suggestions: string[];
  optimization_opportunities: OptimizationOpportunities;
  errors: ErrorNote[];
};

// Compatibility

export type CompatibilityMemoryIssueRecommendation = {
  method: string;
  reference: string | null;
};

type IssueBase = {
  severity: Severity;
};

export type CompatibilityMemoryIssue = IssueBase & {
  type: string;
  memory_type: string;
  detailed_info: string;
  recommendations: CompatibilityMemoryIssueRecommendation[];
  optimization_opportunities: OptimizationOpportunityEntry[];
};

export type CompatibilityOperatorIssue = IssueBase & {
  type: string;
  operator: string;
  layers: number[];
  suggested_alternative: string;
};

export type CompatibilityUnsupportedTypeIssue = IssueBase & {
  layers: number[];
  operation_type: string;
  data_type: string;
};

export type CompatibilityIssue =
  | CompatibilityMemoryIssue
  | CompatibilityOperatorIssue
  | CompatibilityUnsupportedTypeIssue;

export type AIModelCompatReport = Report & {
  memory_issues?: CompatibilityMemoryIssue[];
  operator_issues?: CompatibilityOperatorIssue[];
  unsupported_types?: CompatibilityUnsupportedTypeIssue[];
};

export function isMemoryIssue(
  issue: CompatibilityIssue,
): issue is CompatibilityMemoryIssue {
  return "memory_type" in issue;
}

export function isOperatorIssue(
  issue: CompatibilityIssue,
): issue is CompatibilityOperatorIssue {
  return "operator" in issue;
}

export function isUnsupportedTypeIssue(
  issue: CompatibilityIssue,
): issue is CompatibilityUnsupportedTypeIssue {
  return "operation_type" in issue;
}

export type FilterdLayerData = {
  columns: (keyof LayerPerformanceEntry)[];
  rows: Partial<LayerPerformanceEntry>[];
};
