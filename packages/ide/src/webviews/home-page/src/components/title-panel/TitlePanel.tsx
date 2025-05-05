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

import {useEffect, useState} from 'react';

import './title-panel.scss';
import {request} from '../../../../common/api';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';
import {CheckBox} from 'cfs-react-library';

export type Message = {
	command: string;
	data: boolean;
};

export function TitlePanel() {
	const l10n: TLocaleContext | undefined = useLocaleContext();

	const [isChecked, setIsChecked] = useState<boolean>(true);

	const messageHandler = (event: MessageEvent<Message>) => {
		if (event.data.command === 'setCheckboxState') {
			setIsChecked(event.data.data);
		}
	};

	useEffect(() => {
		request('requestHomePageCheckboxState').catch(console.error);

		window.addEventListener('message', messageHandler);
	}, []);

	const handleCheckboxChange = (event: any) => {
		const newState: boolean = event.target.checked;
		setIsChecked(newState);
		request('showHomePageAtStartupCheckbox', {data: newState}).catch(
			console.error
		);
	};

	return (
		<div className='title-frame'>
			<div className='title-text'>{l10n?.title?.welcome?.title}</div>
			<div className='checkbox-frame'>
				<div className='checkbox-layer'>
					<CheckBox
						checked={isChecked}
						className='checkbox'
						onChange={handleCheckboxChange}
					/>
					<div className='checkbox-text'>
						{l10n?.title?.showAtStartup?.title}
					</div>
				</div>
			</div>
		</div>
	);
}
