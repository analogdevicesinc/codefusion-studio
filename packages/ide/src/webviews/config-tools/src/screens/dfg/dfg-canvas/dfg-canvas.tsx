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

import type React from 'react';
import {
	useGasketErrors,
	useGasketOptions,
	useHoveredStream,
	useSelectedGaskets,
	useSelectedStreams,
	useStreamErrors,
	useStreams
} from '../../../state/slices/gaskets/gasket.selector';
// eslint-disable-next-line no-warning-comments
// TODO: could be a shared component
import ZoomableAreaControl from '../../../components/zoomable-area/ZoomableAreaControl';
import type {Gasket} from '../../../../../common/types/soc';
import styles from './dfg-canvas.module.scss';
import {useEffect, useState, useRef, useMemo} from 'react';
import StreamTooltip from './stream-tooltip/StreamTooltip';
import {
	setEditingGasket,
	setEditingStream,
	setHoveredStream,
	setSelectedGaskets,
	setSelectedStreams
} from '../../../state/slices/gaskets/gasket.reducer';
import {useDispatch} from 'react-redux';
import type {DFGStream, GasketConfig} from 'cfs-plugins-api';
import {
	getGasketModel,
	filterStreamsByDestinationGasket,
	streamHasDestinationGasket,
	findDestinationByGasket
} from '../../../utils/dfg';

export function DFGCanvas(): React.ReactElement {
	const gaskets = getGasketModel();
	const streams = useStreams();
	const selectedStreams = useSelectedStreams();
	const hoveredStream = useHoveredStream();
	const dispatch = useDispatch();

	const midpoint = Math.ceil(gaskets.length / 2);
	const left = gaskets.slice(0, midpoint);
	const right = gaskets.slice(midpoint);

	const [zoomLevel, setZoomLevel] = useState(1);

	const handleZoom = (zoomLevel: number) => {
		setZoomLevel(zoomLevel);
	};

	const handleContainerClick = (
		e: React.MouseEvent<HTMLDivElement>
	) => {
		dispatch(setSelectedGaskets([]));
		dispatch(setSelectedStreams([]));
		dispatch(setEditingStream(undefined));
		e.stopPropagation();
	};

	return (
		<div style={{height: '100%'}} onClick={handleContainerClick}>
			<ZoomableAreaControl onZoom={handleZoom}>
				<div
					style={{
						height: '100%',
						width: '100%',
						display: 'flex',
						alignItems: 'center'
					}}
				>
					<div
						style={{
							display: 'flex',
							padding: '40px 40px 100px 40px',
							width: '100%',
							boxSizing: 'border-box',
							height: 'fit-content'
						}}
					>
						<div
							className={`${styles.gasketContainer} ${styles.left}`}
						>
							{left.map(gasket => {
								const outStreams = streams.filter(
									s => s.Source.Gasket === gasket.Name
								);
								const inStreams = filterStreamsByDestinationGasket(
									streams,
									gasket.Name
								);

								return (
									<GasketSection
										key={gasket.Name}
										data-test={`gasket-${gasket.Name}`}
										side='left'
										gasket={gasket}
										outStreams={outStreams}
										inStreams={inStreams}
										zoomLevel={zoomLevel}
									/>
								);
							})}
						</div>
						<div
							className={`${styles.bridgeContainer}
							${hoveredStream && goesThroughBridge([hoveredStream], []) ? styles.hovered : ''}
							${selectedStreams.length > 0 && goesThroughBridge(selectedStreams, []) ? styles.selected : ''}`}
						>
							<div className={styles.bridgeLabel}>
								DFG Network-On-Chip
							</div>
						</div>
						<div
							className={`${styles.gasketContainer} ${styles.right}`}
						>
							{right.map(gasket => {
								const outStreams = streams.filter(
									s => s.Source.Gasket === gasket.Name
								);

								const inStreams = filterStreamsByDestinationGasket(
									streams,
									gasket.Name
								);

								return (
									<GasketSection
										key={gasket.Name}
										data-test={`gasket-${gasket.Name}`}
										side='right'
										gasket={gasket}
										outStreams={outStreams}
										inStreams={inStreams}
										zoomLevel={zoomLevel}
									/>
								);
							})}
						</div>
					</div>
				</div>
			</ZoomableAreaControl>
		</div>
	);
}

