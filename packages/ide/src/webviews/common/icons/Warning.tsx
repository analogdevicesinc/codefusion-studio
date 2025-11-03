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

function WarningIcon() {
	return (
		<svg
			width='14'
			height='13'
			viewBox='0 0 14 13'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
		>
			<path
				d='M6.60305 0.5H7.39695L13.5 11.9256L13.1031 12.5714H0.896947L0.5 11.9256L6.60305 0.5ZM7 1.69224L1.69084 11.6772H12.3092L7 1.69224ZM7.59542 10.7334V9.78954H6.40458V10.7334H7.59542ZM6.40458 8.84568V5.11993H7.59542V8.84568H6.40458Z'
				style={{
					fill: 'var(--vscode-notificationsWarningIcon-foreground, #CCA700)'
				}}
			/>
		</svg>
	);
}

export default WarningIcon;
