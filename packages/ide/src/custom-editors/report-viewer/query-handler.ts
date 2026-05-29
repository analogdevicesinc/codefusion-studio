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
  FilterdLayerData,
  AIModelProfileReport,
  LayerPerformanceEntry,
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

const layerTableName = "layer_performance";

function replaceAliasesWithRealNames(query: string): string {
  const identifierPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

  const result = query.replace(identifierPattern, (match) => {
    const realName = getRealColumnName(match);
    return realName ?? match;
  });

  return result;
}

export function createLayerDataBase(
  report: AIModelProfileReport,
): AlasqlDatabase {
  try {
    const db = new alasql.Database();
    db.exec(
      `CREATE TABLE ${layerTableName} (
        layer_idx number,
        layer_name string,
        operator_type string,
        cycles number,
        latency_ms number,
        energy_uj number,
        is_accelerated boolean,
        macs number,
        memory_kb number)`,
    );
    db.exec(`SELECT * INTO ${layerTableName} FROM ?`, [
      report.layer_performance,
    ]);
    return db;
  } catch (error) {
    throw new Error(`Failed to create layer data database: ${error}`);
  }
}

export function handleLayerDataQuery(
  query: string,
  db: AlasqlDatabase,
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

  const data = db.exec(insetFrom(replaceAliasesWithRealNames(query)));
  return {
    columns: Object.keys(data[0] || {}) as (keyof LayerPerformanceEntry)[],
    rows: data as Partial<LayerPerformanceEntry>[],
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
