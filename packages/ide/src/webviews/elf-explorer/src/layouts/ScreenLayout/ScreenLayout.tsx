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
import {Children} from 'react';
import styles from './ScreenLayout.module.scss';

type LayoutProps = {
	readonly children?: React.ReactNode;
};

/**
 *
 * @param children - a list of React components; First child in list should always be the title of the screen
 * @returns
 */
export default function ScreenLayout({children}: LayoutProps) {
	const childrenArr = Children.toArray(children);

	return (
		<section className={styles.container}>
			<div className={styles.inner}>{childrenArr}</div>
		</section>
	);
}
