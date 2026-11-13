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

import alasql, { Database } from "alasql";
import type {
  CfsAiProfilingLayerPerformance,
  CfsAiRuntimeLayerPerformance,
} from "cfs-types";
import type {
  FilterdLayerData,
  LayerReport,
} from "../../types/report-view-types";
import { getRealColumnName } from "@constants/report-viewer-db-columns";

type AlasqlDatabase = InstanceType<typeof Database>;

const notAllowdSqlPhrases = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "CREATE",
  "ALTER",
  "TRUNCATE",
];

const profileCols: Record<string, string> = {
  layer_idx: "number",
  layer_name: "string",
  cycles: "number",
  latency_ms: "number",
  energy_uj: "number",
  macs: "number",
  memory_kb: "number",
};

const runtimeProfileCols: Record<string, string> = {
  layer_idx: "number",
  avg_latency_ms: "number",
  min_latency_ms: "number",
  max_latency_ms: "number",
  total_latency_ms: "number",
  latency_percent: "number",
  invocations: "number",
  memory_kb: "number",
  arena_used_bytes: "number",
  is_accelerated: "boolean",
};

const layerTableName = "layer_performance";

function replaceAliasesWithRealNames(query: string): string {
  const identifierPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

  const result = query.replace(identifierPattern, (match) => {
    const realName = getRealColumnName(match);
    return realName ?? match;
  });

  return result;
}

const runtimeExcludedCols = new Set<string>([
  "layer_name",
  "operator_type",
  "subgraph_idx",
  "cycles",
  "latency_ms",
  "macs",
]);

export function createLayerDataBase(report: LayerReport): AlasqlDatabase {
  try {
    const isRuntime = report.type === "runtime-profile";
    const cols = isRuntime ? runtimeProfileCols : profileCols;

    const db = new alasql.Database();
    db.exec(
      `CREATE TABLE ${layerTableName} (${Object.entries(cols)
        .map(([col, type]) => `${col} ${type}`)
        .join(",\n")})`,
    );

    const rows = isRuntime
      ? report.layer_performance.map((row) =>
          Object.fromEntries(
            Object.entries(row).filter(
              ([col]) => !runtimeExcludedCols.has(col),
            ),
          ),
        )
      : (report.layer_performance ?? []);

    db.exec(`SELECT * INTO ${layerTableName} FROM ?`, [rows]);
    return db;
  } catch (error) {
    throw new Error(`Failed to create layer data database: ${error}`);
  }
}

export function handleLayerDataQuery(
  query: string,
  db: AlasqlDatabase,
  isRuntime: boolean,
): FilterdLayerData {
  query = query.trim();
  if (!query) {
    throw new Error("Query is empty.");
  }

  if (query.includes(";")) {
    throw new Error("Multiple SQL statements are not allowed.");
  }

  if (query.toUpperCase().includes(" FROM ")) {
    throw new Error("Query should not contain FROM clause.");
  }

  if (
    notAllowdSqlPhrases.some((phrase) => query.toUpperCase().startsWith(phrase))
  ) {
    throw new Error("Query contains not allowed SQL phrases.");
  }

  const result = db.exec(insetFrom(replaceAliasesWithRealNames(query)));
  const data: Partial<CfsAiProfilingLayerPerformance>[] = Array.isArray(result)
    ? (result as Partial<CfsAiProfilingLayerPerformance>[])
    : [];

  if (isRuntime) {
    return {
      kind: "runtime-profile",
      columns: Object.keys(
        data[0] || {},
      ) as (keyof CfsAiRuntimeLayerPerformance)[],
      rows: data as Partial<CfsAiRuntimeLayerPerformance>[],
    };
  }

  return {
    kind: "profile",
    columns: Object.keys(
      data[0] || {},
    ) as (keyof CfsAiProfilingLayerPerformance)[],
    rows: data,
  };
}

function insetFrom(query: string): string {
  const clause = /\b(WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET)\b/i;
  const match = clause.exec(query);

  if (!match) {
    return `${query} FROM ${layerTableName}`;
  }

  const before = query.slice(0, match.index).trimEnd();
  const after = query.slice(match.index).trimStart();
  return `${before} FROM ${layerTableName} ${after}`;
}