function GasketSection({
	gasket,
	side,
	outStreams,
	inStreams,
	zoomLevel
}: {
	readonly gasket: Gasket;
	readonly side: 'left' | 'right';
	readonly outStreams: DFGStream[];
	readonly inStreams: DFGStream[];
	readonly zoomLevel: number;
}): React.ReactElement {
	return (
		<div
			className={styles.gasketSection}
			data-test={`gasket-section-${gasket.Name}`}
		>
			{side === 'right' && (
				<GasketStreamsToBridge
					gasket={gasket}
					inStreams={inStreams}
					outStreams={outStreams}
					side='right'
				/>
			)}
			<div className={styles.gasketBoxContainer}>
				<GasketPhysicalConnections
					name={gasket.Name}
					side={side}
					streams={inStreams}
					gasket={gasket}
					connectionType='input'
					zoomLevel={zoomLevel}
				/>
				<GasketBox
					gasket={gasket}
					inStreams={inStreams}
					outStreams={outStreams}
					zoomLevel={zoomLevel}
				/>
				<GasketPhysicalConnections
					name={gasket.Name}
					side={side}
					streams={outStreams}
					gasket={gasket}
					connectionType='output'
					zoomLevel={zoomLevel}
				/>
			</div>
			{side === 'left' && (
				<GasketStreamsToBridge
					gasket={gasket}
					inStreams={inStreams}
					outStreams={outStreams}
					side='left'
				/>
			)}
		</div>
	);
}

function GasketPhysicalConnections({
	name,
	side,
	streams,
	connectionType,
	gasket,
	zoomLevel
}: {
	readonly name: string;
	readonly side: 'left' | 'right';
	readonly streams: DFGStream[];
	readonly connectionType: 'input' | 'output';
	readonly gasket: Gasket;
	readonly zoomLevel: number;
}): React.ReactElement {
	const selectedStreams = useSelectedStreams();
	const hoveredStream = useHoveredStream();

	let letThroughOnHover = false;
	let letThroughOnSelect = false;

	const orderedStreams = useMemo(() => {
		// Only do special ordering when displaying outputs of a gasket with tied streams
		if (
			connectionType === 'input' ||
			!gasket.InputAndOutputBuffersTied
		) {
			return streams.reverse();
		}

		const orderedStreams: Array<DFGStream | undefined> = [];
		streams.forEach(s => {
			orderedStreams[s.Source.Index] = s;
		});

		for (let i = 0; i < orderedStreams.length; i++) {
			if (!orderedStreams[i]) {
				orderedStreams[i] = undefined;
			}
		}

		return orderedStreams.reverse();
	}, [streams, gasket, connectionType]);

	return (
		<div
			className={`${styles.gasketPhysicalConnections} ${side === 'left' ? styles.left : styles.right}`}
		>
			{orderedStreams.map((s, i) => {
				const isHovered =
					Boolean(s) && hoveredStream?.StreamId === s!.StreamId;
				const isSelected =
					Boolean(s) &&
					selectedStreams.some(ss => ss.StreamId === s!.StreamId);

				if (!letThroughOnHover) {
					letThroughOnHover = isHovered;
				}

				if (!letThroughOnSelect) {
					letThroughOnSelect = selectedStreams.some(
						ss => ss.StreamId === s?.StreamId
					);
				}

				if (!s) {
					return (
						<EmptyPhyiscalConnection
							// There is nothing except the index to use as key for empty connections
							// eslint-disable-next-line react/no-array-index-key
							key={'empty-' + i}
							isHovered={isHovered || letThroughOnHover}
							isSelected={isSelected || letThroughOnSelect}
							connectionType={connectionType}
						/>
					);
				}

				return (
					<GasketPhysicalConnection
						key={s.StreamId}
						name={name}
						connectionType={connectionType}
						side={side}
						stream={s}
						isHovered={isHovered}
						isOpenOnHover={letThroughOnHover}
						zoomLevel={zoomLevel}
						isSelected={isSelected}
						isOpenOnSelect={letThroughOnSelect}
					/>
				);
			})}
		</div>
	);
}

export function to8DigitHex(value: number): string {
	return '0x' + value.toString(16).padStart(8, '0').toUpperCase();
}

function EmptyPhyiscalConnection({
	connectionType,
	isHovered,
	isSelected
}: {
	readonly connectionType: 'input' | 'output';
	readonly isHovered: boolean;
	readonly isSelected: boolean;
}): React.ReactElement {
	return (
		<div
			className={`${connectionType === 'input' ? styles.input : styles.output}
				${isHovered ? styles.hovered : ''}
				${isSelected ? styles.selected : ''}
				${styles.gasketEmptyConnection}`}
			data-test={`gasket-${connectionType}-physical-connection-empty`}
		/>
	);
}

