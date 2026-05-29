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
import {useState, useCallback} from 'react';
import {HIGHLIGHT_ANIMATION_DURATION_MS} from '../screens/peripheral-config/constants';

/**
 * Custom hook for managing highlight animation state in peripheral components.
 *
 * @param onHighlight - Optional callback to execute when highlight is triggered (e.g., open accordion)
 * @param duration - Duration of highlight animation in milliseconds (defaults to HIGHLIGHT_ANIMATION_DURATION_MS)
 * @returns Object containing highlighted state and triggerHighlight function
 */
export function usePeripheralHighlight(
	onHighlight?: () => void,
	duration: number = HIGHLIGHT_ANIMATION_DURATION_MS
) {
	const [highlighted, setHighlighted] = useState(false);

	const triggerHighlight = useCallback(() => {
		setHighlighted(true);
		setTimeout(() => {
			setHighlighted(false);
		}, duration);
		onHighlight?.();
	}, [onHighlight, duration]);

	return {highlighted, triggerHighlight};
}
