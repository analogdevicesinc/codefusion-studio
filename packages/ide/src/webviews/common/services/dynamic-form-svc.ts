import type {TFormFieldValue} from 'cfs-react-library';
import type {TControlTypes} from '../../config-tools/src/types/errorTypes';
import {generateControlErrorMessage} from '../../config-tools/src/utils/control-errors';
import {generateValidationErrorType} from '../../config-tools/src/utils/validate-inputs';

const getFormattedContent = (
	value: TFormFieldValue | undefined,
	type: TControlTypes
) => {
	if (value) return value.toString();

	if (type === 'integer') {
		return '0';
	}

	return '';
};

/**
 * Validates a control's value, returning an error object with a message if validation fails, otherwise undefined.
 * @param - existing errors object or empty object, control data for which errors need to be computed
 * @returns - errors: {controlId1: 'error message', controlId2: 'new error message'}
 */
export const computeErrorPerControl = (control: {
	id: string;
	type: TControlTypes;
	value: TFormFieldValue | undefined;
	minVal?: number | undefined;
	maxVal?: number | undefined;
	pattern?: string | undefined;
}): Record<string, string> | undefined => {
	const {id, type, value, minVal, maxVal, pattern} = control;
	let controlError;

	const inputData = {
		content: getFormattedContent(value, type),
		controlType: type,
		minVal,
		maxVal,
		pattern
	};

	const errType = generateValidationErrorType(inputData);

	if (errType) {
		controlError = {
			[id]: generateControlErrorMessage(errType, minVal, maxVal)
		};
	}

	return controlError;
};
