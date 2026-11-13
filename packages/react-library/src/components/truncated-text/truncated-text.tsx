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

import styles from './truncated-text.module.scss';

export type TruncationSide = 'left' | 'right';

type TruncatedTextProps = {
	readonly children: string | number;
	readonly side?: TruncationSide;
	readonly className?: string;
	readonly dataTest?: string;
	readonly title?: string;
};

export function TruncatedText({
	children,
	side = 'right',
	className,
	dataTest,
	title
}: TruncatedTextProps) {
	const classNames = [
		styles.truncate,
		side === 'left' ? styles.truncateLeft : '',
		className ?? ''
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classNames} title={title} data-test={dataTest}>
			{side === 'left' ? <span dir='ltr'>{children}</span> : children}
		</div>
	);
}
