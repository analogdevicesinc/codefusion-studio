import type {
  CfsAiProfilingLayerPerformance,
  CfsAiRuntimeLayerPerformance,
} from "cfs-types";

type ColumnIndexes =
  | keyof CfsAiProfilingLayerPerformance
  | keyof CfsAiRuntimeLayerPerformance;

export const LAYER_PERFORMANCE_COLUMN_ALIASES: Record<ColumnIndexes, string> = {
  layer_idx: "ID",
  layer_name: "name",
  operator_type: "operator",
  cycles: "cycles",
  latency_ms: "latency",
  energy_uj: "energy",
  power_mw: "power_mw",
  is_accelerated: "is_accelerated",
  macs: "MACs",
  memory_kb: "memory",
  subgraph_idx: "subgraph",
  invocations: "invocations",
  avg_latency_ms: "avg_latency",
  min_latency_ms: "min_latency",
  max_latency_ms: "max_latency",
  total_latency_ms: "total_latency",
  latency_percent: "latency_percent",
  arena_used_bytes: "used_bytes",
};

export const LAYER_PERFORMANCE_ALIASES_TO_REAL: Record<string, ColumnIndexes> =
  Object.entries(LAYER_PERFORMANCE_COLUMN_ALIASES).reduce(
    (acc, [realName, alias]) => {
      acc[alias.toLowerCase()] = realName as ColumnIndexes;
      return acc;
    },
    {} as Record<string, ColumnIndexes>,
  );

export function getColumnAlias(columnName: ColumnIndexes): string {
  return LAYER_PERFORMANCE_COLUMN_ALIASES[columnName] ?? columnName;
}

export function getRealColumnName(alias: string): ColumnIndexes | null {
  return LAYER_PERFORMANCE_ALIASES_TO_REAL[alias.toLowerCase()] ?? null;
}
