/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import {memo} from 'react';
import {Button, ChevronLeftIcon} from 'cfs-react-library';
import ChevronRight from '@common/icons/ChevronRight';

import styles from './timeline-diagram.module.scss';

function TimelineFooterPanButton({
	isDisabled,
	direction,
	onClick
}: Readonly<{
	isDisabled: boolean;
	direction: 'left' | 'right';
	onClick: () => void;
}>) {
	return (
		<Button
			type='button'
			appearance='icon'
			disabled={isDisabled}
			className={styles.panButton}
			onClick={onClick}
		>
			{direction === 'left' ? <ChevronLeftIcon /> : <ChevronRight />}
		</Button>
	);
}

export default memo(TimelineFooterPanButton);