// eslint-disable-next-line complexity
function GasketPhysicalConnection({
	name,
	connectionType,
	side,
	stream,
	isHovered,
	isOpenOnHover,
	zoomLevel,
	isSelected,
	isOpenOnSelect
}: {
	readonly name: string;
	readonly connectionType: 'input' | 'output';
	readonly side: 'left' | 'right';
	readonly stream: DFGStream;
	readonly isHovered: boolean;
	readonly isOpenOnHover: boolean;
	readonly zoomLevel: number;
	readonly isSelected: boolean;
	readonly isOpenOnSelect: boolean;
}): React.ReactElement {
	const [showTooltip, setShowTooltip] = useState(false);
	const [mousePosition, setMousePosition] = useState({x: 0, y: 0});
	const tooltipTimeoutRef = useRef<
		ReturnType<typeof setTimeout> | undefined
	>(undefined);
	const connectionBoxRef = useRef<HTMLDivElement>(null);
	const selectedStreams = useSelectedStreams();
	const selectedGaskets = useSelectedGaskets();
	const dispatch = useDispatch();

	const bufferStartAddress: number =
		connectionType === 'input'
			? (findDestinationByGasket(stream, name)?.BufferAddress ?? 0)
			: (stream.Source.BufferAddress ?? 0);
	const bufferSize: number =
		connectionType === 'input'
			? (findDestinationByGasket(stream, name)?.BufferSize ?? 0)
			: (stream.Source.BufferSize ?? 0);
	const bufferEndAddress = bufferStartAddress + bufferSize;

	const bufferStartAddressHex = to8DigitHex(bufferStartAddress);
	const bufferEndAddressHex = to8DigitHex(bufferEndAddress - 1);

	const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
		dispatch(setHoveredStream(stream));
		handleMouseMove(e);

		if (tooltipTimeoutRef.current) {
			clearTimeout(tooltipTimeoutRef.current);
		}

		tooltipTimeoutRef.current = setTimeout(() => {
			setShowTooltip(true);
		}, 500);

		e.stopPropagation();
	};

	const handleMouseOut = (e: React.MouseEvent<HTMLDivElement>) => {
		dispatch(setHoveredStream(undefined));
		setShowTooltip(false);

		if (tooltipTimeoutRef.current) {
			clearTimeout(tooltipTimeoutRef.current);
			tooltipTimeoutRef.current = undefined;
		}

		e.stopPropagation();
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (connectionBoxRef.current) {
			const rect = connectionBoxRef.current.getBoundingClientRect();

			// Apply the same correction for zoom level
			setMousePosition({
				x: (e.clientX - rect.left) / zoomLevel,
				y: (e.clientY - rect.top) / zoomLevel
			});
		}
	};

	const handleStreamClick = (e: React.MouseEvent<HTMLDivElement>) => {
		dispatch(setSelectedStreams([stream]));
		dispatch(
			setSelectedGaskets([
				stream.Source.Gasket,
				...stream.Destinations.map(dest => dest.Gasket)
			])
		);
		dispatch(setEditingStream(stream));
		e.stopPropagation();
	};

	const isSingleStreamSelected =
		selectedStreams.length === 1 &&
		(selectedGaskets.length === 2 ||
			(selectedGaskets.length === 1 &&
				findDestinationByGasket(
					selectedStreams[0],
					selectedStreams[0].Source.Gasket
				) !== undefined));

	const streamErrors = useStreamErrors();

	return (
		<div
			ref={connectionBoxRef}
			data-test={`gasket-${connectionType}-physical-connection-${stream.StreamId}`}
			className={`${side === 'left' ? styles.left : styles.right}
								${connectionType === 'input' ? styles.input : styles.output} ${isHovered ? styles.hovered : ''} ${isOpenOnHover ? styles.openOnHover : ''}
								${isSelected ? styles.selected : ''} ${isOpenOnSelect ? styles.openOnSelect : ''} ${styles.gasketPhysicalConnection}`}
			onMouseOver={handleMouseOver}
			onMouseOut={handleMouseOut}
			onMouseMove={handleMouseMove}
			onClick={handleStreamClick}
		>
			{(isHovered || isSingleStreamSelected) &&
				connectionType === 'input' && (
					<ArrowHeadSVG
						isInput
						isSelected={isSingleStreamSelected}
						side={side}
					/>
				)}
			{showTooltip && (
				<StreamTooltip
					data-test='gasket-connection-tooltip'
					zoomLevel={zoomLevel}
					id='gasket-connection-tooltip'
					classNames={styles.gasketPhysicalConnectionTooltip}
					left={mousePosition.x}
					top={mousePosition.y + 10}
					header={
						<>
							Stream #{stream.StreamId}{' '}
							{stream.Description ? `| ${stream.Description}` : ''}
							<span
								className={
									styles.gasketPhysicalConnectionTooltipGaskets
								}
							>
								({stream.Source.Gasket} &rarr;{' '}
								{stream.Destinations.map(dest => dest.Gasket).join(
									', '
								)}
								)
							</span>
						</>
					}
				>
					<div
						className={
							styles.gasketPhysicalConnectionTooltipContentItem
						}
					>
						<div
							className={
								styles.gasketPhysicalConnectionTooltipContentItemLabel
							}
						>
							Start Buffer Address
						</div>
						<div
							className={
								styles.gasketPhysicalConnectionTooltipContentItemValue
							}
						>
							{' '}
							{bufferStartAddressHex}
						</div>
					</div>
					<div
						className={
							styles.gasketPhysicalConnectionTooltipContentItem
						}
					>
						<div
							className={
								styles.gasketPhysicalConnectionTooltipContentItemLabel
							}
						>
							End Buffer Address
						</div>
						<div
							className={
								styles.gasketPhysicalConnectionTooltipContentItemValue
							}
						>
							{' '}
							{bufferEndAddressHex}
						</div>
					</div>

					{streamErrors[stream.StreamId]?.length > 0 && (
						<div
							className={styles.gasketErrorsContainer}
							data-test='stream-tooltip-errors'
						>
							{streamErrors[stream.StreamId]?.map(error => (
								<div
									key={error.message}
									className={styles.gasketError}
								>
									{error.message}
								</div>
							))}
						</div>
					)}
				</StreamTooltip>
			)}
		</div>
	);
}

