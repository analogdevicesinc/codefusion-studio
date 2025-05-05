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
/* eslint-disable new-cap */
import {useActiveScreen} from '../../state/slices/app-context/appContext.selector';
import CfsTopBar from '@common/components/cfs-top-bar/CfsTopBar';
import {Modal} from '@common/components/modal/Modal';
import Help from '@common/icons/Help';
import {type NavigationItem} from '@common/types/navigation';
import {LocalizedMessage} from '@common/components/l10n/LocalizedMessage';
import TopbarButton from '@common/components/cfs-top-bar/TopbarButton';
import {Direction} from '@common/components/tooltip/Tooltip';
import {useState} from 'react';

export default function CfgtoolsHeader() {
	const [isHelpModalOpen, setIsHelpModalOpen] =
		useState<boolean>(false);

	const onToggleHelpModal = () => {
		setIsHelpModalOpen(prev => !prev);
	};

	const id = useActiveScreen() as NavigationItem;

	return (
		<CfsTopBar>
			<div slot='end'>
				<TopbarButton
					title={LocalizedMessage({id: `${id}.help.title`}) as string}
					icon={<Help />}
					tooltipType='long'
					tooltipDirection={Direction.Left}
					clickHandler={onToggleHelpModal}
				/>
			</div>
			<div slot='center'>{LocalizedMessage({id: `${id}.title`})}</div>

			<div slot='modal'>
				<Modal
					isOpen={isHelpModalOpen}
					handleModalClose={onToggleHelpModal}
				>
					<div style={{textAlign: 'left'}}>
						<h1>
							<LocalizedMessage id={`${id}.help.title`} />
						</h1>
						<LocalizedMessage parseHtml id={`${id}.description`} />
					</div>
				</Modal>
			</div>
		</CfsTopBar>
	);
}
