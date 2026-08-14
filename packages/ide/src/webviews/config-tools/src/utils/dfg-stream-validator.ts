/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import type {DFGStreamUI} from '../state/slices/gaskets/gasket.reducer';
import type {TLocaleContext} from '../common/types/context';
import {getGasketDictionary} from './dfg';

/**
 * Determines whether an input stream has an output stream tied to one of
 * its destinations.
 *
 * @param stream The input stream to inspect.
 * @param streams All streams in the DFG.
 * @returns Whether another stream depends on one of the stream's tied destinations.
 */
export function hasTiedStreamDependency(
	stream: DFGStreamUI,
	streams: DFGStreamUI[]
): boolean {
	const gaskets = getGasketDictionary();

	return stream.Destinations.some(destination =>
		gaskets[destination.Gasket]?.InputAndOutputBuffersTied
			? streams.some(
					candidate =>
						candidate.Uuid !== stream.Uuid &&
						candidate.Source.Gasket === destination.Gasket &&
						candidate.Source.Index === destination.Index
			  )
			: false
	);
}

/**
 * Determines whether an edited stream removes a destination that another
 * stream uses as the input for a tied output stream.
 *
 * @param originalStream The persisted stream before editing.
 * @param updatedStream The proposed edited stream.
 * @param streams All streams in the DFG.
 * @returns Whether applying the edit would orphan a tied output stream.
 */
export function hasRemovedTiedStreamDependency(
	originalStream: DFGStreamUI,
	updatedStream: DFGStreamUI,
	streams: DFGStreamUI[]
): boolean {
	const gaskets = getGasketDictionary();

	return originalStream.Destinations.some(destination => {
		const keepsDestination = updatedStream.Destinations.some(
			updatedDestination =>
				updatedDestination.Gasket === destination.Gasket
		);

		return (
			!keepsDestination &&
			gaskets[destination.Gasket]?.InputAndOutputBuffersTied &&
			streams.some(
				candidate =>
					candidate.Uuid !== originalStream.Uuid &&
					candidate.Source.Gasket === destination.Gasket &&
					candidate.Source.Index === destination.Index
			)
		);
	});
}

/**
 * Validates a DFG stream configuration and returns field-keyed error messages.
 *
 * @param stream The stream to validate.
 * @param i10n The localization context for error messages.
 * @param hasAdditionalStreamConfigErrors Whether external validation errors exist.
 * @returns A record mapping field keys to localized error messages.
 */
export function validateStream(
	stream: DFGStreamUI | undefined,
	i10n: TLocaleContext | undefined,
	hasAdditionalStreamConfigErrors = false
): Record<string, string> {
	const i10nValidationErrors =
		i10n?.streamConfigSidePanel.validationErrors;

	if (!stream) {
		return {
			'Source.Gasket': i10nValidationErrors?.sourceGasketRequired,
			'Destinations.Gasket':
				i10nValidationErrors?.destinationGasketRequired,
			'Source.BufferSize':
				i10nValidationErrors?.sourceBufferSizeRequired,
			'Destinations.BufferSize':
				i10nValidationErrors?.destinationBufferSizeRequired
		};
	}

	const errors: Record<string, string> = {};

	if (!stream.Destinations || stream.Destinations.length === 0) {
		errors['Destinations.Gasket'] =
			i10nValidationErrors?.destinationGasketRequired;
	}

	if (!stream.Source.BufferSize) {
		errors['Source.BufferSize'] =
			i10nValidationErrors?.sourceBufferSizeRequired;
	}

	stream.Destinations.forEach((dest, index) => {
		if (!dest.BufferSize) {
			errors[`Destinations.${index}.BufferSize`] =
				i10nValidationErrors?.destinationBufferSizeRequired_01?.replace(
					'{destinationIndex}',
					index + 1
				);
		}
	});

	if (!stream.Source.Gasket) {
		errors['Source.Gasket'] =
			i10nValidationErrors?.sourceGasketRequired;

		return errors;
	}

	const gaskets = getGasketDictionary();

	if (
		gaskets[stream.Source.Gasket].InputAndOutputBuffersTied &&
		(stream.Source.Index < 0 || stream.StreamId < 1)
	) {
		errors['Source.TiedStream'] =
			i10nValidationErrors?.sourceTiedStreamRequired;
	}

	if (hasAdditionalStreamConfigErrors) {
		errors.AdditionalStreamConfig =
			i10nValidationErrors?.additionalStreamConfig;
	}

	return errors;
}
