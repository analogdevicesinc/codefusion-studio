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

import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';
import {Carousel} from './Carousel';

import './carousel-panel.scss';

export function CarouselPanel() {
	const l10n: TLocaleContext | undefined = useLocaleContext();

	return (
		<div className='carousel-panel'>
			<h2>{l10n?.carousel?.title}</h2>
			<Carousel />
		</div>
	);
}
