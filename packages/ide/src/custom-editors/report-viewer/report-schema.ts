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

const operatorInfoSchema = z
  .object({
    Name: z.string(),
    Cycles: z.number(),
    Energy: z.number(),
  })
  .passthrough();

const targetSchema = z
  .object({
    Soc: z.string(),
    Core: z.string(),
    Package: z.string().nullable(),
    Accelerator: z.string().nullable(),
  })
  .passthrough()
  .nullable();

const hardwareSchema = z
  .object({
    FlashSize: z.number(),
    RamSize: z.number(),
    CoreClock: z.number(),
    SupportedOps: z.array(z.unknown()),
    AccelOps: z.array(z.unknown()),
    SupportedDataTypes: z.array(z.unknown()),
    OperatorInfos: z.array(operatorInfoSchema),
    Target: targetSchema,
  })
  .passthrough();

const modelSummaryBaseSchema = z
  .object({
    model_name: z.string(),
    model_path: z.string(),
  })
  .passthrough();

const reportBaseSchema = z
  .object({
    info: z
      .object({
        type: z.enum(["compat", "profile"]),
        timestamp: z.string(),
        version: z.string(),
        hardware: hardwareSchema,
      })
      .passthrough(),
    model_summary: modelSummaryBaseSchema,
  })
  .passthrough();

const optimizationOpportunitySchema = z
  .object({
    layer_index: z.number(),
    op_type: z.string(),
    parameter_memory_kb: z.number(),
    macs: z.number(),
    kernel_info: z.string(),
    suggestion: z.string(),
  })
  .passthrough();

const profileReportSchema = reportBaseSchema
  .extend({
    model_summary: modelSummaryBaseSchema.extend({
      framework: z.string(),
      model_size_kb: z.number(),
      target_dtype: z.string(),
      layer_count: z.number(),
      total_parameters: z.number().nullable(),
    }),
    hardware_metrics: z
      .object({
        total_cycles: z.number(),
        estimated_latency_ms: z.number(),
        estimated_power_mw: z.number(),
        peak_memory_kb: z.number(),
        peak_memory_mb: z.number(),
        available_ram_kb: z.number(),
        accelerated_layers: z.number(),
        cpu_only_layers: z.number(),
      })
      .passthrough(),
    memory_analysis: z
      .object({
        model_peak_ram_kb: z.number(),
        available_ram_kb: z.number(),
        ram_utilization_percent: z.number(),
        ram_status: z.string(),
        memory_issues: z.array(z.string()),
        memory_recommendations: z.array(z.string()),
      })
      .passthrough(),
    layer_performance: z.array(
      z
        .object({
          layer_idx: z.number(),
          layer_name: z.string(),
          operator_type: z.string().nullable(),
          cycles: z.number(),
          latency_ms: z.number(),
          energy_uj: z.number(),
          power_mw: z.number(),
          is_accelerated: z.boolean(),
          macs: z.number(),
          memory_kb: z.number(),
        })
        .passthrough(),
    ),
    optimization_suggestions: z.array(z.string()),
    optimization_opportunities: z
      .object({
        total_parameter_memory_kb: z.number(),
        total_macs: z.number(),
        layerwise_opportunities: z.array(optimizationOpportunitySchema),
        macs_opportunities: z.array(optimizationOpportunitySchema),
      })
      .passthrough(),
    errors: z.array(
      z
        .object({
          message: z.string(),
          code: z.string().optional(),
          details: z.record(z.unknown()).optional(),
        })
        .passthrough(),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.info.type !== "profile") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expected info.type to be 'profile'",
        path: ["info", "type"],
      });
    }
  });

const compatibilitySeveritySchema = z.enum(["critical", "warning", "info"]);

const compatibilityReportSchema = reportBaseSchema
  .extend({
    memory_issues: z
      .array(
        z
          .object({
            severity: compatibilitySeveritySchema,
            type: z.string(),
            memory_type: z.string(),
            detailed_info: z.string(),
            recommendations: z.array(
              z
                .object({
                  method: z.string(),
                  reference: z.string().nullable(),
                })
                .passthrough(),
            ),
            optimization_opportunities: z.array(optimizationOpportunitySchema),
          })
          .passthrough(),
      )
      .optional()
      .nullable(),
    operator_issues: z
      .array(
        z
          .object({
            severity: compatibilitySeveritySchema,
            type: z.string(),
            operator: z.string(),
            layers: z.array(z.number()),
            suggested_alternative: z.string(),
          })
          .passthrough(),
      )
      .optional()
      .nullable(),
    unsupported_types: z
      .array(
        z
          .object({
            severity: compatibilitySeveritySchema,
            layers: z.array(z.number()),
            operation_type: z.string(),
            data_type: z.string(),
          })
          .passthrough(),
      )
      .optional()
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.info.type !== "compat") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expected info.type to be 'compat'",
        path: ["info", "type"],
      });
    }
  });

function formatValidationErrors(result: z.SafeParseError<unknown>) {
  return result.error.issues
    .slice(0, 8)
    .map((issue) => {
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

  const baseResult = reportBaseSchema.safeParse(parsed);
  if (!baseResult.success) {
    throw new Error(
      `Invalid report structure:\n${formatValidationErrors(baseResult)}`,
    );
  }

  const typedReport = baseResult.data;
  const schema =
    typedReport.info.type === "profile"
      ? profileReportSchema
      : compatibilityReportSchema;
  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Invalid ${typedReport.info.type} report structure:\n${formatValidationErrors(result)}`,
    );
  }

  return result.data as Report;
}
