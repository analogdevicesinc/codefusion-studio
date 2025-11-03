/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import CfsTopBar from '@common/components/cfs-top-bar/CfsTopBar';
import {Modal} from '@common/components/modal/Modal';
import Help from '@common/icons/Help';
import TopbarButton from '@common/components/cfs-top-bar/TopbarButton';
import {Direction} from '@common/components/tooltip/Tooltip';
import {useState} from 'react';
import {type TLocaleContext} from '../../../../common/types/l10n';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import {LocalizedMessage as t} from '../../../../common/components/l10n/LocalizedMessage';
import {
	GlobeIcon,
	EngineerZoneIcon,
	GitHubIcon,
	MailIcon
} from '../top-panel/icons';

export default function HomepageHeader() {
	const [isHelpModalOpen, setIsHelpModalOpen] =
		useState<boolean>(false);

	const onToggleHelpModal = () => {
		setIsHelpModalOpen(prev => !prev);
	};

	const l10n: TLocaleContext | undefined = useLocaleContext();

	return (
		<CfsTopBar>
			<div slot='end'>
				<a href='https://developer.analog.com/docs/codefusion-studio/latest/'>
					<TopbarButton
						title={l10n?.onlineHelp?.title}
						icon={<GlobeIcon />}
						tooltipType='long'
						tooltipDirection={Direction.Left}
						variant='startingRadius'
					/>
				</a>
				<a href='https://ez.analog.com/'>
					<TopbarButton
						title={l10n?.engineerZone?.title}
						icon={<EngineerZoneIcon />}
						tooltipType='long'
						tooltipDirection={Direction.Left}
						variant='square'
					/>
				</a>
				<a href='https://support.analog.com/en-US/technical-support/create-case-techsupport'>
					<TopbarButton
						title={l10n?.techSupport?.title}
						icon={<MailIcon />}
						tooltipType='long'
						tooltipDirection={Direction.Left}
						variant='square'
					/>
				</a>
				<a href='https://github.com/analogdevicesinc/codefusion-studio'>
					<TopbarButton
						title={l10n?.github?.title}
						icon={<GitHubIcon />}
						tooltipType='long'
						tooltipDirection={Direction.Left}
						variant='endingRadius'
					/>
				</a>
				<div style={{marginLeft: '8px', display: 'inline-block'}}>
					<TopbarButton
						title={l10n?.help?.title}
						icon={<Help />}
						tooltipType='long'
						tooltipDirection={Direction.Left}
						clickHandler={onToggleHelpModal}
					/>
				</div>
			</div>
			<div slot='center'>{l10n?.header?.title}</div>

			<div slot='modal'>
				<Modal
					isOpen={isHelpModalOpen}
					handleModalClose={onToggleHelpModal}
				>
					<div style={{textAlign: 'left'}}>
						<h1>
							{t({
								id: `${l10n?.help?.title}`
							})}
						</h1>
						{t({
							id: `${l10n?.help?.description}`,
							parseHtml: true
						})}
					</div>
				</Modal>
			</div>
		</CfsTopBar>
	);
}
