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
import {memo} from 'react';
import styles from './peripheral-pins-reserved.module.scss';
import DetailsView from '@common/components/details-view/DetailsView';
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';

type PeripheralPinsReservedProps = Readonly<{
	peripheralName: string;
	signalName?: string;
	onBackClick: () => void;
}>;

function PeripheralPinsReserved({
	peripheralName,
	signalName,
	onBackClick
}: PeripheralPinsReservedProps) {
	const l10n: TLocaleContext | undefined = useLocaleContext();

	return (
		<DetailsView
			handleBackClick={onBackClick}
			body={
				<div data-test={`peripheral-pins-reserved:${peripheralName}`}>
					<h3 className={styles.title}>{peripheralName}</h3>

					<div className={styles.divider} />

					<p className={styles.message}>
						{signalName
							? l10n?.pinmux?.search?.signalPinReserved.replace(
									'{signalName}',
									signalName
								) ||
								`The ${signalName} signal uses a reserved pin and cannot be configured.`
							: l10n?.pinmux?.search?.allPinsReserved ||
								'All pins associated with this peripheral are reserved and cannot be configured.'}
					</p>
				</div>
			}
		/>
	);
}

export default memo(PeripheralPinsReserved);
