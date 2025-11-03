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
import {memo} from 'react';
import styles from './error.module.scss';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import ConflictIcon from '../../../../common/icons/Conflict';
import {TLocaleContext} from '../../../../common/types/l10n';

function UnknownError() {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.errors.unknown;

	return (
		<div className={styles.errorContainer}>
			<ConflictIcon />
			<div className={styles.errorMessage}>
				<div className={styles.messageTitle}>{i10n?.title}</div>
				<div className={styles.messageBody}>{i10n?.description}</div>
			</div>
		</div>
	);
}

export default memo(UnknownError);
