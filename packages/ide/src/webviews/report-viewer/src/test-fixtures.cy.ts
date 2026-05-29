import type {
	AIModelProfileReport,
	AIModelCompatReport,
	Report
} from "@ide-types/report-view-types";

const baseInfo: Omit<Report['info'], 'type'> = {
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

export const exampleProfileReport: AIModelProfileReport = {
	info: {type: 'profile', ...baseInfo},
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
		'Fuse batch norm into preceding conv layers',
		'Prune dense layer by 30% with minimal accuracy loss',
		'Consider int8 quantization for non-accelerated ops'
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
};

export const exampleCompatReport: AIModelCompatReport = {
	info: {type: 'compat', ...baseInfo},
	memory_issues: undefined,
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
};
