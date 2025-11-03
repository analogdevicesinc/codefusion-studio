import type {Register, RegisterDictionary} from '@common/types/soc';

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

/**
 * Initializes the register dictionary with the provided registers.
 * Should be called once at app startup.
 */
export function initializeRegisterDictionary(
	registersData: Register[] | undefined
) {
	resetRegisterDictionary();

	registers = registersData;

	registerDictionary = Array.isArray(registers)
		? populateRegisterDictionary(registers)
		: [];
}

// Function to get registerDictionary, with fallback to localStorage
export function getRegisterDictionary() {
	if (registerDictionary.length === 0) {
		registerDictionary = populateRegisterDictionary(registers ?? []);
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
