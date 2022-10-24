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

import {type ReactNode} from 'react';

import './tooltip.scss';

export enum Direction {
	Right,
	Left
}

type TooltipProps = {
	readonly title: string;
	readonly direction?: Direction;
	readonly type?: 'short' | 'long';
	readonly children: ReactNode;
};

function Tooltip({
	title,
	direction = Direction.Right,
	type = 'short',
	children
}: TooltipProps) {
	return (
		<div className={`tooltip ${type}`}>
			{children}
			<span
				className='title'
				style={
					direction === Direction.Right ? {left: '0%'} : {right: '0%'}
				}
			>
				{title}
			</span>
		</div>
	);
}

export default Tooltip;
