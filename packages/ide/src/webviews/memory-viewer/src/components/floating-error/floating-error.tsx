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

import styles from './floating-error.module.scss';

type FloatingErrorProps = {
	readonly dataTest?: string;
	readonly value: string;
};

function FloatingError({dataTest, value}: FloatingErrorProps) {
	return (
		<div data-test={dataTest} className={styles.floatingError}>
			{value}
		</div>
	);
}

export default FloatingError;
