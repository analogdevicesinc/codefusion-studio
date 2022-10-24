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
type SVGProps = {
	readonly width?: string;
	readonly height?: string;
};

export default function Config({width, height}: SVGProps) {
	return (
		<svg
			width={width ?? '22'}
			height={height ?? '19'}
			viewBox='0 0 22 19'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
		>
			<path
				d='M3.94656 0V7.89313H2.35115V0H3.94656ZM13.5191 7.89313L14.1908 7.1374V5.54198L13.5191 4.78626H8.48092L7.89313 5.45801V7.05343L8.48092 7.89313H13.5191ZM5.62595 12.5954L6.29771 11.8397V10.2443L5.62595 9.48855H0.587786L0 10.2443V11.8397L0.587786 12.5954H5.62595ZM11.7557 0V3.19084H10.2443V0H11.7557ZM10.2443 9.48855V18.8931H11.7557V9.48855H10.2443ZM3.94656 14.1908V18.8931H2.35115V14.1908H3.94656ZM16.374 14.1908L15.7023 13.4351V11.9237L16.374 11.1679H21.4122L22 11.9237V13.4351L21.4122 14.1908H16.374ZM19.6489 0V9.48855H18.0534V0H19.6489ZM18.0534 15.7863V18.8931H19.6489V15.7863H18.0534Z'
				fill='#808080'
			/>
		</svg>
	);
}
