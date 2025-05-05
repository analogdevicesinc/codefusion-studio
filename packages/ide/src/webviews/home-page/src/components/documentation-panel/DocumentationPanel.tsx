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

import {default as DocumentLinks} from './documentation.json';

import './documentation-panel.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';

export function DocumentationPanel() {
	const l10n: TLocaleContext | undefined = useLocaleContext();

	const renderLinks = (links: typeof DocumentLinks) =>
		links.map(document => (
			<VSCodeLink key={document.title} href={document.link}>
				{document.title}
			</VSCodeLink>
		));

	return (
		<div className='documentation-panel'>
			<h2>{l10n?.documentation?.title}</h2>
			<div className='documentation-links'>
				<div className='column'>
					{renderLinks(
						DocumentLinks.slice(
							0,
							Math.ceil(DocumentLinks.length / 2)
						)
					)}
				</div>
				<div className='column'>
					{renderLinks(
						DocumentLinks.slice(Math.ceil(DocumentLinks.length / 2))
					)}
				</div>
			</div>
			<VSCodeLink href='https://www.analog.com/'>
				{l10n?.documentation?.seeMore?.title}
			</VSCodeLink>
		</div>
	);
}
