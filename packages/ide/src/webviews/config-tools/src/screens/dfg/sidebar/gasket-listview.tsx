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

import {Button} from 'cfs-react-library';
import {useState} from 'react';

import type {DFGStream} from 'cfs-plugins-api';
import Accordion from '../../../../../common/components/accordion/Accordion';
import PlusIcon from '../../../../../common/components/icons/PlusIcon';
import SmallSettingsIcon from '../../../../../common/components/icons/SamllSettingsIcon';
import SmallArrowRightIcon from '../../../../../common/components/icons/SmallArrowRightIcon';
import ConflictIcon from '../../../../../common/icons/Conflict';
import type {Gasket} from '../../../../../common/types/soc';
import {
	setEditingStream,
	setHoveredStream,
	setSelectedGaskets,
	setSelectedStreams
} from '../../../state/slices/gaskets/gasket.reducer';
import {
	useGasketErrors,
	useGasketInputStreamMap,
	useGasketOutputStreamMap,
	useStreamErrors
} from '../../../state/slices/gaskets/gasket.selector';
import {useAppDispatch} from '../../../state/store';
import {useFilteredStreams} from '../hooks/useFilteredStreams';
import styles from './stream-sidebar.module.scss';

type StreamListViewProps = {
	readonly stream: DFGStream;
	readonly type: 'inbound' | 'outbound';
};

function StreamListView({stream, type}: StreamListViewProps) {
	const dispatch = useAppDispatch();

	const streamErrors = useStreamErrors();
	const errors = streamErrors[stream.StreamId] ?? [];

	const handleClick = () => {
		dispatch(setEditingStream(stream));
		dispatch(setSelectedStreams([stream]));
		dispatch(
			setSelectedGaskets([
				stream.Source.Gasket,
				...stream.Destinations.map(d => d.Gasket)
			])
		);
	};

	const handleMouseEnter = () => {
		dispatch(setHoveredStream(stream));
	};

	const handleMouseLeave = () => {
		dispatch(setHoveredStream(undefined));
	};

	return (
		<div
			className={styles.streamListItem}
			data-test={`stream-${type}-${stream.StreamId}`}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{type === 'outbound' && <SmallArrowRightIcon />}
			<h5>
				{type === 'inbound'
					? stream.Source.Gasket
					: stream.Destinations.map(d => d.Gasket).join(', ')}
			</h5>
			{type === 'inbound' && <SmallArrowRightIcon />}
			<span className={styles.streamListItemDescription}>
				{stream.Description}
			</span>
			<Button
				appearance='icon'
				className={styles.streamListItemButton}
				onClick={handleClick}
			>
				<SmallSettingsIcon />
			</Button>
			{errors.length > 0 ? (
				<div
					data-test={`stream-${type}-${stream.StreamId}-error`}
					id={`stream-${type}-${stream.StreamId}-error`}
					className={styles.streamErrorIcon}
				>
					<ConflictIcon width='16' height='16' />
				</div>
			) : (
				<div className={styles.streamErrorIconPlaceholder} />
			)}
		</div>
	);
}

export type SubsystemListViewProps = {
	readonly gasket: Gasket;
};

export function GasketListView({gasket}: SubsystemListViewProps) {
	const [expanded, setExpanded] = useState<boolean>(false);
	const allInboundStreams =
		useGasketInputStreamMap()[gasket.Name] || [];
	const allOutboundStreams =
		useGasketOutputStreamMap()[gasket.Name] || [];

	// Apply search filtering to streams
	const inboundStreams = useFilteredStreams(allInboundStreams);
	const outboundStreams = useFilteredStreams(allOutboundStreams);

	const canHaveInboundStreams =
		gasket.InputStreams.length > allInboundStreams.length;
	const canHaveOutboundStreams =
		gasket.OutputStreams.length > allOutboundStreams.length;
	const dispatch = useAppDispatch();
	const gasketErrors = useGasketErrors();
	const hasErrors = gasketErrors[gasket.Name]?.length > 0;
	const streamErrors = useStreamErrors();

	/**
	 * If the gasket has an I/O stream with errors, the error propagates to the gasket
	 * Check all streams, not just filtered ones, for errors
	 */
	const hasStreamErrors =
		allInboundStreams.some(
			stream => streamErrors[stream.StreamId]?.length > 0
		) ||
		allOutboundStreams.some(
			stream => streamErrors[stream.StreamId]?.length > 0
		);

	return (
		<Accordion
			key={gasket.Name}
			title={gasket.Name}
			icon={
				hasErrors || hasStreamErrors ? (
					<div
						data-test={`gasket-${gasket.Name}-error`}
						id={`gasket-${gasket.Name}-error`}
						className={styles.streamErrorIcon}
						style={{
							paddingRight: '10px'
						}}
					>
						<ConflictIcon />
					</div>
				) : undefined
			}
			caption={
				<div className={styles.inOutDisplay}>
					<div
						className={styles.inOutBubble}
						data-test={`inbound-streams-${gasket.Name}`}
					>
						<span>
							<SmallArrowRightIcon />
						</span>
						{inboundStreams.length !== allInboundStreams.length
							? `${inboundStreams.length}/${allInboundStreams.length}`
							: inboundStreams.length}
					</div>
					<div
						className={styles.inOutBubble}
						data-test={`outbound-streams-${gasket.Name}`}
					>
						{outboundStreams.length !== allOutboundStreams.length
							? `${outboundStreams.length}/${allOutboundStreams.length}`
							: outboundStreams.length}
						<span>
							<SmallArrowRightIcon />
						</span>
					</div>
				</div>
			}
			isOpen={expanded}
			toggleExpand={() => {
				setExpanded(!expanded);
			}}
			data-test={`accordion-toggle:${gasket.Name}`}
			body={
				<div className={styles.streamList}>
					<div
						className={styles.sectionTitle}
						data-test={`inbound-stream-header-${gasket.Name}`}
					>
						<h5>INBOUND</h5>
						<Button
							disabled={!canHaveInboundStreams}
							appearance='icon'
							onClick={() => {
								dispatch(
									setEditingStream({
										Destinations: [
											{
												Gasket: gasket.Name,
												Index: 0,
												BufferSize: 0,
												BufferAddress: 0
											}
										]
									})
								);
							}}
						>
							<PlusIcon />
						</Button>
					</div>
					{inboundStreams.map(stream => (
						<StreamListView
							key={stream.StreamId}
							stream={stream}
							type='inbound'
						/>
					))}
					<div
						className={styles.sectionTitle}
						data-test={`outbound-stream-header-${gasket.Name}`}
					>
						<h5>OUTBOUND</h5>
						<Button
							data-test={`add-outbound-stream-${gasket.Name}`}
							disabled={!canHaveOutboundStreams}
							appearance='icon'
							onClick={() => {
								dispatch(
									setEditingStream({
										Source: {
											Gasket: gasket.Name,
											Index: 0,
											BufferSize: 0,
											BufferAddress: 0
										}
									})
								);
							}}
						>
							<PlusIcon />
						</Button>
					</div>
					{outboundStreams.map(stream => (
						<StreamListView
							key={stream.StreamId}
							stream={stream}
							type='outbound'
						/>
					))}
				</div>
			}
		/>
	);
}
