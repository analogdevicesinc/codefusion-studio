/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {type TSection} from '../common/types/memory-layout';
import {type TSymbol} from '../common/types/symbols';

export const transformSymbols = (
	symbols: TSymbol[]
): Array<Record<string, any>> =>
	symbols.map((symbol: TSymbol) => ({
		value: symbol.size,
		name: symbol.name,
		id: symbol.num,
		symbolSize: symbol.size,
		virtualAddress: symbol.value
	}));

export const calculateSectionSizes = (
	sections: TSection[]
): Record<string, number> => {
	const result: Record<string, number> = {text: 0, data: 0, bss: 0};

	sections.forEach(section => {
		if (section?.bucket?.toLowerCase() === 'text') {
			result.text += section.size;
		}

		if (section?.bucket?.toLowerCase() === 'bss') {
			result.bss += section.size;
		}

		if (section?.bucket?.toLowerCase() === 'data') {
			result.data += section.size;
		}
	});

	return result;
};

const getComputedStyleValue = (element: Element, property: string) =>
	getComputedStyle(element).getPropertyValue(property).trim();

const chartBlue = getComputedStyleValue(
	document.documentElement,
	'--vscode-charts-blue'
);

const chartGreen = getComputedStyleValue(
	document.documentElement,
	'--vscode-charts-green'
);

const chartOrange = getComputedStyleValue(
	document.documentElement,
	'--vscode-charts-orange'
);

export const axisColor = getComputedStyleValue(
	document.documentElement,
	'--vscode-commandCenter-inactiveBorder'
);

export const chartLegendColors = {
	bss: chartOrange,
	text: chartBlue,
	data: chartGreen
};

export const TooltipInfo = [
	{
		title: 'Bit Format',
		description:
			'Specifies the architecture of the file, indicating whether it is a 32-bit or 64-bit binary. This affects the width of data units and addresses used by the program'
	},
	{
		title: 'Byte Order',
		description:
			'Indicates the endianness of the file, which can be Least Significant Byte (LSB, little-endian) or Most Significant Byte (MSB, big-endian). This determines how byte sequences are ordered in memory'
	},
	{
		title: 'File Type',
		description:
			'Denotes the type of the file, such as an executable binary, an object file, a shared library, or a core dump.'
	},
	{
		title: 'Architecture',
		description:
			'Specifies the target architecture for the file, such as ARM, x86, MIPS, etc. This indicates the CPU type and instruction set the file is intended for.'
	},
	{
		title: 'ABI and ELF Version',
		description:
			'Indicates the Application Binary Interface (ABI) version used, which defines standards for binary interfacing between software components, ensuring compatibility and efficient execution and also specifies the version of the ELF format, typically version 1. It may also indicate compliance with specific standards like System V (SYSV)'
	},
	{
		title: 'Linkage',
		description:
			'Indicates whether the file is statically or dynamically linked. Statically linked files include all necessary libraries within the executable, while dynamically linked files rely on external shared libraries at runtime.'
	},
	{
		title: 'Debug Information',
		description:
			'Indicates whether the file contains debugging information. This information is used by debuggers to provide detailed analysis, including source code references and variable names.'
	},
	{
		title: 'Stripping',
		description:
			'Indicates whether the file has had its symbol table and debugging information removed (stripped) to reduce size. Non-stripped files retain these elements, which are useful for debugging and development.'
	}
];
