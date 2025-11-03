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
import {BUCKET_ENUM} from '../../utils/table-utils';
import styles from './SectionNameWithCircle.module.scss';

type TSectionNameWithColorProps = {
	readonly value: string;
	readonly bucket: string;
	readonly align?: 'left' | 'right';
};

export default function SectionNameWithCircle({
	value,
	bucket,
	align
}: TSectionNameWithColorProps) {
	const setBucketStyling = () => {
		let classes = '';

		if (bucket === BUCKET_ENUM.TEXT)
			classes = `${styles.circle} ${styles['text-color']}`;

		if (bucket === BUCKET_ENUM.DATA)
			classes = `${styles.circle} ${styles['data-color']}`;

		if (bucket === BUCKET_ENUM.BSS)
			classes = `${styles.circle} ${styles['bss-color']}`;

		return classes;
	};

	return (
		<div
			data-test='section-name-with-circle:container'
			className={styles.container}
			style={align ? {justifyContent: align} : undefined}
		>
			<span
				data-test='section-name-with-circle:style'
				className={setBucketStyling()}
			/>
			<span className={styles.name}>{value}</span>
		</div>
	);
}