function GasketBox({
	gasket,
	inStreams,
	outStreams,
	zoomLevel
}: {
	readonly gasket: Gasket;
	readonly inStreams: DFGStream[];
	readonly outStreams: DFGStream[];
	readonly zoomLevel: number;
}): React.ReactElement {
	const [showTooltip, setShowTooltip] = useState(false);
	const [mousePosition, setMousePosition] = useState({x: 0, y: 0});
	const selectedGaskets = useSelectedGaskets();
	const dispatch = useDispatch();
	const gasketBoxRef = useRef<HTMLDivElement>(null);
	const tooltipTimeoutRef = useRef<
		ReturnType<typeof setTimeout> | undefined
	>(undefined);
	const hoveredStream = useHoveredStream();
	const gasketOptions = useGasketOptions();
	const isHovered =
		hoveredStream?.Source.Gasket === gasket.Name ||
		(hoveredStream
			? streamHasDestinationGasket(hoveredStream, gasket.Name)
			: false);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (gasketBoxRef.current) {
			const rect = gasketBoxRef.current.getBoundingClientRect();

			setMousePosition({
				x: (e.clientX - rect.left) / zoomLevel,
				y: (e.clientY - rect.top) / zoomLevel
			});
		}
	};

	const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
		handleMouseMove(e);

		// Clear any existing timeout
		if (tooltipTimeoutRef.current) {
			clearTimeout(tooltipTimeoutRef.current);
		}

		// Set a delay before showing the tooltip
		tooltipTimeoutRef.current = setTimeout(() => {
			setShowTooltip(true);
		}, 500);

		e.stopPropagation();
	};

	const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
		setShowTooltip(false);

		// Clear the timeout if mouse leaves before tooltip appears
		if (tooltipTimeoutRef.current) {
			clearTimeout(tooltipTimeoutRef.current);
			tooltipTimeoutRef.current = undefined;
		}

		e.stopPropagation();
	};

	const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
		dispatch(setSelectedGaskets([gasket.Name]));
		dispatch(setSelectedStreams(inStreams.concat(outStreams)));
		const gasketConfig: GasketConfig | undefined = gasketOptions.find(
			g => g.Name === gasket.Name
		) ?? {
			Name: gasket.Name,
			Config: {}
		};

		if (gasketConfig) {
			dispatch(setEditingGasket(gasketConfig));
		}

		e.stopPropagation();
	};

	// Cleanup timeout on unmount
	useEffect(
		() => () => {
			if (tooltipTimeoutRef.current) {
				clearTimeout(tooltipTimeoutRef.current);
			}
		},
		[]
	);

	const gasketErrors = useGasketErrors();

	return (
		<div
			ref={gasketBoxRef}
			data-test={`gasket-box-${gasket.Name}`}
			className={`${styles.gasketBox} ${isHovered ? styles.hovered : ''} ${selectedGaskets.includes(gasket.Name) ? styles.selected : ''}`}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onMouseMove={handleMouseMove}
			onClick={handleClick}
		>
			<div className={styles.gasketInfoContainer}>
				<div className={styles.gasketName}>{gasket.Name}</div>
				<div className={styles.gasketNumbers}>
					<div className={styles.gasketBufferSizeContainer}>
						<GasketBufferSize
							name={gasket.Name}
							gasket={gasket}
							streams={inStreams}
							type='input'
						/>
						<GasketBufferSize
							name={gasket.Name}
							gasket={gasket}
							streams={outStreams}
							type='output'
						/>
					</div>
					<div className={styles.gasketStreamCountsContainer}>
						<GasketStreamCount
							gasket={gasket}
							streamCount={inStreams.length}
							type='input'
						/>
						<GasketStreamCount
							gasket={gasket}
							streamCount={outStreams.length}
							type='output'
						/>
					</div>
				</div>
			</div>
			{showTooltip && (
				<StreamTooltip
					zoomLevel={zoomLevel}
					id='gasket-box-tooltip'
					left={mousePosition.x}
					top={mousePosition.y + 10}
				>
					<div>
						<div data-test='gasket-box-tooltip'>
							{gasket.Description}
						</div>
						{gasketErrors[gasket.Name]?.length > 0 && (
							<div
								className={styles.gasketErrorsContainer}
								data-test='gasket-tooltip-errors'
							>
								{gasketErrors[gasket.Name]?.map(error => (
									<div
										key={error.message}
										className={styles.gasketError}
									>
										{error.message}
									</div>
								))}
							</div>
						)}
					</div>
				</StreamTooltip>
			)}
		</div>
	);
}

