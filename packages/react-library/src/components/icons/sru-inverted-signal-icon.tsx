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

import {SVGProps} from 'react';

function SruInvertedSignalIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='12'
			height='12'
			viewBox='0 0 12 12'
			fill='none'
			{...props}
		>
			<path
				d='M3.606 0.147374C3.7994 -0.049121 4.11298 -0.0491282 4.30639 0.147374C4.4998 0.343869 4.4998 0.662456 4.30639 0.858951L1.61504 3.59327L8.03798 3.59326C10.2261 3.59327 12 5.75161 12 7.97472C12 10.1978 10.3401 12 8.15195 12L0.5 12C0.226525 12 0.00478748 11.7747 0.00474545 11.4968C0.00477343 11.2189 0.226517 10.9936 0.500063 10.9936L8.15196 10.9937C9.79302 10.9936 11.0094 9.642 11.0095 7.97472C11.0095 6.30738 9.6791 4.59959 8.03798 4.59959L1.68469 4.59959L4.30639 7.26314C4.4998 7.45964 4.4998 7.77823 4.30639 7.97472C4.11298 8.17122 3.7994 8.17122 3.606 7.97472L0.174067 4.48799C-0.0580222 4.2522 -0.0580224 3.8699 0.174067 3.6341L3.606 0.147374Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default SruInvertedSignalIcon;
