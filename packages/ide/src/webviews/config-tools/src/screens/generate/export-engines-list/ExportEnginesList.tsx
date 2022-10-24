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
import RadioSelectionBox from '@common/components/radio-selection-box/RadioSelectionBox';
import type {ExportEngine} from '@common/types/engines';
import {VSCodeProgressRing} from '@vscode/webview-ui-toolkit/react';

function ExportEnginesList({
	engines,
	activeEngine,
	handleEngineSelection
}: {
	readonly engines: ExportEngine[] | undefined;
	readonly activeEngine: string;
	readonly handleEngineSelection: (
		e: Event | React.FormEvent<HTMLElement>
	) => void;
}) {
	if (engines === undefined) return <VSCodeProgressRing />;

	return (
		<>
			{engines.map(engine => (
				<RadioSelectionBox
					key={`export-engine-${engine.name}`}
					id={engine.name}
					label={engine.label}
					description={engine.description}
					additionalInfo={`Version: ${engine.version}`}
					isActive={activeEngine === engine.name}
					onSelection={handleEngineSelection}
				/>
			))}
		</>
	);
}

export default ExportEnginesList;
