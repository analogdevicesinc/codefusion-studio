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
import {TextField} from 'cfs-react-library';
import {useCallback, useMemo, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../../state/store';
import {fetchMemoryData} from '../../../state/slices/memory/memory.reducer';
import {setTargetAddress} from '../../../state/slices/app-context/app-context.reducer';
import {
	useActiveSession,
	useDebugSessions,
	useHaltedSessions,
	useMemoryMetadata
} from '../../../state/slices/memory/memory.selector';
import FloatingError from '../../floating-error/floating-error';
import styles from './address-input.module.scss';
import {type DebugSessionInfo} from '../../../types/debug';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {INITIAL_DATA_SIZE} from '../../../constants/data-read';

enum AddressInputError {
	InvalidAddress = 'invalidAddress',
	NoActiveSessions = 'noSessions',
	NotHalted = 'notHalted',
	LoadingData = 'loadingData',
	ReadFailed = 'readFailed'
}

export default function AddressInput() {
	const dispatch = useAppDispatch();
	const {address: startAddress, length: memoryLength} =
		useMemoryMetadata();
	const debugSessions: DebugSessionInfo[] = useDebugSessions();
	const haltedSessions = useHaltedSessions();
	const activeSession = useActiveSession();
	const [error, setError] = useState<string | undefined>(undefined);
	const [addressInput, setAddressInput] = useState<string>('');
	const l10n = useLocaleContext();
	const isLoading = useAppSelector(
		state => state.memoryReducer.loading
	);
	const isDisabled = useMemo(
		() => debugSessions.length === 0,
		[debugSessions.length]
	);

	const goToAddress = useCallback(
		(value: string) => {
			let parsedAddress;
			const strippedValue = value.trim();

			if (/^0[xX][0-9a-fA-F]+$/.test(strippedValue)) {
				parsedAddress = parseInt(strippedValue, 16);
			} else if (/^\d+$/.test(strippedValue)) {
				parsedAddress = parseInt(strippedValue, 10);
			}

			if (
				parsedAddress === undefined ||
				isNaN(parsedAddress) ||
				parsedAddress < 0
			) {
				setError(AddressInputError.InvalidAddress);

				return;
			}

			if (
				startAddress !== undefined &&
				parsedAddress >= startAddress &&
				parsedAddress < startAddress + memoryLength &&
				!isLoading
			) {
				setError(undefined);
				dispatch(setTargetAddress(parsedAddress));
			} else if (debugSessions.length === 0) {
				setError(AddressInputError.NoActiveSessions);
			} else if (debugSessions.every(session => session.isRunning)) {
				setError(AddressInputError.NotHalted);
			} else if (isLoading) {
				setError(AddressInputError.LoadingData);
			} else {
				setError(undefined);
				dispatch(
					fetchMemoryData({
						sessionId:
							activeSession && !activeSession?.isRunning
								? activeSession.sessionId
								: haltedSessions[0]?.sessionId,
						address: parsedAddress,
						length: INITIAL_DATA_SIZE
					})
				)
					.unwrap()
					.catch(() => {
						setError(AddressInputError.ReadFailed);
					});
			}
		},
		[
			dispatch,
			debugSessions,
			haltedSessions,
			memoryLength,
			startAddress,
			isLoading,
			activeSession
		]
	);

	return (
		<div className={styles.container}>
			<TextField
				placeholder={l10n?.toolbar.addressInput?.placeholder}
				inputVal={addressInput}
				size='small'
				dataTest='address'
				status={error ? 'error' : 'normal'}
				isDisabled={isDisabled}
				onInputChange={value => {
					setAddressInput(value);
				}}
				onKeyUp={e => {
					if (e.key === 'Enter') {
						goToAddress(addressInput);
					} else if (error) {
						setError(undefined);
					}
				}}
			/>
			{error && (
				<FloatingError
					dataTest={`address-error-${error}`}
					value={l10n?.addressError?.[error]}
				/>
			)}
		</div>
	);
}
