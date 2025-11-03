/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
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

import './resource-card.scss';
import {useState} from 'react';
import {GlobeIcon as Placeholder} from '../top-panel/icons';

export type ResourceProps = {
	readonly link: string;
	readonly img: string;
	readonly title: string;
	readonly description: string;
};

export function ResourceCard(props: ResourceProps) {
	// Handle image load error
	const [imgError, setImgError] = useState(false);
	return (
		<a className='resource-card' href={props.link}>
			{imgError ? (
				<Placeholder />
			) : (
				<img
					src={props.img}
					alt={props.title}
					onError={() => setImgError(true)}
				/>
			)}
			<p className='title'>{props.title}</p>
			<p className='description'>{props.description}</p>
		</a>
	);
}
