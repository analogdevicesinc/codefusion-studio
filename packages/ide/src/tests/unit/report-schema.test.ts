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

import { describe, it } from "mocha";
import { expect } from "chai";
import type { z } from "zod";
import type {
  CfsAiCompatibilityReport,
  CfsAiProfilingReport,
  CfsAiRuntimeProfilingReport,
  ReportInfo,
} from "cfs-types";
import {
  compatibilityReportSchema,
  parseAndValidateReport,
  profileReportSchema,
  runtimeProfileReportSchema,
} from "../../custom-editors/report-viewer/report-schema";

/**
 * Drops the `[key: string]: unknown` index signatures that `.loose()` adds to
 * the inferred schema types, so only the declared keys are compared.
 */
type KnownKeys<T> = T extends readonly (infer U)[]
  ? KnownKeys<U>[]
  : T extends object
    ? {
        [
          K in keyof T as string extends K
            ? never
            : number extends K
              ? never
              : K
        ]: KnownKeys<T[K]>;
      }
    : T;

type SchemaShape<S extends z.ZodType> = KnownKeys<z.output<S>>;

/**
 * Compile-time drift check between the report schemas and the cfs-types
 * report types. Each direction is a separate function so that a mismatch
 * points at the offending property: the first catches the schema accepting
 * something the type does not allow, the second the schema rejecting
 * something the type allows. Nothing here runs; the check is that this file
 * compiles (`yarn ws:ide ide:compile-unit-tests`).
 */
export const schemaTypeChecks = [
  (
    schema: SchemaShape<typeof compatibilityReportSchema>,
  ): KnownKeys<CfsAiCompatibilityReport> => schema,
  (
    type: KnownKeys<CfsAiCompatibilityReport>,
  ): SchemaShape<typeof compatibilityReportSchema> => type,
  (
    schema: SchemaShape<typeof profileReportSchema>,
  ): KnownKeys<CfsAiProfilingReport> => schema,
  (
    type: KnownKeys<CfsAiProfilingReport>,
  ): SchemaShape<typeof profileReportSchema> => type,
  (
    schema: SchemaShape<typeof runtimeProfileReportSchema>,
  ): KnownKeys<CfsAiRuntimeProfilingReport> => schema,
  (
    type: KnownKeys<CfsAiRuntimeProfilingReport>,
  ): SchemaShape<typeof runtimeProfileReportSchema> => type,
];

const hardware: NonNullable<ReportInfo["hardware"]> = {
  FlashSize: 3072,
  RamSize: 1024,
  CoreClock: 120,
  SupportedOps: ["CONV_2D", "FULLY_CONNECTED"],
  AccelOps: ["CONV_2D"],
  SupportedDataTypes: ["INT8"],
  OperatorInfos: [{ Name: "MAC", Cycles: 2, Energy: 0.17 }],
  Target: {
    Soc: "MAX32690",
    Core: "CM4",
    Package: "CTBGA",
    Family: "Cortex-M",
    Accelerator: null,
  },
};

const info: ReportInfo = {
  timestamp: "2026-10-22T08:00:00",
  version: "2.2.0",
  hardware,
};

// Shaped like the compatibility analyzer output, including a memory issue
// with optimization opportunities.
const compatReport = {
  type: "compat",
  info,
  model_summary: {
    model_name: "model.tflite",
    model_path: "/models/model.tflite",
  },
  memory_issues: [
    {
      type: "model_storage_flash_overflow",
      memory_type: "flash",
      detailed_info: "Model requires 4096 KB of flash, 3072 KB available",
      severity: "critical",
      recommendations: [{ method: "INT8 Quantization", reference: null }],
      optimization_opportunities: [
        {
          layer_index: 3,
          operation_type: "FULLY_CONNECTED",
          current_flash_kb: 2048,
          potential_savings_kb: 1536,
          optimization_method: "quantization",
          priority: "high",
        },
      ],
    },
  ],
  operator_issues: [
    {
      type: "unsupported",
      operator: "CUSTOM_OP",
      layers: [5],
      suggested_alternative: "None",
      severity: "critical",
    },
  ],
  unsupported_types: null,
} satisfies CfsAiCompatibilityReport;

