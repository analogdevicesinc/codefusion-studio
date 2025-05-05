/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

function Lock(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			{...props}
			width='16'
			height='16'
			viewBox='0 0 16 16'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
		>
			<path
				opacity='0.4'
				d='M13 7H12L12 5C12 3.93913 11.5786 2.92178 10.8284 2.17163C10.0783 1.42149 9.06087 1 8 1C6.93913 1 5.92172 1.42149 5.17157 2.17163C4.42142 2.92178 4 3.93913 4 5L4 7H3L2 8L2 14L3 15L13 15L14 14V8L13 7ZM5 5C5 4.20435 5.31605 3.44127 5.87866 2.87866C6.44127 2.31605 7.20435 2 8 2C8.79565 2 9.55873 2.31605 10.1213 2.87866C10.6839 3.44127 11 4.20435 11 5L11 7L5 7L5 5ZM13 14L3 14L3 8L13 8V14Z'
			/>
		</svg>
	);
}

export default Lock;
