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

// Components
import CfsTopBar from '@common/components/cfs-top-bar/CfsTopBar';
import {useState} from 'react';
import {Modal} from '../../../../common/components/modal/Modal';
import TopbarButton from '../../../../common/components/cfs-top-bar/TopbarButton';
import Help from '../../../../common/icons/Help';
import {Direction} from '../../../../common/components/tooltip/Tooltip';
import {useActiveScreen} from '../../state/slices/app-context/appContext.selector';
import {LocalizedMessage as t} from '../../../../common/components/l10n/LocalizedMessage';

export default function WrkspHeader() {
	const [isHelpModalOpen, setIsHelpModalOpen] =
		useState<boolean>(false);

	const onToggleHelpModal = () => {
		setIsHelpModalOpen(prev => !prev);
	};

	const id = useActiveScreen();

	return (
		<CfsTopBar>
			<div slot='end'>
				<TopbarButton
					title={
						t({
							id: `${id}.help.title`
						}) as unknown as string
					}
					icon={<Help />}
					tooltipType='long'
					tooltipDirection={Direction.Left}
					clickHandler={onToggleHelpModal}
				/>
			</div>
			<div slot='center'>CFS Workspace Creation</div>
			<div slot='modal'>
				<Modal
					isOpen={isHelpModalOpen}
					handleModalClose={onToggleHelpModal}
				>
					<div style={{textAlign: 'left'}}>
						<h1>{t({id: `${id}.help.title`})}</h1>
						{t({id: `${id}.description`, parseHtml: true})}
					</div>
				</Modal>
			</div>
		</CfsTopBar>
	);
}
