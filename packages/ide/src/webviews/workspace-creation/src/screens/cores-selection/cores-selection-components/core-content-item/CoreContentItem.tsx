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
import styles from './CoreContentItem.module.scss';

type CompilerProps = {
	readonly label: string;
	readonly value: string | undefined;
};

export default function CoreContentItem({
	label,
	value
}: CompilerProps) {
	return (
		<>
			<span className={styles.label}>{label}:</span>
			<span className={styles.value}>
				{/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
				{value || <span>&#9472;</span>}
			</span>
		</>
	);
}
