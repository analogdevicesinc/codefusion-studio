/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import ConflictIcon from '../../../../../../common/icons/Conflict';
import styles from './error-count.module.scss';

type ErrorCountProps = {
	readonly count: number;
};

/**
 * Component to display the error count for a peripheral or signal
 * @param count - Number of errors to display
 */
function ErrorCount({count}: ErrorCountProps) {
	const l10n: TLocaleContext | undefined = useLocaleContext();

	return count > 0 ? (
		<div
			className={styles.errorContainer}
			data-test='peripheral:error'
		>
			<ConflictIcon data-test='signal-assignment:conflict' />
			<p>{`${count} ${
				count === 1
					? l10n?.peripherals?.error?.one
					: l10n?.peripherals?.error?.other
			}`}</p>
		</div>
	) : null;
}

export default memo(ErrorCount);
