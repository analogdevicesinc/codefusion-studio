/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {useState} from 'react';
import CfsTopBar from '@common/components/cfs-top-bar/CfsTopBar';
import TopbarButton from '@common/components/cfs-top-bar/TopbarButton';
import {Modal} from '@common/components/modal/Modal';
import Help from '@common/icons/Help';
import {Direction} from '@common/components/tooltip/Tooltip';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {LocalizedMessage as t} from '@common/components/l10n/LocalizedMessage';

export default function PackageManagerHeader() {
	const [isHelpModalOpen, setIsHelpModalOpen] =
		useState<boolean>(false);
	const l10n = useLocaleContext()?.header;

	const onToggleHelpModal = () => {
		setIsHelpModalOpen(prev => !prev);
	};

	return (
		<CfsTopBar>
			<div slot='center'>{l10n?.title}</div>

			<div slot='end'>
				<TopbarButton
					title={l10n?.helpButton}
					icon={<Help />}
					tooltipType='long'
					tooltipDirection={Direction.Left}
					clickHandler={onToggleHelpModal}
				/>
			</div>

			<div slot='modal'>
				<Modal
					isOpen={isHelpModalOpen}
					handleModalClose={onToggleHelpModal}
					titleId='packman-help-modal-title'
					title={l10n?.helpModalTitle}
				>
					{t({
						parseHtml: true,
						id: 'header.helpModalBody'
					})}
				</Modal>
			</div>
		</CfsTopBar>
	);
}
