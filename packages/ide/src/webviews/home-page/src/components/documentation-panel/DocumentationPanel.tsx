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

import {VSCodeLink} from '@vscode/webview-ui-toolkit/react';

import './documentation-panel.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';
import {useEffect, useMemo, useState} from 'react';
import {request} from '../../../../common/api';
import {type Documentation} from 'cfs-ccm-lib';

const ITEMS_PER_COLUMN = 12;

export function DocumentationPanel() {
	const [isLoaded, setIsLoaded] = useState(false);
	const [documentLinks, setDocumentLinks] = useState<Documentation[]>(
		[]
	);

	useEffect(() => {
		request('getSocDocumentationLinks')
			.then(result => {
				setDocumentLinks(result as Documentation[]);
			})
			.catch(err => {
				setDocumentLinks([
					{
						name: 'Unable to retrieve documentation links. Reopen home-page',
						categories: [],
						url: ''
					}
				]);
				console.error('Error fetching document links', err);
			})
			.finally(() => {
				setIsLoaded(true);
			});
	}, []);

	const l10n: TLocaleContext | undefined = useLocaleContext();

	const groupedLinks = useMemo(
		() =>
			documentLinks.reduce<JSX.Element[][]>((chunks, link, index) => {
				const computedLink = (
					<VSCodeLink key={link.name} href={link.url}>
						{link.name}
					</VSCodeLink>
				);

				if (index % ITEMS_PER_COLUMN === 0) {
					chunks.push([computedLink]);
				} else {
					chunks[chunks.length - 1].push(computedLink);
				}

				return chunks;
			}, []),
		[documentLinks]
	);

	return (
		<div>
			<h2>{l10n?.documentation?.title}</h2>
			{!isLoaded && <div>Loading...</div>}
			{isLoaded && (
				<div className='documentation-container'>
					{groupedLinks.map((group, index) => (
						<div
							// eslint-disable-next-line react/no-array-index-key
							key={`group-${index}`}
							className='documentation-column'
						>
							{group}
						</div>
					))}
				</div>
			)}
			<VSCodeLink
				className='documentation-more'
				href='https://www.analog.com/'
			>
				{l10n?.documentation?.seeMore?.title}
			</VSCodeLink>
		</div>
	);
}