function goesThroughBridge(
	inStreams: DFGStream[],
	outStreams: DFGStream[]
): boolean {
	return (
		inStreams.some(s =>
			s.Destinations.some(dest => s.Source.Gasket !== dest.Gasket)
		) ||
		outStreams.some(s =>
			s.Destinations.some(dest => s.Source.Gasket !== dest.Gasket)
		)
	);
}

// eslint-disable-next-line complexity
function GasketStreamsToBridge({
	gasket,
	inStreams,
	outStreams,
	side
}: {
	readonly gasket: Gasket;
	readonly inStreams: DFGStream[];
	readonly outStreams: DFGStream[];
	readonly side: 'left' | 'right';
}): React.ReactElement {
	const hoveredStream = useHoveredStream();
	const outputIsHovered = outStreams.some(
		s => hoveredStream?.StreamId === s.StreamId
	);
	const inputIsHovered = inStreams.some(
		s => hoveredStream?.StreamId === s.StreamId
	);
	const selectedStreams = useSelectedStreams();
	const selectedGaskets = useSelectedGaskets();
	const inputIsSelected = inStreams.some(s =>
		selectedStreams.some(ss => ss.StreamId === s.StreamId)
	);
	const outputIsSelected = outStreams.some(s =>
		selectedStreams.some(ss => ss.StreamId === s.StreamId)
	);

	const isSingleStreamSelected =
		selectedStreams.length === 1 && selectedGaskets.length === 2;

	return (
		<div className={styles.gasketStreamsToBridge}>
			<div className={styles.gasketStreamsToBridgeInner}>
				{side === 'left' && (
					<div
						style={{
							zIndex: inputIsHovered || inputIsSelected ? 1 : 0
						}}
						data-test='gasket-streams-to-bridge-vertical-line-input'
						className={`${styles.gasketStreamsToBridgeVerticalLine} ${styles.left} ${styles.input} ${inStreams.length > 0 ? styles.active : ''} ${inputIsHovered ? styles.hovered : ''} ${inputIsSelected ? styles.selected : ''}`}
					/>
				)}
				<div
					className={`${styles.gasketStreamsToBridgeHorizontalLine} ${goesThroughBridge(inStreams, outStreams) ? styles.active : ''}
			              ${(inputIsHovered || outputIsHovered) && goesThroughBridge(hoveredStream ? [hoveredStream] : [], []) ? styles.hovered : ''}
										${(inputIsSelected || outputIsSelected) && goesThroughBridge(selectedStreams, []) ? styles.selected : ''}`}
					data-test='gasket-streams-to-bridge-horizontal-line'
				>
					{(hoveredStream?.Source.Gasket === gasket.Name ||
						(isSingleStreamSelected &&
							selectedStreams[0]?.Source.Gasket === gasket.Name)) && (
						<ArrowHeadSVG
							side={side}
							isInput={false}
							isSelected={isSingleStreamSelected}
						/>
					)}
				</div>
				{side === 'right' && (
					<div
						style={{
							zIndex: inputIsHovered || inputIsSelected ? 1 : 0
						}}
						data-test='gasket-streams-to-bridge-vertical-line-input'
						className={`${styles.gasketStreamsToBridgeVerticalLine} ${styles.right} ${styles.input} ${inStreams.length > 0 ? styles.active : ''} ${inputIsHovered ? styles.hovered : ''} ${inputIsSelected ? styles.selected : ''}`}
					/>
				)}
			</div>
			<div
				className={styles.gasketStreamsToBridgeInner}
				style={{
					justifyContent: side === 'left' ? 'flex-start' : 'flex-end'
				}}
			>
				<div
					style={{zIndex: outputIsHovered ? 1 : 0}}
					data-test='gasket-streams-to-bridge-vertical-line-output'
					className={`${styles.gasketStreamsToBridgeVerticalLine} ${side === 'left' ? styles.left : styles.right} ${styles.output} ${outStreams.length > 0 ? styles.active : ''} ${outputIsHovered ? styles.hovered : ''} ${outputIsSelected ? styles.selected : ''}`}
				/>
			</div>
		</div>
	);
}

