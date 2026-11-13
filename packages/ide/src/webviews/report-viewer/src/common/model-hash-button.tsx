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
import {Button, CopyIcon} from 'cfs-react-library';
import Tooltip from '../../../common/components/tooltip/Tooltip';
import {useLocaleContext} from '../../../common/contexts/LocaleContext';
import styles from './model-hash-button.module.scss';
import {Direction} from '../../../common/utils';

export function ModelHashButton({hash}: {readonly hash?: string}) {
	const l10n = useLocaleContext()?.common;

	if (!hash) return null;

	return (
		<Tooltip
			title={l10n?.copyModelHash}
			type='long'
			direction={Direction.Left}
		>
			<Button
				appearance='icon'
				className={styles.button}
				dataTest='copy-model-hash-button'
				onClick={() => {
					void navigator.clipboard.writeText(hash);
				}}
			>
				<CopyIcon className={styles.icon} />
			</Button>
		</Tooltip>
	);
}
