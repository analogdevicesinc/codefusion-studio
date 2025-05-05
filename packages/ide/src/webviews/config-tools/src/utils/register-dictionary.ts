import type {Register, RegisterDictionary} from '@common/types/soc';
import {getRegisters} from './api';

export let registers: Register[] | undefined;
export let registerDictionary: RegisterDictionary[] = [];

function populateRegisterDictionary(
	registers: Register[]
): RegisterDictionary[] {
	return registers.map(register => ({
		name: register.Name,
		description: register.Description,
		address: register.Address,
		reset: register.Fields.reduce(
			(acc, field) =>
				acc + (field.Reset as number) * 2 ** field.Position,
			0
		),
		size: register.Size,
		svg: `${(window as any).__DEV_SOC__?.Name}-${(window as any).__DEV_SOC__?.Packages?.[0]?.Name}/${register.Svg}`,
		fields: register.Fields.map((field, fieldIdx) => ({
			id: `${field.Name}-${fieldIdx}`,
			name: field.Name,
			description: field.Description,
			documentation: field.Documentation,
			position: field.Position,
			length: field.Length,
			reset: field.Reset,
			access: field.Access,
			enumVals: field.Enum?.map((enumVal, enumValIdx) => ({
				id: `${enumVal.Name}-${enumValIdx}`,
				name: enumVal.Name,
				description: enumVal.Description,
				value: enumVal.Value,
				documentation: enumVal.Documentation
			}))
		}))
	}));
}

if (import.meta.env.MODE === 'development') {
	registers = (window as any).__DEV_SOC__?.Registers ?? [];

	if ((window as any).Cypress) {
		// Cypress is running, so we can use the mock data
		const localStorageRegisters = localStorage.getItem('Registers');

		if (localStorageRegisters) {
			registers = JSON.parse(localStorageRegisters);
		}
	}
} else {
	registers = await getRegisters();
}

if (Array.isArray(registers)) {
	registerDictionary = populateRegisterDictionary(registers);
}

// Function to get registerDictionary, with fallback to localStorage
export function getRegisterDictionary() {
	if (registerDictionary.length === 0) {
		// Attempt to populate the register dictionary from localStorage (for testing purposes)
		const localStorageRegisters = localStorage.getItem('Registers');

		if (localStorageRegisters) {
			const parsedRegisters: Register[] = JSON.parse(
				localStorageRegisters
			);

			registerDictionary =
				populateRegisterDictionary(parsedRegisters);
		}
	}

	return registerDictionary;
}

export function getRegisterDetails(registerName: string | undefined) {
	const registers = getRegisterDictionary();

	return registers.find(register => register.name === registerName);
}

export function resetRegisterDictionary() {
	registers = undefined;
	registerDictionary = [];
}
