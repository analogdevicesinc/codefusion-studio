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

import {type SVGProps} from 'react';

function MemoryLayoutIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='16'
			height='16'
			viewBox='0 0 24 24'
			fill='none'
			{...props}
		>
			<path
				fill-rule='evenodd'
				clip-rule='evenodd'
				d='M9.25 8.1C9.25 7.63056 9.63056 7.25 10.1 7.25H15.0371V8.75H10.75V11.75H13.75V13.25H10.75V16.25H15.0371V17.75H10.1C9.63056 17.75 9.25 17.3694 9.25 16.9V8.1ZM2.75 10.5512V17.75H1.25V8.03402C1.25 7.2757 2.2387 6.98504 2.64909 7.62272L4.57427 10.6141L6.49945 7.62272C6.90983 6.98505 7.89854 7.27569 7.89854 8.03402V17.75H6.39854V10.5512L5.41518 12.0792C5.02147 12.691 4.12707 12.691 3.73336 12.0792L2.75 10.5512ZM17.6015 10.5512V17.75H16.1015V8.03402C16.1015 7.2757 17.0902 6.98504 17.5005 7.62272L19.4257 10.6141L21.3509 7.62272C21.7613 6.98505 22.75 7.27569 22.75 8.03402V17.75H21.25V10.5512L20.2666 12.0792C19.8729 12.691 18.9785 12.691 18.5848 12.0792L17.6015 10.5512Z'
				fill='#CCCCCC'
			/>
		</svg>
	);
}

export default MemoryLayoutIcon;
