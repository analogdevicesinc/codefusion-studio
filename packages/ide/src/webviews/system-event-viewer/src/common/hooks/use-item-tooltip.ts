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

import {useCallback, useEffect, useState} from 'react';

type ItemTooltipOptions = Readonly<{
	isResizingRef: React.MutableRefObject<boolean>;
	isDraggingRef: React.MutableRefObject<boolean>;
}>;

type ItemTooltipControls = Readonly<{
	isTooltipVisible: boolean;
	showTooltip: () => void;
	showTooltipImmediately: () => void;
	hideTooltip: () => void;
}>;

/** Shares hover timing and dismissal for tooltips in the event-source list. */
export function useItemTooltip({
	isResizingRef,
	isDraggingRef
}: ItemTooltipOptions): ItemTooltipControls {
	const [state, setState] = useState<
		'hidden' | 'pending' | 'visible'
	>('hidden');

	const hideTooltip = useCallback(() => {
		setState('hidden');
	}, []);

	const showTooltip = useCallback(() => {
		if (!isResizingRef.current && !isDraggingRef.current) {
			setState(current =>
				current === 'visible' ? current : 'pending'
			);
		}
	}, [isResizingRef, isDraggingRef]);

	const showTooltipImmediately = useCallback(() => {
		if (!isResizingRef.current && !isDraggingRef.current) {
			setState('visible');
		}
	}, [isResizingRef, isDraggingRef]);

	useEffect(() => {
		if (state === 'hidden') return;

		const timeout =
			state === 'pending'
				? window.setTimeout(() => {
						setState(
							isResizingRef.current || isDraggingRef.current
								? 'hidden'
								: 'visible'
						);
					}, 300)
				: undefined;

		// Capture pointer-down before a control starts resizing or dragging.
		window.addEventListener('pointerdown', hideTooltip, true);
		window.addEventListener('scroll', hideTooltip, true);
		window.addEventListener('resize', hideTooltip);

		return () => {
			window.clearTimeout(timeout);
			window.removeEventListener('pointerdown', hideTooltip, true);
			window.removeEventListener('scroll', hideTooltip, true);
			window.removeEventListener('resize', hideTooltip);
		};
	}, [state, hideTooltip, isResizingRef, isDraggingRef]);

	return {
		isTooltipVisible: state === 'visible',
		showTooltip,
		showTooltipImmediately,
		hideTooltip
	};
}
