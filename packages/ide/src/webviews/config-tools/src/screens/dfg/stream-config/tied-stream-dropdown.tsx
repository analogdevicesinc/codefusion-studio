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

import {type DFGStream} from 'cfs-plugins-api';
import {CustomizableDropdown} from 'cfs-react-library';
import {useMemo, useState} from 'react';
import {useStreams} from '../../../state/slices/gaskets/gasket.selector';
import styles from './tied-stream-dropdown.module.scss';

export type TiedStreamDropdownProps = {
	readonly stream: DFGStream;
	readonly gasketName: string;
	readonly onChange?: (stream: DFGStream) => void;
};

export function TiedStreamDropdown({
	stream,
	gasketName,
	onChange
}: TiedStreamDropdownProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const streams = useStreams();

	const selectableStreams = useMemo(
		() =>
			streams.filter(s =>
				s.Destinations.some(d => d.Gasket === gasketName)
			),
		[streams, gasketName]
	);

	const tiedStreams = useMemo(() => {
		const outputStreams = streams.filter(
			s => s.Source.Gasket === gasketName
		);

		return selectableStreams.filter(s =>
			outputStreams.some(
				o =>
					o.Source.Index ===
					s.Destinations.find(d => d.Gasket === gasketName)?.Index
			)
		);
	}, [streams, selectableStreams, gasketName]);

	const tiedSourceStream = selectableStreams.find(s =>
		s.Destinations.some(
			d =>
				d.Gasket === gasketName &&
				d.Index === stream.Source.Index &&
				stream.StreamId > 0
		)
	);

	return (
		<CustomizableDropdown
			isExpanded={isExpanded}
			setIsExpanded={setIsExpanded}
			dataTest='tied-stream-dropdown'
			value={
				tiedSourceStream
					? `${tiedSourceStream.Source.Gasket} \u2192 #${tiedSourceStream?.StreamId} ${tiedSourceStream?.Description}`
					: ''
			}
		>
			<div className={styles.dropdownContent}>
				{selectableStreams.map(stream => {
					const disabled = tiedStreams.includes(stream);

					return (
						<div
							key={stream.StreamId}
							className={`${styles.dropdownOption} ${disabled ? styles.disabled : ''}`}
							data-test={`tied-stream-option-${stream.StreamId}`}
							onClick={() => {
								if (!disabled) {
									onChange?.(stream);
									setIsExpanded(false);
								}
							}}
						>
							<span>
								{stream.Source.Gasket} {'\u2192'}
							</span>
							<span className={styles.description}>
								#{stream.StreamId} {stream.Description}
							</span>
						</div>
					);
				})}
			</div>
		</CustomizableDropdown>
	);
}
