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

import {Button, Card, DeleteIcon, Tooltip} from 'cfs-react-library';
import styles from './key-card.module.scss';

type KeyCardProps = {
	readonly name: string;
	readonly path: string;
	readonly algorithm: string;
	readonly description?: string;
	readonly onDelete?: () => void;
};

function KeyCard({
	name,
	path,
	algorithm,
	description,
	onDelete
}: KeyCardProps) {
	return (
		<Card
			interactive={false}
			testId={`key-management:key-card-${name}`}
		>
			<div className={styles.keyCardContent}>
				<div className={styles.cardBody}>
					<div className={styles.title}>{name}</div>
					<div className={styles.subtitle}>
						<span>File path: {path}</span>
						{algorithm && <span>Algorithm: {algorithm}</span>}
						{description && <span>{description}</span>}
					</div>
				</div>
				<div className={styles.endSlot}>
					<Tooltip
						title='Delete Key'
						type='long'
						width={60}
						position='bottom'
					>
						<Button
							appearance='icon'
							dataTest={`key-management:key-card-${name}-delete`}
							onClick={onDelete}
						>
							<DeleteIcon />
						</Button>
					</Tooltip>
				</div>
			</div>
		</Card>
	);
}

export default KeyCard;
