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
import { z } from "zod";
import type { Report } from "../../types/report-view-types";

// Schemas mirror the report types in cfs-types. `report-schema.test.ts`
// checks that they stay in sync, so update both together.

const reportInfoSchema = z
  .object({
    timestamp: z.string(),
    version: z.string(),
    hardware: z
      .object({
        FlashSize: z.number(),
        RamSize: z.number(),
        CoreClock: z.number(),
        SupportedOps: z.array(z.string()),
        AccelOps: z.array(z.string()),
        SupportedDataTypes: z.array(z.string()),
        OperatorInfos: z.array(
          z
            .object({
              Name: z.string(),
              Cycles: z.number(),
              Energy: z.number(),
            })
            .loose(),
        ),
        Target: z
          .object({
            Soc: z.string(),
            Core: z.string(),
            Package: z.string().nullable().optional(),
            Family: z.string().optional(),
            Accelerator: z.string().nullable().optional(),
            Config: z
              .record(z.string(), z.union([z.string(), z.number()]))
              .optional(),
          })
          .loose()
          .nullable(),
      })
      .loose()
      .nullable(),
  })
  .loose();

// Compatibility

const compatSeveritySchema = z.enum(["critical", "warning"]);

export const compatibilityReportSchema = z
  .object({
    type: z.literal("compat"),
    info: reportInfoSchema.nullable(),
    model_summary: z
      .object({
        model_name: z.string().nullable(),
        model_path: z.string().nullable(),
        model_hash: z.string().optional(),
      })
      .loose()
      .nullable(),
    memory_issues: z
      .array(
        z
          .object({
            type: z.string(),
            memory_type: z.string(),
            detailed_info: z.string(),
            severity: compatSeveritySchema,
            recommendations: z.array(
              z
                .object({
                  method: z.string(),
                  reference: z.string().nullable(),
                })
                .loose(),
            ),
            optimization_opportunities: z.array(
              z
                .object({
                  layer_index: z.number(),
                  operation_type: z.string(),
                  current_flash_kb: z.number(),
                  potential_savings_kb: z.number(),
                  optimization_method: z.string(),
                  priority: z.string(),
                })
                .loose(),
            ),
          })
          .loose(),
      )
      .nullable(),
    operator_issues: z
      .array(
        z
          .object({
            type: z.string(),
            operator: z.string(),
            layers: z.array(z.number()),
            suggested_alternative: z.string().nullable(),
            severity: compatSeveritySchema,
          })
          .loose(),
      )
      .nullable(),
    unsupported_types: z
      .array(
        z
          .object({
            layers: z.array(z.number()),
            operation_type: z.string(),
            data_type: z.string(),
            severity: compatSeveritySchema,
          })
          .loose(),
      )
      .nullable(),
  })
  .loose();

// Profiling

const ramStatusSchema = z.enum(["CRITICAL", "WARNING", "OK"]);

const profilingOptimizationOpportunitySchema = z
  .object({
    layer_index: z.number(),
    op_type: z.string(),
    parameter_memory_kb: z.number(),
    macs: z.number().nullable(),
    kernel_info: z.string().nullable(),
    suggestion: z.string().nullable(),
  })
  .loose();

export const profileReportSchema = z
  .object({
    type: z.literal("profile"),
    info: reportInfoSchema.nullable(),
    model_summary: z
      .object({
        model_name: z.string().nullable(),
        model_path: z.string().nullable(),
        model_hash: z.string().optional(),
        framework: z.string().nullable(),
        model_size_kb: z.number().nullable(),
        target_dtype: z.string().nullable(),
        layer_count: z.number().nullable(),
        total_parameters: z.number().nullable(),
      })
      .loose()
      .nullable(),
    hardware_metrics: z
      .object({
        total_cycles: z.number().nullable(),
        estimated_latency_ms: z.number().nullable(),
        estimated_power_mw: z.number().nullable(),
        peak_memory_kb: z.number().nullable(),
        peak_memory_mb: z.number().nullable(),
        available_ram_kb: z.number().nullable(),
        accelerated_layers: z.number().nullable(),
        cpu_only_layers: z.number().nullable(),
      })
      .loose()
      .nullable(),
    memory_analysis: z
      .object({
        model_peak_ram_kb: z.number(),
        available_ram_kb: z.number().nullable(),
        ram_utilization_percent: z.number().nullable(),
        ram_status: ramStatusSchema,
        memory_issues: z.array(z.string()),
        memory_recommendations: z.array(z.string()),
      })
      .loose()
      .nullable(),
    layer_performance: z
      .array(
        z
          .object({
            layer_idx: z.number(),
            layer_name: z.string().nullable(),
            operator_type: z.string().nullable(),
            cycles: z.number().nullable(),
            latency_ms: z.number().nullable(),
            energy_uj: z.number().nullable(),
            power_mw: z.number().nullable(),
            is_accelerated: z.boolean(),
            macs: z.number().nullable(),
            memory_kb: z.number().nullable(),
          })
          .loose(),
      )
      .nullable(),
    optimization_suggestions: z
      .array(
        z
          .object({
            category: z.string(),
            description: z.string(),
            estimated_improvement: z.string().nullable(),
            complexity: z.string().nullable(),
            priority: z.string().nullable(),
          })
          .loose(),
      )
      .nullable(),
    optimization_opportunities: z
      .object({
        total_parameter_memory_kb: z.number(),
        total_macs: z.number(),
        layerwise_opportunities: z.array(
          profilingOptimizationOpportunitySchema,
        ),
        macs_opportunities: z.array(profilingOptimizationOpportunitySchema),
      })
      .loose()
      .nullable(),
    errors: z
      .array(
        z
          .object({
            message: z.string(),
            code: z.string().nullable(),
            details: z.record(z.string(), z.unknown()).nullable(),
          })
          .loose(),
      )
      .nullable(),
  })
  .loose();

