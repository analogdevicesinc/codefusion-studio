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
import {
	type ReactNode,
	memo,
	useEffect,
	useMemo,
	useRef,
	useState,
	Suspense
} from 'react';
import ErrorBoundary from '../../../components/error-boundary/ErrorBoundary';
import ADIDrawingEngine from '../../../lib/drawing-engine/@adi-ctx-ctx-drawing-engine.es';
import {generateSchematicConfig} from '../utils/generate-schematic-config';
import {useAppDispatch} from '../../../state/store';
import {formatDiagramData} from '../utils/format-schematic-data';
import ZoomControls from '../../../components/zoom-controls/ZoomControls';
import {
	colorVariablesIds,
	fallbackColors
} from '../constants/color-variables';
import {
	setClockNodeDetailsTargetNode,
	setDiagramData
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import ZoomInIcon from '../../../../../common/icons/ZoomIn';
import ZoomOutIcon from '../../../../../common/icons/ZoomOut';
import ResetZoomIcon from '../../../../../common/icons/ZoomReset';
import {ProgressRing} from 'cfs-react-library';
import {useClockNodesConfig} from '../../../state/slices/clock-nodes/clockNodes.selector';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import type {
	DiagramClocks,
	DiagramData,
	DiagramNode
} from '@common/types/soc';
import type {HoveredClockInfo} from '../types/canvas';
import {computeFrequencies} from '../../../utils/rpn-expression-resolver';
import '../clockConfig.css';

type ClockDiagramProps = {
	readonly canvas: DiagramData | undefined;
	readonly handleNodeHover: (arg: DiagramNode | undefined) => void;
	readonly handleClockHover: (
		arg: HoveredClockInfo | undefined
	) => void;
};

type EngineApi = Record<string, (...args: unknown[]) => void> & {
	disabledNodes?: string[];
	disabledWires?: string[];
	errorNodes?: string[];
};

export type DrawingEngineEvent = {
	canvas: {
		partComponents: DiagramNode[];
		wireComponents: DiagramClocks[];
	};
	id: string;
};

type ColorsRecord = Record<string, string>;

function getColorsRecord() {
	const rootStyles = getComputedStyle(document.documentElement);

	return Object.values(colorVariablesIds).reduce<ColorsRecord>(
		(acc, curr) => {
			acc[curr] =
				rootStyles.getPropertyValue(curr) === ''
					? fallbackColors[curr]
					: rootStyles.getPropertyValue(curr);

			return acc;
		},
		{}
	);
}

function ClockDiagram({
	canvas,
	handleNodeHover,
	handleClockHover
}: ClockDiagramProps) {
	const engineApi = useRef<EngineApi>({} as EngineApi);
	const dispatch = useAppDispatch();
	const assignedPins = useAssignedPins();
	const nodesConfig = useClockNodesConfig();

	// Controls diagram loader display
	const [shouldRender, setShouldRender] = useState(false);
	// Controls diagram recreation on theme change
	const [shouldRecreateSchematic, setShouldRecreateSchematic] =
		useState(false);

	const [activeThemeId, setActiveThemeId] = useState(() => {
		const body = document.querySelector('body');
		const themeId = body?.getAttribute('data-vscode-theme-name');

		if (!themeId) {
			console.warn(
				'Theme ID not found in body element, using fallback theme id.'
			);
		}

		return body?.getAttribute('data-vscode-theme-name') ?? 'Dark+';
	});

	const diagramConfig = useMemo(() => {
		if (!activeThemeId) return undefined;

		return generateSchematicConfig(getColorsRecord());
	}, [activeThemeId]);

	const zoomControls: Array<[string, ReactNode, () => void]> =
		useMemo(
			() => [
				[
					'zoom-out',
					<ZoomOutIcon key='z-o' />,
					() => {
						engineApi.current?.zoomOut?.();
					}
				],
				[
					'zoom-reset',
					<ResetZoomIcon key='z-r' />,
					() => {
						engineApi.current?.zoomReset?.();
					}
				],
				[
					'zoom-in',
					<ZoomInIcon key='z-i' />,
					() => {
						engineApi.current?.zoomIn?.();
					}
				]
			],
			[]
		);

	const handlePartClick = (response: DrawingEngineEvent) => {
		const clockNodeToSave = response.canvas.partComponents.find(
			clockNode => clockNode.id === response.id
		)?.name;

		dispatch(setClockNodeDetailsTargetNode(clockNodeToSave));
	};

	const handleBackdropClick = (
		e: Event | React.FormEvent<HTMLElement>
	) => {
		const targetId = (e.target as HTMLElement).id;

		if (targetId === 'adi_diagram') {
			dispatch(setClockNodeDetailsTargetNode(undefined));
		}
	};

	useEffect(() => {
		if (
			Object.keys(engineApi.current).length > 0 &&
			shouldRecreateSchematic
		) {
			setShouldRecreateSchematic(false);
		}
	}, [shouldRecreateSchematic]);

	useEffect(() => {
		const iframeBody = document.querySelector('body');

		if (iframeBody) {
			const observer = new MutationObserver(mutations => {
				mutations.forEach(mutation => {
					if (mutation.type === 'attributes') {
						const {attributeName} = mutation;

						if (attributeName === 'data-vscode-theme-name') {
							const themeId = iframeBody.getAttribute(
								'data-vscode-theme-name'
							);

							if (themeId) {
								setActiveThemeId(themeId);
								setShouldRecreateSchematic(true);
								setShouldRender(false);
							}
						}
					}
				});
			});

			observer.observe(iframeBody, {
				attributes: true
			});

			return () => {
				observer.disconnect();
			};
		}
	});

	// Handles diagram element disabled/error states
	useEffect(() => {
		if (!shouldRender || !canvas) return;

		const {
			loadContent,
			highlightParts,
			highlightWires,
			resetCanvasHighlight,
			rerenderContent
		} = engineApi.current;

		const formattedData = formatDiagramData(
			canvas,
			getColorsRecord(),
			{
				clockconfig: nodesConfig,
				assignedPins
			},
			computeFrequencies(nodesConfig, assignedPins)
		);

		// Load new computed values
		loadContent(formattedData);

		// Error is technically not used, though we need it for correct re-rendering in ClockDetails component
		const parts = Object.values(formattedData.parts).reduce(
			(
				acc: Record<
					string,
					{enabled: boolean | undefined; error: boolean | undefined}
				>,
				part
			) => ({
				...acc,
				[part.name]: {
					enabled: part.enabled,
					error: part.error
				}
			}),
			{}
		);

		dispatch(setDiagramData(parts));

		const newDisabledNodes = Object.values(formattedData.parts)
			.filter(part => !part.enabled)
			.reduce<string[]>((acc, curr) => {
				acc.push(curr.id);

				return acc;
			}, []);

		const newDisabledWires = Object.values(formattedData.wires)
			.filter(clock => !clock.enabled)
			.reduce<string[]>((acc, curr) => {
				acc.push(curr.id);

				return acc;
			}, []);

		const newErrorNodes = Object.values(formattedData.parts)
			.filter(part => part.error)
			.map(part => part.id);

		// Reset all elements to their default state
		resetCanvasHighlight();

		// Highlight new disable nodes
		highlightParts(newDisabledNodes, 'disabled');

		// Highlight new error nodes
		highlightParts(newErrorNodes, 'error');

		// Disable new wires
		highlightWires(newDisabledWires, 'disabled');

		rerenderContent?.();
	}, [assignedPins, canvas, nodesConfig, shouldRender, dispatch]);

	if (shouldRecreateSchematic || !canvas) return null;

	return (
		<>
			{!shouldRender && (
				<div
					data-test='clock-diagram:loader'
					className='diagramLoader'
				>
					<ProgressRing />
				</div>
			)}
			<div
				className={`schematicContainer${shouldRender ? ' rendered' : ''}`}
				onClick={handleBackdropClick}
			>
				<ErrorBoundary>
					<Suspense fallback={null}>
						<ADIDrawingEngine
							config={diagramConfig}
							preloadContent={canvas}
							partClick={handlePartClick}
							functionsObject={engineApi.current}
							partHoverEnter={(e: DrawingEngineEvent) => {
								const targetCanvasEl = e.canvas.partComponents.find(
									part => part.id === e.id
								);

								if (targetCanvasEl) {
									handleNodeHover(targetCanvasEl);
								}
							}}
							partHoverExit={() => {
								handleNodeHover(undefined);
							}}
							wireHoverEnter={(e: DrawingEngineEvent) => {
								const targetCanvasEl = e.canvas.wireComponents.find(
									part => part.id === e.id
								);

								if (targetCanvasEl) {
									const {clock, id, startPoint, endPoint, type} =
										targetCanvasEl;

									handleClockHover({
										id,
										type,
										clock,
										startPoint,
										endPoint
									});
								}
							}}
							wireHoverExit={() => {
								handleClockHover(undefined);
							}}
							onLoad={() => {
								setTimeout(() => {
									setShouldRender(true);
								}, 500);
							}}
							onZoom={() => {
								handleNodeHover(undefined);
							}}
						/>
					</Suspense>
				</ErrorBoundary>
				<ZoomControls controls={zoomControls} />
			</div>
		</>
	);
}

export default memo(ClockDiagram);
