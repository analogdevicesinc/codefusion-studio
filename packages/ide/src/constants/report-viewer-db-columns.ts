import { LayerPerformanceEntry } from "@ide-types/report-view-types";

export const LAYER_PERFORMANCE_COLUMN_ALIASES: Record<
  keyof LayerPerformanceEntry,
  string
> = {
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
};

export const LAYER_PERFORMANCE_ALIASES_TO_REAL: Record<
  string,
  keyof LayerPerformanceEntry
> = Object.entries(LAYER_PERFORMANCE_COLUMN_ALIASES).reduce(
  (acc, [realName, alias]) => {
    acc[alias.toLowerCase()] = realName as keyof LayerPerformanceEntry;
    return acc;
  },
  {} as Record<string, keyof LayerPerformanceEntry>,
);

export function getColumnAlias(
  columnName: keyof LayerPerformanceEntry,
): string {
  return LAYER_PERFORMANCE_COLUMN_ALIASES[columnName] ?? columnName;
}

export function getRealColumnName(
  alias: string,
): keyof LayerPerformanceEntry | null {
  return LAYER_PERFORMANCE_ALIASES_TO_REAL[alias.toLowerCase()] ?? null;
}