// Runtime profiling

export const runtimeProfileReportSchema = z
  .object({
    type: z.literal("runtime-profile"),
    info: reportInfoSchema
      .extend({
        hardware: reportInfoSchema.shape.hardware.unwrap(),
        thread: z
          .object({
            name: z.string(),
            stack_base: z.number().optional(),
            stack_size: z.number().optional(),
          })
          .loose()
          .optional(),
      })
      .loose(),
    model_summary: z
      .object({
        model_name: z.string(),
        model_path: z.string(),
        model_hash: z.string().optional(),
        framework: z.string(),
        layer_count: z.number(),
      })
      .loose(),
    inference_summary: z
      .object({
        iterations: z.number(),
        total_latency_ms: z.number(),
        avg_latency_ms: z.number(),
        min_latency_ms: z.number(),
        max_latency_ms: z.number(),
        std_latency_ms: z.number(),
        throughput_ips: z.number(),
      })
      .loose(),
    hardware_metrics: z
      .object({
        total_cycles: z.number(),
        estimated_latency_ms: z.number(),
        peak_memory_kb: z.number(),
        peak_memory_mb: z.number(),
        available_ram_kb: z.number(),
        accelerated_layers: z.number(),
        cpu_only_layers: z.number(),
      })
      .loose(),
    memory_analysis: z
      .object({
        model_peak_ram_kb: z.number(),
        available_ram_kb: z.number(),
        ram_utilization_percent: z.number(),
        ram_status: ramStatusSchema,
      })
      .loose(),
    layer_performance: z.array(
      z
        .object({
          layer_idx: z.number(),
          layer_name: z.string(),
          operator_type: z.string(),
          cycles: z.number(),
          is_accelerated: z.boolean(),
          memory_kb: z.number(),
          subgraph_idx: z.number(),
          invocations: z.number(),
          avg_latency_ms: z.number(),
          min_latency_ms: z.number(),
          max_latency_ms: z.number(),
          total_latency_ms: z.number(),
          latency_percent: z.number(),
          arena_used_bytes: z.number(),
        })
        .loose(),
    ),
  })
  .loose();

const reportTypeSchema = z
  .object({
    type: z.enum(["compat", "profile", "runtime-profile"]),
  })
  .loose();

const reportSchemas = {
  compat: compatibilityReportSchema,
  profile: profileReportSchema,
  "runtime-profile": runtimeProfileReportSchema,
};

/**
 * Reports saved before the `type` discriminant moved to the report root
 * (it used to live at `info.type`) are still sitting on disk as .cfsreport
 * files. Hoist the legacy location to the root field so those older reports
 * keep opening instead of failing validation.
 */
function normalizeLegacyReportType(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null) {
    return parsed;
  }

  const report = parsed as Record<string, unknown>;
  if ("type" in report) {
    return report;
  }

  const info = report.info;
  if (typeof info !== "object" || info === null || !("type" in info)) {
    return report;
  }

  return { ...report, type: (info as Record<string, unknown>).type };
}

function formatValidationErrors(result: z.ZodSafeParseError<unknown>) {
  return result.error.issues
    .slice(0, 8)
    .map((issue: z.core.$ZodIssue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

export function parseAndValidateReport(text: string): Report {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON report format: ${String(error)}`);
  }

  parsed = normalizeLegacyReportType(parsed);

  const typeResult = reportTypeSchema.safeParse(parsed);
  if (!typeResult.success) {
    throw new Error(
      `Invalid report structure:\n${formatValidationErrors(typeResult)}`,
    );
  }

  const reportType = typeResult.data.type;
  const schema = reportSchemas[reportType];
  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Invalid ${reportType} report structure:\n${formatValidationErrors(
        result,
      )}`,
    );
  }

  return result.data;
}
