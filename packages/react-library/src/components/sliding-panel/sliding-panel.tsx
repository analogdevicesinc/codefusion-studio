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

import type {ReactNode} from 'react';
import CloseIcon from '../icons/close-icon';
import styles from './sliding-panel.module.scss';
import Button from '../button/button';

interface SlidingPanelProps {
	title: string | React.ReactElement;
	description?: string;
	children?: ReactNode;
	isCloseable?: boolean;
	isMinimised?: boolean;
	footer?: ReactNode;
	dataTest?: string;
	closeSlider?: () => void;
}

export const SlidingPanel = ({
	title,
	description,
	children,
	isCloseable = true,
	isMinimised = true,
	footer,
	dataTest,
	closeSlider
}: SlidingPanelProps): JSX.Element => {
	return (
		<>
			<div
				className={`${styles.container} ${isMinimised ? styles.minimised : styles.opening}`}
				data-test={dataTest}
			>
				<div className={styles.header}>
					<div className={styles.title}>
						<h2>{title}</h2>
						{isCloseable && (
							<Button appearance='icon'>
								<CloseIcon
									className={styles.closeIcon}
									onClick={closeSlider}
								/>
							</Button>
						)}
					</div>
					{description && (
						<div className={styles.description}>{description}</div>
					)}
				</div>
				{children && <div className={styles.content}>{children}</div>}
				{footer && <div className={styles.footer}>{footer}</div>}
			</div>
		</>
	);
};
