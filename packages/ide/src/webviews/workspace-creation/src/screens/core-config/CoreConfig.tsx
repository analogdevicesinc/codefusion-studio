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
import CoreConfigContainer from './CoreConfigContainer';
import WorkspaceCreationLayout from '../../common/components/WorkspaceCreationLayout';
import {ProgressRing} from 'cfs-react-library';
import {fetchPlugins} from '../../utils/api';
import CoreConfigHeader from './core-config-header/CoreConfigHeader';
import {
	useConfiguredCore,
	useSelectedCoreToConfigId
} from '../../state/slices/workspace-config/workspace-config.selector';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';

export default function CoreConfig() {
	const l10n: TLocaleContext | undefined = useLocaleContext();
	const pluginsPromise = useMemo(async () => fetchPlugins(), []);
	const coreId = useSelectedCoreToConfigId();
	const core = useConfiguredCore(coreId ?? '');

	return (
		<WorkspaceCreationLayout
			title={<CoreConfigHeader core={core} />}
			description={l10n?.['platform-option']?.description}
		>
			<Suspense fallback={<ProgressRing />}>
				<CoreConfigContainer pluginsPromise={pluginsPromise} />
			</Suspense>
		</WorkspaceCreationLayout>
	);
}
