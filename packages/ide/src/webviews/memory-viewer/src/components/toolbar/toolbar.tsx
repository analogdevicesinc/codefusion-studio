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

import {useMemo} from 'react';
import {
	Badge,
	Button,
	CopyIcon,
	RefreshIcon
} from 'cfs-react-library';
import styles from './toolbar.module.scss';
import Tooltip from '../../../../common/components/tooltip/Tooltip';
import {stripWhiteSpaceFromText} from '../../utils/clipboard-formatting';
import {useAppDispatch} from '../../state/store';
import {fetchMemoryData} from '../../state/slices/memory/memory.reducer';
import {
	useActiveSession,
	useHaltedSessions,
	useMemoryMetadata
} from '../../state/slices/memory/memory.selector';
import AddressInput from './address-input/address-input';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';

export default function Toolbar() {
	const l10n = useLocaleContext()?.toolbar;
	const dispatch = useAppDispatch();
	const {address: startAddress, length: memoryLength} =
		useMemoryMetadata();
	const haltedSessions = useHaltedSessions();
	const activeSession = useActiveSession();
	const isCopyDisabled = useMemo(
		() => memoryLength === 0,
		[memoryLength]
	);
	const isRefreshDisabled = useMemo(
		() =>
			haltedSessions.length === 0 ||
			startAddress === undefined ||
			memoryLength === 0,
		[haltedSessions.length, startAddress, memoryLength]
	);

	const copyContent = async () => {
		const content = window.getSelection()?.toString() ?? '';
		await navigator.clipboard.writeText(
			stripWhiteSpaceFromText(content)
		);
	};

	const refreshContent = () => {
		if (
			haltedSessions.length !== 0 &&
			startAddress !== undefined &&
			memoryLength > 0
		) {
			void dispatch(
				fetchMemoryData({
					sessionId:
						activeSession && !activeSession?.isRunning
							? activeSession.sessionId
							: haltedSessions[0]?.sessionId,
					address: startAddress,
					length: memoryLength
				})
			);
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.controls}>
				<div className={styles.textField}>
					<AddressInput />
				</div>
				<div className={styles.buttonGroup}>
					<Tooltip title={l10n?.controls?.copy}>
						<Button
							appearance='icon'
							className={styles.button}
							disabled={isCopyDisabled}
							onClick={() => {
								void copyContent();
							}}
						>
							<CopyIcon />
						</Button>
					</Tooltip>
					<Tooltip title={l10n?.controls?.refresh}>
						<Button
							appearance='icon'
							className={styles.button}
							dataTest='refresh-button'
							disabled={isRefreshDisabled}
							onClick={refreshContent}
						>
							<RefreshIcon />
						</Button>
					</Tooltip>
				</div>
			</div>
			<div className={styles.controls}>
				{activeSession && (
					<>
						<div className={styles.sessionStatus}>
							<div className={styles.label}>
								{l10n?.status?.session}:
							</div>
							<div
								title={activeSession?.name}
								className={styles.value}
							>
								{activeSession?.name}
							</div>
						</div>
						<div
							className={`${styles.tag} ${activeSession.isLive ? '' : styles.postMortem}`}
						>
							{activeSession.isLive
								? l10n?.status?.live
								: l10n?.status?.postMortem}
						</div>
						<Badge appearance='secondary' size='small'>
							{activeSession.isRunning
								? l10n?.status?.stale
								: l10n?.status?.halted}
						</Badge>
					</>
				)}
			</div>
		</div>
	);
}
