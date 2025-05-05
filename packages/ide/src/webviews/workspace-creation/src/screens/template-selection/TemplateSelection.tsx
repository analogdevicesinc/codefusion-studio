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

import {Suspense, useMemo} from 'react';
import WorkspaceCreationLayout from '../../common/components/WorkspaceCreationLayout';
import TemplateSelectionContainer from './TemplateSelectionContainer';
import {ProgressRing} from 'cfs-react-library';
import {generateMulticoreTemplatesPromise} from '../../utils/api';
import {
	useSelectedBoardPackage,
	useSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.selector';

function TemplateSelection() {
	const selectedSoc = useSelectedSoc();
	const {packageId, boardId} = useSelectedBoardPackage();

	const templateListPromise = useMemo(
		async () =>
			generateMulticoreTemplatesPromise(
				selectedSoc,
				packageId,
				boardId
			),
		[packageId, selectedSoc, boardId]
	);

	return (
		<WorkspaceCreationLayout
			title='Browse templates'
			description='Choose a template for your selected SoC'
		>
			<Suspense fallback={<ProgressRing />}>
				<TemplateSelectionContainer
					templateListPromise={templateListPromise}
				/>
			</Suspense>
		</WorkspaceCreationLayout>
	);
}

export default TemplateSelection;