// Shaped like the resource profiler output for a model where analysis of one
// layer failed and the data type could not be determined.
const profileReport = {
  type: "profile",
  info,
  model_summary: {
    model_name: "model.tflite",
    model_path: "/models/model.tflite",
    framework: "TensorFlow Lite",
    model_size_kb: 120.5,
    target_dtype: null,
    layer_count: 2,
    total_parameters: null,
  },
  hardware_metrics: {
    total_cycles: 1000,
    estimated_latency_ms: 0.5,
    estimated_power_mw: null,
    peak_memory_kb: 64,
    peak_memory_mb: 0.0625,
    available_ram_kb: 1024,
    accelerated_layers: 1,
    cpu_only_layers: 1,
  },
  memory_analysis: {
    model_peak_ram_kb: 64,
    available_ram_kb: 1024,
    ram_utilization_percent: 6.25,
    ram_status: "OK",
    memory_issues: [],
    memory_recommendations: [],
  },
  layer_performance: [
    {
      layer_idx: 0,
      layer_name: "conv2d",
      operator_type: "CONV_2D",
      cycles: 1000,
      latency_ms: 0.5,
      energy_uj: 1.2,
      power_mw: 2.4,
      is_accelerated: true,
      macs: 5000,
      memory_kb: 32,
    },
    {
      layer_idx: 1,
      layer_name: null,
      operator_type: null,
      cycles: null,
      latency_ms: null,
      energy_uj: null,
      power_mw: null,
      is_accelerated: false,
      macs: null,
      memory_kb: null,
    },
  ],
  optimization_suggestions: [],
  optimization_opportunities: {
    total_parameter_memory_kb: 120.5,
    total_macs: 5000,
    layerwise_opportunities: [
      {
        layer_index: 0,
        op_type: "CONV_2D",
        parameter_memory_kb: 32,
        macs: 5000,
        kernel_info: "[[16, 3, 3, 1], [16]]",
        suggestion: null,
      },
    ],
    macs_opportunities: [],
  },
  errors: [
    {
      message: "Error analyzing layer 1: unsupported tensor",
      code: "LAYER_ANALYSIS_ERROR",
      details: { layer_index: 1 },
    },
  ],
} satisfies CfsAiProfilingReport;

// Shaped like the TEF converter output.
const runtimeReport = {
  type: "runtime-profile",
  info: {
    ...info,
    hardware,
    thread: { name: "main", stack_size: 4096 },
  },
  model_summary: {
    model_name: "model",
    model_path: "/models/model.tflite",
    framework: "TFLM",
    layer_count: 1,
  },
  inference_summary: {
    iterations: 2,
    total_latency_ms: 2,
    avg_latency_ms: 1,
    min_latency_ms: 0.9,
    max_latency_ms: 1.1,
    std_latency_ms: 0.1,
    throughput_ips: 1000,
  },
  hardware_metrics: {
    total_cycles: 120000,
    estimated_latency_ms: 1,
    peak_memory_kb: 8,
    peak_memory_mb: 0.0078125,
    available_ram_kb: 1024,
    accelerated_layers: 0,
    cpu_only_layers: 1,
  },
  memory_analysis: {
    model_peak_ram_kb: 8,
    available_ram_kb: 1024,
    ram_utilization_percent: 1,
    ram_status: "OK",
  },
  layer_performance: [
    {
      layer_idx: 0,
      layer_name: "CONV_2D_0_0",
      operator_type: "CONV_2D",
      cycles: 120000,
      is_accelerated: false,
      memory_kb: 8,
      subgraph_idx: 0,
      invocations: 2,
      avg_latency_ms: 1,
      min_latency_ms: 0.9,
      max_latency_ms: 1.1,
      total_latency_ms: 2,
      latency_percent: 100,
      arena_used_bytes: 8192,
    },
  ],
} satisfies CfsAiRuntimeProfilingReport;

function parse(report: unknown) {
  return parseAndValidateReport(JSON.stringify(report));
}

describe("report-schema", () => {
  it("accepts a compatibility report with memory optimization opportunities", () => {
    expect(parse(compatReport)).to.deep.equal(compatReport);
  });

  it("accepts a profiling report with null fields", () => {
    expect(parse(profileReport)).to.deep.equal(profileReport);
  });

  it("accepts a runtime profiling report", () => {
    expect(parse(runtimeReport)).to.deep.equal(runtimeReport);
  });

  it("accepts reports without hardware info", () => {
    const report = { ...compatReport, info: { ...info, hardware: null } };

    expect(parse(report)).to.deep.equal(report);
  });

  it("keeps keys that are not part of the schema", () => {
    const report = { ...profileReport, extra_field: { nested: true } };

    expect(parse(report)).to.deep.equal(report);
  });

  it("reads the legacy `info.type` location", () => {
    const { type, ...rest } = compatReport;
    const legacyReport = { ...rest, info: { ...info, type } };

    expect(parse(legacyReport).type).to.equal("compat");
  });

  it("rejects an unknown report type", () => {
    expect(() => parse({ ...compatReport, type: "unknown" })).to.throw(
      /Invalid report structure/,
    );
  });

  it("rejects a report with a missing required field", () => {
    const { inference_summary: _, ...report } = runtimeReport;

    expect(() => parse(report)).to.throw(
      /Invalid runtime-profile report structure:\ninference_summary/,
    );
  });

  it("rejects a compatibility report using the profiling opportunity shape", () => {
    const report = {
      ...compatReport,
      memory_issues: [
        {
          ...compatReport.memory_issues[0],
          optimization_opportunities: [
            profileReport.optimization_opportunities.layerwise_opportunities[0],
          ],
        },
      ],
    };

    expect(() => parse(report)).to.throw(/Invalid compat report structure/);
  });
});
