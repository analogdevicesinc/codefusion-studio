/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
	useRef,
	memo,
	type MouseEventHandler,
	useEffect,
	useCallback,
	forwardRef,
	useImperativeHandle
} from 'react';
import ZoomInIcon from '@common/icons/ZoomIn';
import ZoomOutIcon from '@common/icons/ZoomOut';
import ResetZoomIcon from '@common/icons/ZoomReset';
import ZoomControls from '../zoom-controls/ZoomControls';

import styles from './zoomableArea.module.scss';

const zoomStep = 0.1;

export type ZoomableAreaControlRef = {
	resetZoom: () => void;
};

type ZoomableAreaControlProps = Readonly<{
	onZoom?: (zoomLevel: number) => void;
	resetZoomLevel?: number;
	children: ReactNode;
}>;

function getComputedTranslateValues(
	ref: React.RefObject<HTMLDivElement>
) {
	if (!ref.current) return ['0', '0'];

	const [, translate] = ref.current.style.transform.split(') ', 2);

	const translateValues = translate
		.slice(10, translate.length - 1)
		.split(', ')
		.map(val => val.replace('px', ''));

	return translateValues as [string, string];
}

const ZoomableAreaControl = forwardRef<
	ZoomableAreaControlRef,
	ZoomableAreaControlProps
>(({onZoom, children, resetZoomLevel = 1}, ref) => {
	const zoomableAreaRef = useRef<HTMLDivElement>(null);
	const zoomableAreaParentRef = useRef<HTMLDivElement>(null);
	const zoomLevel = useRef(1);
	const startX = useRef(0);
	const startY = useRef(0);
	const startTransformX = useRef(0);
	const startTransformY = useRef(0);
	const isPanning = useRef(false);

	const zoomIn = useCallback(() => {
		if (zoomableAreaRef.current) {
			const [x, y] = getComputedTranslateValues(zoomableAreaRef);

			zoomableAreaRef.current.style.transform = `scale(${zoomLevel.current + zoomStep}) translate(${x}px, ${y}px)`;

			zoomLevel.current += zoomStep;

			onZoom?.(zoomLevel.current);
		}
	}, [onZoom]);

	const resetZoom = useCallback(() => {
		if (zoomableAreaRef.current && zoomableAreaParentRef.current) {
			const parent = zoomableAreaParentRef.current;
			const child = zoomableAreaRef.current;

			// This is to temporarily reset transform to get true dimensions and not be affected by current scale
			child.style.transform = 'scale(1) translate(0px, 0px)';

			const parentRect = parent.getBoundingClientRect();
			const childRect = child.getBoundingClientRect();

			const centerX = (parentRect.width - childRect.width) / 2;
			const centerY = (parentRect.height - childRect.height) / 2;

			child.style.transform = `scale(${resetZoomLevel}) translate(${centerX}px, ${centerY}px)`;
			zoomLevel.current = resetZoomLevel;
			startTransformX.current = centerX;
			startTransformY.current = centerY;
			startX.current = 0;
			startY.current = 0;
			isPanning.current = false;
			parent.style.cursor = 'default';
			onZoom?.(zoomLevel.current);
		}
	}, [onZoom, resetZoomLevel]);

	useImperativeHandle(
		ref,
		() => ({
			resetZoom
		}),
		[resetZoom]
	);

	const zoomOut = useCallback(() => {
		const currentZoom = zoomLevel.current;

		if (currentZoom < 0.8) return;

		if (zoomableAreaRef.current) {
			const [x, y] = getComputedTranslateValues(zoomableAreaRef);

			zoomableAreaRef.current.style.transform = `scale(${
				currentZoom - zoomStep
			}) translate(${x}px, ${y}px)`;
		}

		zoomLevel.current -= zoomStep;

		onZoom?.(zoomLevel.current);
	}, [onZoom]);

	const onMouseDown: MouseEventHandler<HTMLDivElement> = e => {
		// Enable panning using the middle mouse button or the left mouse button
		if (e.buttons === 1 || e.buttons === 4) {
			e.preventDefault();

			if (zoomableAreaParentRef.current) {
				isPanning.current = true;
				zoomableAreaParentRef.current.style.cursor = 'grabbing';
				startX.current = e.clientX;
				startY.current = e.clientY;

				const [x, y] = getComputedTranslateValues(zoomableAreaRef);

				startTransformX.current = parseInt(x, 10);
				startTransformY.current = parseInt(y, 10);
			}
		}
	};

	const mouseUpHandler = () => {
		if (zoomableAreaParentRef.current) {
			zoomableAreaParentRef.current.style.cursor = 'default';
			isPanning.current = false;
		}
	};

	const mouseMoveHandler: MouseEventHandler<HTMLDivElement> = e => {
		if (!isPanning.current) return;

		if (zoomableAreaRef.current) {
			e.preventDefault();

			const deltaX = e.clientX - startX.current;
			const deltaY = e.clientY - startY.current;

			const newTransformX = startTransformX.current + deltaX;
			const newTransformY = startTransformY.current + deltaY;

			zoomableAreaRef.current.style.transform = `scale(${zoomLevel.current}) translate(${newTransformX}px, ${newTransformY}px)`;
		}
	};

	const mouseLeaveHandler: MouseEventHandler<HTMLDivElement> = () => {
		isPanning.current = false;

		if (zoomableAreaParentRef.current) {
			zoomableAreaParentRef.current.style.cursor = 'default';
		}
	};

	const zoomControls: Array<[string, ReactNode, () => void]> = [
		['zoom-out', <ZoomOutIcon key='z-o' />, zoomOut],
		['zoom-reset', <ResetZoomIcon key='z-r' />, resetZoom],
		['zoom-in', <ZoomInIcon key='z-i' />, zoomIn]
	];

	useEffect(() => {
		const ref = zoomableAreaParentRef.current;

		const handleWheelZoom = (e: WheelEvent) => {
			e.preventDefault();

			if (e.deltaY < 0) {
				zoomIn();
			} else {
				zoomOut();
			}
		};

		ref?.addEventListener('wheel', handleWheelZoom);

		return () => {
			ref?.removeEventListener('wheel', handleWheelZoom);
		};
	}, [zoomIn, zoomOut]);

	return (
		<>
			<div
				ref={zoomableAreaParentRef}
				className={styles.zoomableAreaParent}
				onMouseDown={onMouseDown}
				onMouseUp={mouseUpHandler}
				onMouseMove={mouseMoveHandler}
				onMouseLeave={mouseLeaveHandler}
			>
				<div
					ref={zoomableAreaRef}
					id='mcu-zoomable-area'
					className={styles.zoomableArea}
					style={{transform: 'scale(1) translate(0px, 0px)'}}
				>
					{children}
				</div>
			</div>
			<ZoomControls controls={zoomControls} />
		</>
	);
});

export default memo(ZoomableAreaControl);
