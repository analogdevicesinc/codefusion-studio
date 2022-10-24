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
import ClockDiagram from '../clock-diagram/ClockDiagram';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import debounce from 'lodash.debounce';
import type {HoveredClockInfo} from '../types/canvas';
import NodeTooltip from '../node-tooltip/NodeTooltip';
import ClockTooltip from '../clock-tooltip/ClockTooltip';
import type {DiagramData, DiagramNode} from '@common/types/soc';
import {getClockCanvas} from '../../../utils/api';
import {showInformationMessage} from '@common/api';

let canvas: DiagramData | undefined;

if (import.meta.env.MODE === 'development') {
	canvas = (window as any).__DEV_SOC__.Packages[0].ClockCanvas;
} else {
	canvas = await getClockCanvas();
}

Object.freeze(canvas);

function ClockDiagramContainer() {
	const containerRef = useRef<HTMLDivElement>(null);
	const mousePosition = useRef({x: 0, y: 0});

	const [hoveredPartInfo, setHoveredPartInfo] = useState<
		DiagramNode | undefined
	>();

	const [hoveredClockInfo, setHoveredClockInfo] = useState<
		HoveredClockInfo | undefined
	>();

	const handleNodeHover = useMemo(
		() =>
			debounce(
				(partInfo: DiagramNode | undefined) => {
					setHoveredPartInfo(partInfo);
				},
				500,
				{trailing: true, leading: false}
			),
		[]
	);

	const handleClockHover = useMemo(
		() =>
			debounce((clockInfo: HoveredClockInfo | undefined) => {
				setHoveredClockInfo(clockInfo);
			}, 500),
		[]
	);

	const handleMouseMove: React.MouseEventHandler<HTMLDivElement> =
		useCallback(event => {
			if (mousePosition.current) {
				mousePosition.current.x = event.clientX;
				mousePosition.current.y = event.clientY;
			}
		}, []);

	useEffect(() => {
		if (!canvas) {
			void showInformationMessage(
				'There is no clock canvas provided for the current soc.'
			);
		}
	}, []);

	return (
		<div
			ref={containerRef}
			id='clockDiagramContainer'
			style={{position: 'relative', height: '100%', width: '100%'}}
			onMouseMove={handleMouseMove}
		>
			<ClockDiagram
				canvas={canvas}
				handleNodeHover={handleNodeHover}
				handleClockHover={handleClockHover}
			/>
			{hoveredPartInfo && (
				<NodeTooltip
					hoveredNodeInfo={hoveredPartInfo}
					containerRef={containerRef}
				/>
			)}
			{hoveredClockInfo && (
				<ClockTooltip
					hoveredClockInfo={hoveredClockInfo}
					containerRef={containerRef}
					mousePosition={mousePosition.current}
				/>
			)}
		</div>
	);
}

export default ClockDiagramContainer;
