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
import {Children, type ReactElement} from 'react';

function NavigationPanel({
	activeNavItem,
	children
}: {
	readonly activeNavItem: string;
	readonly children: React.ReactNode;
}) {
	const activeChild = Children.toArray(children).find(
		child => (child as ReactElement).key === `.$${activeNavItem}`
	);

	// eslint-disable-next-line react/jsx-no-useless-fragment
	return <>{activeChild}</>;
}

export default NavigationPanel;
