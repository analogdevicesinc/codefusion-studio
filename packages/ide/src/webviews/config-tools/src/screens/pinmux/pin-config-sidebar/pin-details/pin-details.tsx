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

import {memo, useMemo} from 'react';

import {TextField} from 'cfs-react-library';
import styles from './pin-details.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {useDispatch} from 'react-redux';
import {useSignalDescription} from '../../../../state/slices/peripherals/peripherals.selector';
import debounce from 'lodash.debounce';
import {setSignalDescription} from '../../../../state/slices/peripherals/peripherals.reducer';

type PinDetailsProps = Readonly<{
	pinId: string;
	peripheral: string;
	signal: string;
}>;

function PinDetails({pinId, peripheral, signal}: PinDetailsProps) {
	const l10n = useLocaleContext()?.pinConfig as
		| Record<string, string>
		| undefined;
	const dispatch = useDispatch();

	const description = useSignalDescription(peripheral, signal);

	const handleDescriptionChange = useMemo(
		() =>
			debounce((value: string) => {
				dispatch(
					setSignalDescription({
						peripheral,
						signalName: signal,
						description: value
					})
				);
			}, 1000),
		[dispatch, peripheral, signal]
	);

	return (
		<div
			data-test='config-sidebar:pin-details'
			className={styles.detailsSection}
		>
			<TextField
				optional
				dataTest={`description-input:${pinId}`}
				label={l10n?.description ?? 'Description'}
				placeholder={l10n?.startTyping ?? 'Start typing...'}
				inputVal={description}
				onInputChange={handleDescriptionChange}
			/>
		</div>
	);
}

export default memo(PinDetails);
