/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import {useCallback, useEffect, useMemo, useState} from 'react';
import debounce from 'lodash.debounce';

export function useTooltipDebouncedHover(delay = 800) {
	const [isHovered, setIsHovered] = useState(false);

	const debouncedHover = useMemo(
		() => debounce(() => setIsHovered(true), delay),
		[delay]
	);

	const displayTooltip = useCallback(() => {
		debouncedHover();
	}, [debouncedHover]);

	const hideTooltip = useCallback(() => {
		debouncedHover.cancel();
		setIsHovered(false);
	}, [debouncedHover]);

	useEffect(() => {
		return () => {
			debouncedHover.cancel();
		};
	}, [debouncedHover]);

	return {isHovered, displayTooltip, hideTooltip, setIsHovered};
}
