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
import {memo} from 'react';

function RightArrow() {
	return (
		<svg
			width='5'
			height='10'
			viewBox='0 0 5 10'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
		>
			<path d='M4.14141 4.97326L0 0.641711L0.60606 0L5 4.70588V5.29412L0.60606 10L0 9.35829L4.14141 4.97326Z' />
		</svg>
	);
}

export default memo(RightArrow);
