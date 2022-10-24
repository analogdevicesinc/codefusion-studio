/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {useState} from 'react';
import {VSCodeButton} from '@vscode/webview-ui-toolkit/react';

import Tooltip from '../../components/Tooltip/Tooltip';
import Info from '@common/icons/Info';
import type {TLocaleContext} from '../../common/types/context';

import styles from './HeaderWithTooltip.module.scss';

type THeaderWithTooltipProps = {
	readonly title: string;
	readonly i10n: TLocaleContext | undefined;
};

export default function HeaderWithTooltip({
	title,
	i10n
}: THeaderWithTooltipProps) {
	const [isHovered, setIsHovered] = useState<boolean>(false);

	return (
		<div
			className={styles.header}
			onMouseEnter={() => {
				setIsHovered(true);
			}}
			onMouseLeave={() => {
				setIsHovered(false);
			}}
		>
			<h1 className={styles.title}>{title}</h1>

			{isHovered && i10n?.tooltips?.title && (
				<Tooltip
					content={{
						title: i10n?.tooltips?.title || '',
						description: i10n?.tooltips?.description || ''
					}}
				>
					<VSCodeButton appearance='icon'>
						<Info />
					</VSCodeButton>
				</Tooltip>
			)}
		</div>
	);
}
