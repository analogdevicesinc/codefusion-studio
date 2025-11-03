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

import { CfsPackage, CfsPackageReference } from "../../src/index.js";

type MockPackageDetail = CfsPackage & {
	dependencies: CfsPackageReference[];
};

//All available packages on the server
const allAvailablePackages: CfsPackageReference[] = [
	{
		name: "msdk",
		version: "1.0.0"
	},
	{
		name: "zephyr",
		version: "4.1.0"
	},
	{
		name: "zephyr",
		version: "3.7.0"
	},
	{
		name: "gcc-arm-none-eabi",
		version: "14.2.1"
	},
	{
		name: "gcc-riscv-none-elf",
		version: "12.2.0"
	},
	{
		name: "cmake",
		version: "3.31.6"
	},
	{
		name: "git",
		version: "2.45.2"
	}
];

//Detailed information for each package
const packageList: MockPackageDetail[] = [
	{
		reference: {
			name: "msdk",
			version: "1.0.0"
		},
		cfsVersion: "2.0.0",
		dependencies: [
			{
				name: "gcc-arm-none-eabi",
				version: "14.2.1"
			},
			{
				name: "gcc-riscv-none-elf",
				version: "12.2.0"
			},
			{
				name: "cmake",
				version: "3.31.6"
			}
		],
		license: "Apache-2",
		description: "MSDK installation.",
		soc: ["MAX32690", "MAX32660"],
		type: "sdk"
	},
	{
		reference: {
			name: "zephyr",
			version: "4.1.0"
		},
		cfsVersion: "2.0.0",
		dependencies: [],
		license: "Apache-2",
		description: "Zephyr 4.1.0 installation.",
		soc: ["MAX32690"],
		type: "sdk"
	},
	{
		reference: {
			name: "gcc-arm-none-eabi",
			version: "14.2.1"
		},
		cfsVersion: "2.0.0",
		dependencies: [],
		license: "Apache-2",
		description: "GCC arm none eabi",
		soc: [],
		type: "tool"
	},
	{
		reference: {
			name: "gcc-riscv-none-elf",
			version: "12.2.0"
		},
		cfsVersion: "2.0.0",
		dependencies: [],
		license: "Apache-2",
		description: "GCC Riscv",
		soc: [],
		type: "tool"
	},
	{
		reference: {
			name: "cmake",
			version: "3.31.6"
		},
		cfsVersion: "2.0.0",
		dependencies: [],
		license: "Apache-2",
		description: "Cmake",
		soc: [],
		type: "tool"
	},
	{
		reference: {
			name: "git",
			version: "2.45.2"
		},
		cfsVersion: "2.0.0",
		dependencies: [],
		license: "Apache-2",
		description: "git",
		soc: [],
		type: "tool"
	}
];

//Installed package
const installedPackages: CfsPackageReference[] = [
	{
		name: "msdk",
		version: "1.0.0"
	},
	{
		name: "zephyr",
		version: "4.1.0"
	},
	{
		name: "gcc-arm-none-eabi",
		version: "14.2.1"
	},
	{
		name: "gcc-riscv-none-elf",
		version: "12.2.0"
	},
	{
		name: "cmake",
		version: "3.31.6"
	}
];

const mockData = {
	allAvailablePackages: allAvailablePackages,
	detailedPackageInfo: packageList,
	installedPackages: installedPackages
};

export default mockData;
