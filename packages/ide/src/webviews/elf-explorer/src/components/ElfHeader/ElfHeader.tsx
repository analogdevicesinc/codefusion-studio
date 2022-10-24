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
import {useState, useCallback} from 'react';
import CfsHeaderBar from '../NavigationBar/NavigationBar';
import {Modal} from '@common/components/modal/Modal';
import Help from '@common/icons/Help';
import OpenFile from '@common/icons/OpenFile';
import styles from './Elfheader.module.scss';
import type {NavigationItem} from '../../common/types/navigation';
import {loadElfFile} from '../../common/api';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import type {TLocaleContext} from '../../common/types/context';

import {useActiveScreen} from '../../state/slices/elf-context/elfContext.selector';

export default function ElfHeader() {
	const [isHelpModalOpen, setIsHelpModalOpen] =
		useState<boolean>(false);

	const onToggleHelpModal = () => {
		setIsHelpModalOpen(prev => !prev);
	};

	const id = useActiveScreen() as NavigationItem;
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.[`${id}`];

	const handleButtonClick = useCallback(async () => {
		try {
			await loadElfFile('loadElfFile');
		} catch (error) {
			console.error(
				error instanceof Error
					? error.message
					: 'An unknown error occurred'
			);
		}
	}, []);

	return (
		<>
			<CfsHeaderBar title={i10n?.title}>
				<div slot='start'>
					<button type='button' onClick={handleButtonClick}>
						<OpenFile />
					</button>
				</div>
				<div slot='end'>
					<button type='button' onClick={onToggleHelpModal}>
						<Help />
					</button>
				</div>
			</CfsHeaderBar>

			<Modal
				isDynamicHeight
				isOpen={isHelpModalOpen}
				handleModalClose={onToggleHelpModal}
			>
				<div className={styles['help-modal']}>
					<h1>{i10n?.title}</h1>
					<div
						// eslint-disable-next-line react/no-danger
						dangerouslySetInnerHTML={{__html: i10n?.description}}
					/>
				</div>
			</Modal>
		</>
	);
}
