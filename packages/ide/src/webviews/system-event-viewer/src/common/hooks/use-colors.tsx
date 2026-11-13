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

import {useContext} from 'react';
import {
	ColorsContext,
	type SevColors
} from '../context/colors-context';

export default function useColors(): SevColors {
	const colors = useContext(ColorsContext);

	if (!colors) {
		throw new Error('useColors must be used within a ColorsProvider');
	}

	return colors;
}
