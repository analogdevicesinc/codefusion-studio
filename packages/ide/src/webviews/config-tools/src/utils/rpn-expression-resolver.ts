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
/* eslint-disable complexity */
/* eslint-disable no-bitwise */
import type {
	ClockNodeState,
	Condition,
	PinState
} from '@common/types/soc';
import {
	NOT_COMPUTED_MARKER,
	UNCONFIGURED_TEXT,
	UNDEFINED_MARKER
} from '../screens/clock-config/constants/clocks';
import {getFirmwarePlatform} from './firmware-platform';

export type ClockConfigNodes = Record<
	string,
	Partial<ClockNodeState>
>;

export type GlobalConfig = {
	clockconfig: ClockConfigNodes;
	pinconfig?: unknown; // @TODO: Implement once we have a reference in the socs.
	assignedPins?: PinState[];
	currentNode?: string;
	toolId?: ToolId;
};

type ToolId = 'pinconfig' | 'clockconfig';

const SELECTION_OPERATOR = '?';
const INTEGER_COERCION_OPERATOR = 'int';
const BITWISE_NOT_OPERATOR = '~';
const BOOLEAN_NOT_OPERATOR = '!';
const CLOCK_OPERATOR = 'clk';
const LWR_CASE_OPERATOR = 'lwr';
const MATCH_OPERATOR = 'match';

const isHex = (str: string) => /^0x[0-9a-fA-F]+$/.test(str);

const isNumeric = (str: string) => !isNaN(Number(str)) || isHex(str);

const parseNumber = (str: string): number => {
	const num = isHex(str) ? parseInt(str, 16) : Number(str);

	return num < 0 ? num >>> 0 : num;
};

export const clockFrequencyDictionary: Record<
	string,
	string | number
> = {};

export function getClockFrequencyDictionary() {
	return clockFrequencyDictionary;
}

const executableOperators: Record<
	string,
	(
		operand1: string | number | boolean,
		operand2: string | number | boolean
	) => string | number | boolean
> = {
	'+'(operand1, operand2) {
		if (
			typeof operand1 === 'string' ||
			typeof operand2 === 'string'
		) {
			return String(operand1) + String(operand2);
		}

		return Number(operand1) + Number(operand2);
	},
	'-': (operand1, operand2) => Number(operand1) - Number(operand2),
	'*': (operand1, operand2) => Number(operand1) * Number(operand2),
	'/': (operand1, operand2) =>
		Math.floor(Number(operand1) / Number(operand2)),
	'=': (operand1, operand2) => (operand1 === operand2 ? 1 : 0),
	'!=': (operand1, operand2) => (operand1 === operand2 ? 0 : 1),
	'<': (operand1, operand2) => (operand1 < operand2 ? 1 : 0),
	'>': (operand1, operand2) => (operand1 > operand2 ? 1 : 0),
	'<=': (operand1, operand2) => (operand1 <= operand2 ? 1 : 0),
	'>=': (operand1, operand2) => (operand1 >= operand2 ? 1 : 0),
	'&&': (operand1, operand2) => operand1 && operand2,
	'||': (operand1, operand2) => operand1 || operand2,
	'<<': (operand1, operand2) =>
		(Number(operand1) << Number(operand2)) >>> 0,
	'>>': (operand1, operand2) =>
		(Number(operand1) >>> Number(operand2)) >>> 0,
	'&': (operand1, operand2) => Number(operand1) & Number(operand2),
	'|': (operand1, operand2) => Number(operand1) | Number(operand2),
	'^': (operand1, operand2) => Number(operand1) ^ Number(operand2)
};

const executeUnaryOperand = (
	token: string,
	operand: string | number
) => {
	switch (token) {
		case INTEGER_COERCION_OPERATOR:
			if (isNumeric(operand.toString())) {
				return parseNumber(operand.toString());
			}

			return null;
		case BITWISE_NOT_OPERATOR:
			return ~Number(operand) >>> 0;
		case BOOLEAN_NOT_OPERATOR:
			return Number(operand) === 0 ? 1 : 0;
		case LWR_CASE_OPERATOR:
			return operand.toString().toLowerCase();
		default:
			return null;
	}
};

function processControlWithReferencedValues(
	selector: string,
	currentConfig: GlobalConfig
) {
	// If currentToolTargets have a lenght > 1, it means it can have a format like node:control or toolId:node:control
	const currentToolTargets = selector.split(':');

	// Case node:control, the toolId is assumed as the current tool that is invoking the function.
	if (currentToolTargets.length === 2) {
		const [nodeName, control] = currentToolTargets;

		// @TODO: extend to support dynamic tool id.
		return (
			currentConfig.clockconfig[nodeName]?.controlValues?.[control] ??
			UNCONFIGURED_TEXT
		);
	}

	// Case toolId:node:control
	if (currentToolTargets.length === 3) {
		const [tool, nodeName, controlName] = currentToolTargets;
		const toolId = tool.toLowerCase();

		if (toolId === 'clockconfig') {
			return (
				currentConfig[toolId][nodeName].controlValues?.[
					controlName
				] ?? UNCONFIGURED_TEXT
			);
		}
	}

	return UNCONFIGURED_TEXT;
}

