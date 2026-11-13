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

import {InfoIcon, TextField, Tooltip} from 'cfs-react-library';
import {useConnectionDetailsL10n} from './use-connection-details-l10n';
import styles from './alias-field.module.scss';

/** Maximum number of characters a signal alias may contain. */
export const ALIAS_MAX_LENGTH = 15;

type AliasFieldProps = {
	readonly value: string;
	readonly onChange: (value: string) => void;
};

/**
 * The Alias input for the SRU connection details panel: a label row with an
 * info tooltip and an "Optional" badge, the text input itself capped at
 * `ALIAS_MAX_LENGTH` characters, and a right-aligned character counter
 * showing the used characters out of `ALIAS_MAX_LENGTH`.
 */
export function AliasField({value, onChange}: AliasFieldProps) {
	const detailsL10n = useConnectionDetailsL10n();

	return (
		<div className={styles.aliasField}>
			<div className={styles.labelRow}>
				<label className={styles.label} htmlFor='control-input'>
					{detailsL10n?.alias}
					{detailsL10n?.aliasInfo && (
						<Tooltip
							title={detailsL10n.aliasInfo}
							type='long'
							position='bottom'
							dataTest='connection-details-alias-info'
						>
							<span className={styles.infoIcon}>
								<InfoIcon />
							</span>
						</Tooltip>
					)}
				</label>
				<span className={styles.optional}>
					{detailsL10n?.optional}
				</span>
			</div>
			<TextField
				dataTest='connection-details-alias'
				placeholder={detailsL10n?.aliasPlaceholder}
				inputVal={value}
				maxLength={ALIAS_MAX_LENGTH}
				onInputChange={onChange}
			/>
			<span
				className={styles.counter}
				data-test='connection-details-alias-counter'
			>
				{value.length}/{ALIAS_MAX_LENGTH}
			</span>
		</div>
	);
}
