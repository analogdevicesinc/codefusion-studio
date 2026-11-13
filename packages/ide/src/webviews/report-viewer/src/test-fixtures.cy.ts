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
	CfsAiProfilingReport,
	CfsAiRuntimeProfilingReport
} from 'cfs-types';

const baseInfo: CfsAiRuntimeProfilingReport['info'] = {
	timestamp: new Date().toISOString(),
	version: '2.0.1',
	hardware: {
		FlashSize: 1024 * 1024,
		RamSize: 512 * 1024,
		CoreClock: 120_000_000,
		SupportedOps: [
			'Conv2D',
			'DepthwiseConv2D',
			'FullyConnected',
			'Softmax'
		],
		AccelOps: ['Conv2D', 'DepthwiseConv2D'],
		SupportedDataTypes: ['int8', 'float32'],
		OperatorInfos: [
			{
				Name: 'Conv2D',
				Cycles: 25000,
				Energy: 1500
			}
		],
		Target: {
			Soc: 'MAX78000',
			Core: 'Cortex-M4',
			Package: 'TQFN',
			Accelerator: 'CNN'
		}
	}
};

export const exampleProfileReport = {
	type: 'profile',
	info: baseInfo,
	model_summary: {
		model_name: 'mnist_cnn_int8',
		model_path: '/models/mnist_cnn_int8.tflite',
		framework: 'TensorFlow Lite',
		model_size_kb: 220,
		target_dtype: 'int8',
		layer_count: 12,
		total_parameters: 125_000
	},
	hardware_metrics: {
		total_cycles: 3_200_000,
		estimated_latency_ms: 26.7,
		estimated_power_mw: 28.4,
		peak_memory_kb: 180,
		peak_memory_mb: 0.18,
		available_ram_kb: 256,
		accelerated_layers: 9,
		cpu_only_layers: 3
	},
	memory_analysis: {
		model_peak_ram_kb: 180,
		available_ram_kb: 256,
		ram_utilization_percent: Math.round((180 / 256) * 100),
		ram_status: 'OK',
		memory_issues: [],
		memory_recommendations: [
			'Enable arena reuse to reduce peak allocations',
			'Quantize intermediate tensors where possible'
		]
	},
	layer_performance: [
		{
			layer_idx: 0,
			layer_name: 'conv_1',
			operator_type: 'Conv2D',
			cycles: 600_000,
			latency_ms: 5.0,
			energy_uj: 1800,
			power_mw: 28.4,
			is_accelerated: true,
			macs: 12_288_000,
			memory_kb: 24
		},
		{
			layer_idx: 1,
			layer_name: 'relu_1',
			operator_type: 'Relu',
			cycles: 80_000,
			latency_ms: 0.7,
			energy_uj: 150,
			power_mw: 22.0,
			is_accelerated: false,
			macs: 0,
			memory_kb: 4
		},
		{
			layer_idx: 10,
			layer_name: 'fc_1',
			operator_type: 'FullyConnected',
			cycles: 900_000,
			latency_ms: 7.5,
			energy_uj: 2400,
			power_mw: 32.0,
			is_accelerated: false,
			macs: 25_600_000,
			memory_kb: 64
		}
	],
	optimization_suggestions: [
		{
			category: 'fusion',
			description: 'Fuse batch norm into preceding conv layers',
			estimated_improvement: null,
			complexity: 'low',
			priority: null
		},
		{
			category: 'pruning',
			description:
				'Prune dense layer by 30% with minimal accuracy loss',
			estimated_improvement: null,
			complexity: 'medium',
			priority: null
		},
		{
			category: 'quantization',
			description:
				'Consider int8 quantization for non-accelerated ops',
			estimated_improvement: null,
			complexity: 'low',
			priority: null
		}
	],
	optimization_opportunities: {
		total_parameter_memory_kb: 150,
		total_macs: 42_888_000,
		layerwise_opportunities: [
			{
				layer_index: 10,
				op_type: 'FullyConnected',
				parameter_memory_kb: 96,
				macs: 25_600_000,
				kernel_info: '[[16,16,16], [32]]',
				suggestion: 'Apply structured pruning and re-quantization'
			},
			{
				layer_index: 0,
				op_type: 'Conv2D',
				parameter_memory_kb: 32,
				macs: 12_288_000,
				kernel_info: '[[16,16,16], [32]]',
				suggestion: 'Try smaller kernel size or depthwise separation'
			}
		],
		macs_opportunities: [
			{
				layer_index: 10,
				op_type: 'FullyConnected',
				parameter_memory_kb: 96,
				macs: 25_600_000,
				kernel_info: '[[16,16,16], [32]]',
				suggestion: 'Low-rank factorization to cut MACs'
			}
		]
	},
	errors: []
} satisfies CfsAiProfilingReport;

