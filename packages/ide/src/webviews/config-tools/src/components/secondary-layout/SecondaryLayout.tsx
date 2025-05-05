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
import styles from './SecondaryLayout.module.scss';

type LayoutProps = {
	readonly header?: React.ReactNode;
	readonly body?: React.ReactNode;
	readonly variant?: 'default' | 'low-density';
};

export default function SingleColumnLayout({
	header,
	body,
	variant = 'default'
}: LayoutProps) {
	return (
		<section className={`${styles.container} ${styles[variant]}`}>
			<div
				className={`${styles.header} ${header ? '' : ` ${styles.empty}`}`}
			>
				{header}
			</div>
			{body}
		</section>
	);
}
