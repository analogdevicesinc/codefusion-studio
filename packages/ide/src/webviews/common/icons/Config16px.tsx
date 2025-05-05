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

import type React from 'react';

function ConfigIcon16px(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			{...props}
			xmlns='http://www.w3.org/2000/svg'
			width='16'
			height='16'
			viewBox='0 0 16 16'
			fill='none'
		>
			<path d='M4.15267 2.7998V7.15922H3.28244V2.7998H4.15267ZM9.37405 7.15922L9.74046 6.74183V5.86067L9.37405 5.44328H6.62595L6.30534 5.8143V6.69546L6.62595 7.15922H9.37405ZM5.0687 9.75633L5.43511 9.33894V8.45778L5.0687 8.04038H2.32061L2 8.45778V9.33894L2.32061 9.75633H5.0687ZM8.41221 2.7998V4.56212H7.58779V2.7998H8.41221ZM7.58779 8.04038V13.2346H8.41221V8.04038H7.58779ZM4.15267 10.6375V13.2346H3.28244V10.6375H4.15267ZM10.9313 10.6375L10.5649 10.2201V9.38531L10.9313 8.96792H13.6794L14 9.38531V10.2201L13.6794 10.6375H10.9313ZM12.7176 2.7998V8.04038H11.8473V2.7998H12.7176ZM11.8473 11.5186V13.2346H12.7176V11.5186H11.8473Z' />
		</svg>
	);
}

export default ConfigIcon16px;