function processTemplateString(
	token: string,
	currentConfig: Record<string, string> | GlobalConfig
) {
	if (token.includes(UNDEFINED_MARKER)) {
		return UNDEFINED_MARKER;
	}

	// eslint-disable-next-line no-template-curly-in-string
	if (token === '${FirmwarePlatform}') {
		return getFirmwarePlatform() ?? UNCONFIGURED_TEXT;
	}

	const match =
		/\$\{(Control|String|Clock|PinMux|Node):([^}]+)\}/.exec(token);

	if (match) {
		const [_fullMatch, operandType, operandValue] = match;

		if (operandType === 'Clock') {
			return getValueFromClockDictionary(operandValue);
		}

		if (operandType === 'Control') {
			if (hasReferencedControlValues(operandValue)) {
				return formatOperand(
					processControlWithReferencedValues(
						operandValue,
						currentConfig as GlobalConfig
					)
				);
			}

			if (currentConfig.currentNode !== undefined) {
				return formatOperand(
					(currentConfig as GlobalConfig).clockconfig[
						currentConfig.currentNode
					]?.controlValues?.[operandValue] ?? UNCONFIGURED_TEXT
				);
			}

			return formatOperand(
				(currentConfig as Record<string, string>)[operandValue]
			);
		}

		if (operandType === 'PinMux') {
			const targetPin = (
				currentConfig as GlobalConfig
			).assignedPins?.find(
				({details}) => details.Label === operandValue
			);

			if (targetPin) {
				const appliedSignal = targetPin.appliedSignals[0];

				if (appliedSignal) {
					return `${appliedSignal.Peripheral}_${appliedSignal.Name}`;
				}
			}

			return UNCONFIGURED_TEXT;
		}

		if (operandType === 'Node') {
			const attributeValue = (
				currentConfig as Record<string, string>
			)[operandValue];

			if (attributeValue === undefined) {
				return UNCONFIGURED_TEXT;
			}

			return formatOperand(attributeValue);
		}

		return formatOperand(operandValue);
	}

	console.error(`Invalid template string format: ${token}`);

	return UNDEFINED_MARKER;
}

function baseEvaluateCondition(
	currentCfg: Record<string, string> | undefined,
	condition: Condition | undefined
): string | number | boolean | undefined;
function baseEvaluateCondition(
	currentCfg: GlobalConfig,
	condition: Condition
): string | number | boolean | undefined;
function baseEvaluateCondition(
	currentCfg: Record<string, string> | GlobalConfig | undefined,
	condition: Condition | undefined
) {
	if (!currentCfg || !condition) return 1;

	const tokens = splitCondition(condition);
	const stack: Array<string | number | boolean> = [];

	for (const token of tokens) {
		if (isNumeric(token)) {
			stack.push(parseNumber(token));
		} else if (token.startsWith('${')) {
			const processedString = processTemplateString(
				token,
				currentCfg
			);

			stack.push(processedString);
		} else if (executableOperators[token]) {
			const operand2 = formatOperand(stack.pop() as number | string);
			const operand1 = formatOperand(stack.pop() as number | string);

			if ([operand1, operand2].includes(UNDEFINED_MARKER)) {
				return UNDEFINED_MARKER;
			}

			if ([operand1, operand2].includes(NOT_COMPUTED_MARKER)) {
				return NOT_COMPUTED_MARKER;
			}

			const result = executableOperators[token](operand1, operand2);

			stack.push(result);
		} else if (token === SELECTION_OPERATOR) {
			const operand2 = stack.pop() as number;
			const operand1 = stack.pop() as number;
			const condition = stack.pop();
			let result;

			if (
				condition === NOT_COMPUTED_MARKER ||
				condition === UNDEFINED_MARKER
			) {
				result = condition;
			} else {
				result = condition ? operand1 : operand2;
			}

			stack.push(result);
		} else if (
			[
				INTEGER_COERCION_OPERATOR,
				BOOLEAN_NOT_OPERATOR,
				BITWISE_NOT_OPERATOR,
				LWR_CASE_OPERATOR
			].includes(token)
		) {
			const operand1 = stack.pop() as string;

			if (operand1 === UNDEFINED_MARKER) {
				return UNDEFINED_MARKER;
			}

			const result = executeUnaryOperand(token, operand1);

			if (result === null) {
				console.error(
					`Invalid operand for ${token} operator: ${operand1}`
				);
			} else {
				stack.push(result);
			}
		} else if (token === CLOCK_OPERATOR) {
			const clockName = stack.pop() as string;

			// @TODO: getting values from controls that are not rendered should return Undef
			if (clockName === UNCONFIGURED_TEXT) {
				return UNDEFINED_MARKER;
			}

			const currentFrequency = clockFrequencyDictionary[clockName];

			if (
				(typeof currentFrequency === 'number' &&
					currentFrequency >= 0) ||
				currentFrequency === UNDEFINED_MARKER ||
				currentFrequency === NOT_COMPUTED_MARKER
			) {
				stack.push(currentFrequency);
			}
		} else if (token === MATCH_OPERATOR) {
			const operand2 = stack.pop() as string;
			const operand1 = stack.pop() as string;

			stack.push(operand1.match(operand2) === null ? 0 : 1);
		} else {
			throw new Error(`Unsupported operator: ${token}`);
		}
	}

	return stack.pop();
}

