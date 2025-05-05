/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {type RegisterDictionary} from '../../../../../common/types/soc';
import styles from './register-details-header.module.scss';
import {formatHexPrefix} from '../../../utils/memory';
import {ChevronLeftIcon} from 'cfs-react-library';
import padStart from 'lodash/padStart';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';

export type RegisterDetailsHeaderProps = {
	readonly register: RegisterDictionary;
	readonly value: string;
	readonly onCloseDetails: () => void;
};

export function RegisterDetailsHeader({
	register,
	value,
	onCloseDetails
}: RegisterDetailsHeaderProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.registers?.['details-section'];

	return (
		<div
			className={styles.header}
			data-test='register-details-header'
		>
			<ChevronLeftIcon
				className={styles.icon}
				onClick={onCloseDetails}
			/>
			<h1>{register.name}</h1>
			<div className={styles.label}>
				{i10n?.value} {formatHexPrefix(value)}
			</div>
			<div className={styles.label}>
				{i10n?.reset} 0x
				{padStart(register.reset.toString(16).toUpperCase(), 8, '0')}
			</div>
		</div>
	);
}
