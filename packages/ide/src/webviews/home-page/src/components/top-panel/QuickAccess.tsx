/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
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

import {VSCodeLink} from '@vscode/webview-ui-toolkit/react';

import {
	NewWorkspaceIcon,
	OpenFileIcon,
	OpenWorkspaceIcon
} from './icons';

import './quick-access.scss';
import {request} from '../../../../common/api';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';

export function QuickAccess() {
	const l10n: TLocaleContext | undefined = useLocaleContext();

	const createNewCfsWorkspace = () => {
		request('createNewCfsWorkspace').catch(console.error);
	};

	const openCfsWorkspace = () => {
		request('openCfsWorkspace').catch(console.error);
	};

	const openExistingConfigFile = () => {
		request('openExistingConfigFile').catch(console.error);
	};

	const openElfFile = () => {
		request('openElfFile').catch(console.error);
	};

	return (
		<div className='quick-access-frame'>
			<div className='quick-access-title'>
				{l10n?.quickAccess?.title}
			</div>
			<div className='quick-access-links-layout'>
				<div className='quick-access-links'>
					<VSCodeLink
						className='quick-access-text'
						onClick={createNewCfsWorkspace}
					>
						<span className='icon-link-span'>
							<NewWorkspaceIcon />
							{l10n?.quickAccess?.newWorkspace?.title}
						</span>
					</VSCodeLink>
				</div>
				<div className='quick-access-links'>
					<VSCodeLink
						className='quick-access-text'
						onClick={openCfsWorkspace}
					>
						<span className='icon-link-span'>
							<OpenWorkspaceIcon />
							{l10n?.quickAccess?.openWorkspace?.title}
						</span>
					</VSCodeLink>
				</div>
				<div className='quick-access-links'>
					<VSCodeLink
						className='quick-access-text'
						onClick={openExistingConfigFile}
					>
						<span className='icon-link-span'>
							<OpenFileIcon />
							{l10n?.quickAccess?.openConfigFile?.title}
						</span>
					</VSCodeLink>
				</div>
				<div className='quick-access-links'>
					<VSCodeLink
						className='quick-access-text'
						onClick={openElfFile}
					>
						<span className='icon-link-span'>
							<OpenFileIcon />
							{l10n?.quickAccess?.openElfFile?.title}
						</span>
					</VSCodeLink>
				</div>
			</div>
		</div>
	);
}
