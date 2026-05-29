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

import React from 'react';

type RefreshIconProps = React.SVGProps<SVGSVGElement>;

function RefreshIcon(props: RefreshIconProps) {
	return (
		<svg
			width='16'
			height='16'
			viewBox='0 0 16 16'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			{...props}
		>
			<path
				d='M4.68606 3.01333H2.01939V2H5.48606L6.01939 2.53333V6H5.00606V4.02667C4.08162 4.70222 3.45939 5.60889 3.13939 6.74667C2.85495 7.84889 2.94384 8.93333 3.40606 10C3.86828 11.0667 4.59717 11.8844 5.59273 12.4533C6.62384 12.9867 7.70828 13.1644 8.84606 12.9867C9.98384 12.7733 10.9261 12.24 11.6727 11.3867C12.4549 10.5333 12.8816 9.53778 12.9527 8.4C13.0594 7.22667 12.7927 6.17778 12.1527 5.25333C11.5127 4.29333 10.6416 3.63555 9.53939 3.28L9.80606 2.32C10.6949 2.60444 11.4594 3.06667 12.0994 3.70667C12.7749 4.31111 13.2727 5.04 13.5927 5.89333C13.9127 6.74667 14.0372 7.63555 13.9661 8.56C13.8949 9.44889 13.6283 10.2844 13.1661 11.0667C12.7038 11.8489 12.0816 12.5067 11.2994 13.04C10.5527 13.5378 9.71717 13.8578 8.79273 14C7.90384 14.1067 7.01495 14.0178 6.12606 13.7333C5.27273 13.4489 4.50828 13.0044 3.83273 12.4C3.19273 11.76 2.71273 11.0133 2.39273 10.16C2.07273 9.30667 1.94828 8.43555 2.01939 7.54667C2.09051 6.62222 2.35717 5.76889 2.81939 4.98667C3.28162 4.20444 3.90384 3.54667 4.68606 3.01333Z'
				fill='currentColor'
			/>
		</svg>
	);
}

export default RefreshIcon;
