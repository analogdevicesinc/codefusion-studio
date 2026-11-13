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

import {CheckBox, InfoIcon, Tooltip} from 'cfs-react-library';
import {useConnectionDetailsL10n} from './use-connection-details-l10n';
import styles from './polarity-field.module.scss';

type PolarityFieldProps = {
	readonly value: boolean;
	readonly onChange: (value: boolean) => void;
};

/**
 * The polarity control for an SRU input signal that supports hardware
 * inversion: a "Polarity control" label with an info tooltip, followed by a
 * single "Invert signal polarity" checkbox. Unchecked (the default) is
 * Normal; checked is Inverted. Only rendered for signals whose schema
 * `Config` declares an `INVERT` control - see `supportsSruInversion` in
 * `utils/sru.ts`.
 */
export function PolarityField({value, onChange}: PolarityFieldProps) {
	const detailsL10n = useConnectionDetailsL10n();

	return (
		<div className={styles.polarityField}>
			<label className={styles.label}>
				{detailsL10n?.polarityControl}
				{detailsL10n?.polarityControlInfo && (
					<Tooltip
						title={detailsL10n.polarityControlInfo}
						type='long'
						position='bottom'
						dataTest='connection-details-polarity-info'
					>
						<span className={styles.infoIcon}>
							<InfoIcon />
						</span>
					</Tooltip>
				)}
			</label>
			<CheckBox
				checked={value}
				dataTest='connection-details-invert-polarity'
				onChange={() => {
					onChange(!value);
				}}
			>
				{detailsL10n?.invertSignalPolarity}
			</CheckBox>
		</div>
	);
}
