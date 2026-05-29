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
import {Button, CloseIcon} from 'cfs-react-library';
import styles from './side-panel.module.scss';

export type SidepanelProps = React.PropsWithChildren<{
	title: string;
	isOpen: boolean;
	className?: string;
	onClose?: () => void;
}>;

export function SidePanel({
	title,
	isOpen,
	className,
	onClose,
	children
}: SidepanelProps) {
	return (
		<div
			className={`${styles.sidepanelContainer} ${isOpen ? styles.open : styles.closed} ${className ?? ''}`}
		>
			<div className={styles.header}>
				<h2>{title}</h2>
				<Button appearance='icon' onClick={onClose}>
					<CloseIcon />
				</Button>
			</div>
			<div className={styles.body}>{children}</div>
		</div>
	);
}
