/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import { CfsPluginInfo } from "cfs-plugins-api";

export default {
	pluginName: "Embedded AI Tools",
	pluginId: "com.analog.ai-tools",
	pluginDescription: "Tools for managing embedded AI models",
	pluginVersion: "1.0.0",
	author: "Analog Devices, Inc.",
	pluginPath: "", // required because were not loading it from json
	properties: {
		neuroweave: [],
		izer: [
			{
				Id: "Section",
				Type: "MemorySection",
				Description: "Memory section for data",
				Tooltip:
					"The memory section used to map the data. Sections can be edited via the Memory tab."
			},
			{
				Id: "Softmax",
				Type: "boolean",
				Description: "Enable softmax layer generation",
				Tooltip: "Enable softmax layer generation.",
				Default: true
			},
			{
				Id: "Timer",
				Type: "enum",
				Description: "Inference timer",
				Tooltip:
					"Timer [0-3] to use to measure the inference timing.",
				Default: "0",
				EnumValues: [
					{
						Id: "0",
						Value: "0",
						Description: "0"
					},
					{
						Id: "1",
						Value: "1",
						Description: "1"
					},
					{
						Id: "2",
						Value: "2",
						Description: "2"
					},
					{
						Id: "3",
						Value: "3",
						Description: "3"
					}
				]
			},
			{
				Id: "Prefix",
				Type: "string",
				Description: "Test name prefix",
				Tooltip: "The prefix used for the test name"
			},
			{
				Id: "AvgPoolRounding",
				Type: "boolean",
				Description: "Round average pooling results",
				Tooltip: "Round the average pooling results.",
				Default: true
			},
			{
				Id: "ClockDivider",
				Type: "enum",
				Description: "CNN Clock divider",
				Tooltip:
					"Clock divider for CNN accelerator (1 or 4 depending on source)",
				Default: "1",
				EnumValues: [
					{
						Id: "1",
						Value: "1",
						Description: "1"
					},
					{
						Id: "4",
						Value: "4",
						Description: "4"
					}
				]
			},
			{
				Id: "NetworkConfig",
				Type: "File",
				Description: "Network Configuration File",
				Tooltip:
					"Path to the .yaml file describing the network configuration."
			}
		],
		"cfsai.tflm": [
			{
				Id: "Section",
				Type: "MemorySection",
				Description: "Memory section for data",
				Tooltip:
					"The memory section used to map the data. Sections can be edited via the Memory tab."
			},
			{
				Id: "Symbol",
				Type: "string",
				Description: "Symbol for data",
				Tooltip:
					"The C symbol used for the data array and generated files."
			}
		]
	},
	features: {},
	supportedBackends: {
		izer: {
			Targets: [
				{
					Hardware: {
						Soc: "MAX78002",
						Core: "CM4",
						Accelerator: "CNN"
					},
					FirmwarePlatform: "msdk"
				}
			],
			Slow: false,
			MaxModels: 1,
			Docker: {
				Size: 4
			}
		},
		"cfsai.tflm": {
			Targets: [
				{
					Hardware: {
						Family: "SHARCFX",
						Accelerator: null
					},
					FirmwarePlatform: null
				},
				{
					Hardware: {
						Family: "Cortex-M",
						Accelerator: null
					},
					FirmwarePlatform: null
				}
			],
			Slow: false,
			MaxModels: 99
		}
	}
	// not all CfsPluginInfo fields are actually required, but the type says they are
	// also add the Record<string, unknown> to allow additional fields
} as unknown as CfsPluginInfo & Record<string, unknown>;
