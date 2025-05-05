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
import type {ExportEngine} from '@common/types/engines';
import CfsSelectionCard from '../../../../../common/components/cfs-selection-card/CfsSelectionCard';
import {ProgressRing, Radio} from 'cfs-react-library';

import styles from './ExportEnginesList.module.scss';

function ExportEnginesList({
	engines,
	activeEngine,
	handleEngineSelection
}: {
	readonly engines: ExportEngine[] | undefined;
	readonly activeEngine: string;
	readonly handleEngineSelection: (selectedId: string) => void;
}) {
	if (engines === undefined) return <ProgressRing />;

	return (
		<>
			{engines.map(engine => (
				<CfsSelectionCard
					key={`export-engine-${engine.name}`}
					id={engine.name}
					isChecked={engine.name === activeEngine}
					onChange={(id: string) => {
						handleEngineSelection(id);
					}}
				>
					<div slot='start'>
						<Radio checked={engine.name === activeEngine} />
					</div>
					<div slot='title'>
						<h3 className={styles['cfs-radio-title']}>
							{engine.label ?? engine.name}
						</h3>
						<p title={engine.description}>{engine.description}</p>
					</div>
					<div slot='end'>Version: {engine.version}</div>
				</CfsSelectionCard>
			))}
		</>
	);
}

export default ExportEnginesList;