function ArrowHeadSVG({
	side,
	isInput,
	isSelected
}: {
	readonly side: 'left' | 'right';
	readonly isInput: boolean;
	readonly isSelected: boolean;
}): React.ReactElement {
	const rotation = isInput ? 45 : side === 'left' ? -45 : 135;

	return (
		<div
			className={`${styles.arrowHead} ${side === 'left' ? styles.left : styles.right} ${isInput ? styles.input : ''} ${isSelected ? styles.focused : ''}`}
			style={{transform: `rotate(${rotation}deg)`}}
		/>
	);
}

function GasketBufferSize({
	name,
	gasket,
	streams,
	type
}: {
	readonly name: string;
	readonly gasket: Gasket;
	readonly streams: DFGStream[];
	readonly type: 'input' | 'output';
}): React.ReactElement {
	const totalBufferSize = streams.reduce(
		(acc, s) =>
			Number(acc) +
			Number(
				type === 'input'
					? (findDestinationByGasket(s, name)?.BufferSize ?? 0)
					: (s.Source.BufferSize ?? 0)
			),
		0
	);
	const bufferSize =
		type === 'input'
			? gasket.InputBufferSize
			: gasket.OutputBufferSize;
	let percentage = 0;
	let invalid = false;

	if (totalBufferSize <= bufferSize) {
		percentage = Math.round((totalBufferSize / bufferSize) * 100);
	} else {
		invalid = true;
		percentage = 100;
	}

	return (
		<div
			className={`${styles.gasketBufferSize} ${invalid ? styles.invalid : ''}`}
		>
			<div
				data-test={`${type}-gasketBufferSizeBar`}
				className={`${styles.gasketBufferSizeBar} ${invalid ? styles.invalid : ''}`}
				style={{width: `${percentage}%`}}
			/>
			{type === 'input' && <span>&rarr;</span>}
			{totalBufferSize} / {bufferSize}
			{type === 'output' && <span>&rarr;</span>}
		</div>
	);
}

function GasketStreamCount({
	gasket,
	streamCount,
	type
}: {
	readonly gasket: Gasket;
	readonly streamCount: number;
	readonly type: 'input' | 'output';
}): React.ReactElement {
	return (
		<div
			data-test={`gasketStreamCount-${type}`}
			className={styles.gasketStreamCount}
		>
			{streamCount} /{' '}
			{type === 'input'
				? gasket.InputStreams.length
				: gasket.OutputStreams.length}
		</div>
	);
}

export default DFGCanvas;
