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

import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import ConflictIcon from '../../../../../common/icons/Conflict';
import styles from './peripheral-error.module.scss';

type PeripheralErrorProps = {
	readonly errorCount: number;
};

function PeripheralError({errorCount}: PeripheralErrorProps) {
	const l10n: TLocaleContext | undefined = useLocaleContext();
	return (
		<div
			className={styles.errorContainer}
			data-test='peripheral:error'
		>
			<ConflictIcon data-test='signal-assignment:conflict' />
			<p>{`${errorCount} ${errorCount === 1 ? l10n?.peripherals?.error?.one : l10n?.peripherals?.error?.other}`}</p>
		</div>
	);
}

export default PeripheralError;
