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

import {forwardRef} from 'react';

import styles from './timestamp-label.module.scss';

type TimestampLabelProps = Readonly<{
	text: string;
	left: number;
	top: number;
	dataTest: string;
}>;

const TimestampLabel = forwardRef<
	HTMLDivElement,
	TimestampLabelProps
>(({text, left, top, dataTest}, ref) => (
	<div
		ref={ref}
		className={styles.timestampLabel}
		style={{left, top}}
		data-test={dataTest}
	>
		{text}
	</div>
));

export default TimestampLabel;
