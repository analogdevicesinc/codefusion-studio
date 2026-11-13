/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import type {
	TSegment,
	TSection
} from '../../../../common/types/memory-layout';

import styles from './BackButton.module.scss';
import {useLocaleContext} from '../../../../../../common/contexts/LocaleContext';

type TMemoryBackButtonProps = {
	readonly layer: number;
	readonly data: TSegment | TSection | undefined;
	readonly onClick: (layer?: any) => void;
};

export default function MemoryBackButton({
	layer,
	data,
	onClick
}: TMemoryBackButtonProps) {
	const l10n = useLocaleContext()?.memoryLayout as
		| Record<string, string>
		| undefined;

	return (
		<ol className={styles.breadcrumbs}>
			{layer === 1 && <li>{l10n?.segments ?? 'Segments'}</li>}
			{layer === 2 && (
				<>
					<li>
						<button
							type='button'
							className={styles.button}
							onClick={() => {
								onClick(layer);
							}}
						>
							{data && (l10n?.segments ?? 'Segments')}
						</button>
					</li>
					<li>
						<span>{l10n?.sections ?? 'Sections'}</span>
					</li>
				</>
			)}
			{layer === 3 && (
				<>
					<li>
						<button
							type='button'
							className={styles.button}
							onClick={() => {
								onClick(1);
							}}
						>
							{data && (l10n?.segments ?? 'Segments')}
						</button>
					</li>
					<li>
						<button
							type='button'
							className={styles.button}
							onClick={() => {
								onClick(layer);
							}}
						>
							{data && (l10n?.sections ?? 'Sections')}
						</button>
					</li>
					<li>
						<span>{l10n?.symbols ?? 'Symbols'}</span>
					</li>
				</>
			)}
		</ol>
	);
}
