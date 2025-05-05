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

import {request} from '../../../../common/api';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';
import {WalkthroughIcon} from './icons';

import './walkthrough.scss';

export function Walkthrough() {
	const l10n: TLocaleContext | undefined = useLocaleContext();

	const openWalkthrough = () => {
		request('openWalkthrough').catch(console.error);
	};

	return (
		<div className='walkthrough-frame'>
			<div className='walkthrough-title'>
				{l10n?.walkthrough?.title}
			</div>
			<div className='walkthrough-contentbox'>
				<div
					className='walkthrough-textbox-frame'
					onClick={openWalkthrough}
				>
					<div className='walkthrough-textbox-layer-two'>
						<div className='walkthrough-logo'>
							<WalkthroughIcon />
						</div>
						<div className='walkthrough-textbox'>
							<h3 className='walkthrough-textbox-title'>
								{l10n?.walkthrough?.getStarted?.title}
							</h3>
							<div className='walkthrough-textbox-text'>
								{l10n?.walkthrough?.setup?.title}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
