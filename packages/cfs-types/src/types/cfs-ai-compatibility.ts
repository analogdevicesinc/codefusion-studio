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
import type { ReportInfo } from "./cfs-ai.js";

export type CfsAiCompatSeverity = "critical" | "warning";

export interface CfsAiCompatOperatorIssue {
	layers: number[];
	operator: string;
	severity: CfsAiCompatSeverity;
	/** The analyzer reports the string `"None"` when no alternative exists. */
	suggested_alternative: null | string;
	type: string;
}

export interface CfsAiCompatMemoryRecommendation {
	method: string;
	reference: null | string;
}

export interface CfsAiCompatOptimizationOpportunity {
	current_flash_kb: number;
	layer_index: number;
	operation_type: string;
	optimization_method: string;
	potential_savings_kb: number;
	priority: string;
}

export interface CfsAiCompatMemoryIssue {
	detailed_info: string;
	memory_type: string;
	optimization_opportunities: CfsAiCompatOptimizationOpportunity[];
	recommendations: CfsAiCompatMemoryRecommendation[];
	severity: CfsAiCompatSeverity;
	type: string;
}

export interface CfsAiCompatUnsupportedTypeIssue {
	data_type: string;
	layers: number[];
	operation_type: string;
	severity: CfsAiCompatSeverity;
}

export interface CfsAiCompatModelSummary {
	model_name: null | string;
	model_path: null | string;
	model_hash?: string;
}

export interface CfsAiCompatibilityReport {
	type: "compat";
	info: ReportInfo | null;
	memory_issues: CfsAiCompatMemoryIssue[] | null;
	model_summary: CfsAiCompatModelSummary | null;
	operator_issues: CfsAiCompatOperatorIssue[] | null;
	unsupported_types: CfsAiCompatUnsupportedTypeIssue[] | null;
}