export const exampleRuntimeProfileReport = {
	type: 'runtime-profile',
	info: baseInfo,
	model_summary: {
		model_name: 'keyword_spotting_int8',
		model_path: '/models/keyword_spotting_int8.tflite',
		framework: 'TensorFlow Lite',
		layer_count: 3
	},
	inference_summary: {
		iterations: 50,
		total_latency_ms: 300,
		avg_latency_ms: 6,
		min_latency_ms: 5,
		max_latency_ms: 8,
		std_latency_ms: 0.9,
		throughput_ips: 166
	},
	hardware_metrics: {
		total_cycles: 804_000,
		estimated_latency_ms: 6,
		peak_memory_kb: 20,
		peak_memory_mb: 0.019531,
		available_ram_kb: 256,
		accelerated_layers: 2,
		cpu_only_layers: 1
	},
	memory_analysis: {
		model_peak_ram_kb: 20,
		available_ram_kb: 256,
		ram_utilization_percent: Math.round((20 / 256) * 100),
		ram_status: 'OK'
	},
	layer_performance: [
		{
			layer_idx: 0,
			layer_name: 'CONV_2D_0_0',
			operator_type: 'CONV_2D',
			cycles: 60_000,
			is_accelerated: true,
			memory_kb: 16,
			subgraph_idx: 0,
			invocations: 50,
			avg_latency_ms: 1,
			min_latency_ms: 0.9,
			max_latency_ms: 1.2,
			total_latency_ms: 50,
			latency_percent: 40,
			arena_used_bytes: 16384
		},
		{
			layer_idx: 1,
			layer_name: 'DEPTHWISE_CONV_2D_0_1',
			operator_type: 'DEPTHWISE_CONV_2D',
			cycles: 24_000,
			is_accelerated: true,
			memory_kb: 12,
			subgraph_idx: 0,
			invocations: 50,
			avg_latency_ms: 2,
			min_latency_ms: 1.8,
			max_latency_ms: 2.3,
			total_latency_ms: 100,
			latency_percent: 32,
			arena_used_bytes: 12288
		},
		{
			layer_idx: 2,
			layer_name: 'FULLY_CONNECTED_0_2',
			operator_type: 'FULLY_CONNECTED',
			cycles: 36_000,
			is_accelerated: false,
			memory_kb: 20,
			subgraph_idx: 0,
			invocations: 50,
			avg_latency_ms: 3,
			min_latency_ms: 2.7,
			max_latency_ms: 3.4,
			total_latency_ms: 150,
			latency_percent: 28,
			arena_used_bytes: 20480
		}
	]
} satisfies CfsAiRuntimeProfilingReport;

export const exampleCompatReport = {
	type: 'compat',
	info: baseInfo,
	memory_issues: null,
	operator_issues: [
		{
			type: 'unsupported operator',
			operator: 'FULLY_CONNECTED',
			layers: [0, 1, 2],
			suggested_alternative: 'None',
			severity: 'critical'
		}
	],
	unsupported_types: [
		{
			layers: [0, 1, 2],
			operation_type: 'FULLY_CONNECTED',
			data_type: 'FLOAT32',
			severity: 'critical'
		}
	],
	model_summary: {
		model_name: 'hello_world_f32.tflite',
		model_path:
			'C:\\work\\github\\codefusion-studio\\cfs-ai\\examples\\hello_world_f32.tflite'
	}
} satisfies CfsAiCompatibilityReport;