export function evaluateCondition(
	currentCfg: Record<string, string> | undefined,
	condition: Condition | undefined
) {
	const result = baseEvaluateCondition(currentCfg, condition);

	if (result === NOT_COMPUTED_MARKER) {
		return NOT_COMPUTED_MARKER;
	}

	return typeof result === 'string' && result === UNDEFINED_MARKER
		? UNDEFINED_MARKER
		: result === 1;
}

export function computeEntryBoxDefaultValue(
	currentCfg: Record<string, string> | undefined,
	condition: Condition | undefined
) {
	const result = baseEvaluateCondition(currentCfg, condition);

	return result;
}

export function evaluateClockCondition(
	currentCfg: GlobalConfig,
	condition: Condition
) {
	const result = baseEvaluateCondition(currentCfg, condition);

	if (
		(typeof result === 'string' &&
			result.toLowerCase() === 'false') ||
		result === UNDEFINED_MARKER ||
		!result
	) {
		return false;
	}

	return true;
}

export function computeClockFrequency(
	currentCfg: GlobalConfig,
	condition: Condition
) {
	const result = baseEvaluateCondition(currentCfg, condition);

	return result;
}

export function getValueFromClockDictionary(clockName: string) {
	return clockFrequencyDictionary[clockName];
}

export function hasReferencedControlValues(token: string) {
	return token.split(':').length >= 2;
}

// Adds support for splitting conditions whith spaces inside template strings
function splitCondition(condition: string) {
	const tokens = condition.split(/\s+/);
	const splitTokens: string[] = [];

	for (let i = 0; i < tokens.length; i++) {
		if (tokens[i].startsWith('${') && !tokens[i].endsWith('}')) {
			splitTokens.push(`${tokens[i]} ${tokens[i + 1]}`);
		} else if (
			tokens[i].endsWith('}') &&
			!tokens[i].startsWith('${')
		) {
			continue;
		} else {
			splitTokens.push(tokens[i]);
		}
	}

	return splitTokens;
}

function formatOperand(operand: string | number) {
	if (typeof operand === 'string') {
		if (operand.toLowerCase() === 'true') {
			return 1;
		}

		if (operand.toLowerCase() === 'false') {
			return 0;
		}

		if (operand === '') {
			return UNCONFIGURED_TEXT;
		}
	}

	return operand;
}

export function computeFrequencies(
	clockNodesConfig: Record<string, ClockNodeState>,
	assignedPins: PinState[]
) {
	// Initialization
	const visitList = Object.values(clockNodesConfig).reduce<
		Array<{
			Name: string;
			Value: string;
			CurrentCfg: GlobalConfig;
		}>
	>((acc, node) => {
		node.Outputs.forEach(output => {
			if (!acc.some(item => item.Name === output.Name)) {
				acc.push({
					...output,
					CurrentCfg: {
						clockconfig: clockNodesConfig,
						assignedPins,
						currentNode: node.Name
					}
				});
			}
		});

		return acc;
	}, []);

	// Init all entries in the computed frequencies dictionary as not computed.
	Object.keys(clockNodesConfig).forEach(nodeName => {
		const node = clockNodesConfig[nodeName];

		node.Outputs.forEach(output => {
			clockFrequencyDictionary[output.Name] = NOT_COMPUTED_MARKER;
		});
	});

	let i = 0;

	while (i < visitList.length) {
		const currentOutput = visitList[i];

		const result = computeClockFrequency(
			currentOutput.CurrentCfg,
			currentOutput.Value
		);

		if (result === UNCONFIGURED_TEXT || result === UNDEFINED_MARKER) {
			// Refers to inputs without a value
			clockFrequencyDictionary[currentOutput.Name] = UNDEFINED_MARKER;
		} else if (result === NOT_COMPUTED_MARKER) {
			// Refers to values that depend on other values that are not computed yet
			visitList.push(currentOutput);
		} else {
			const clockValue = parseNumber(result as string);

			if (isNaN(clockValue)) {
				console.error(
					`Invalid computed frequency for: ${currentOutput.Name}`
				);
				clockFrequencyDictionary[currentOutput.Name] =
					UNDEFINED_MARKER;
			} else {
				clockFrequencyDictionary[currentOutput.Name] = clockValue;
			}
		}

		i++;
	}

	return clockFrequencyDictionary;
}
