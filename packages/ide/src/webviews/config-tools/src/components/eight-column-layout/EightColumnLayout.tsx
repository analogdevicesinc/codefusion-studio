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
import {Button} from 'cfs-react-library';
import type {NavigationItem} from '../../../../common/types/navigation';
import {useAppDispatch} from '../../state/store';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import styles from './EightColumnLayout.module.scss';

type EightColumnLayoutProps = {
	readonly header: string;
	readonly icon?: JSX.Element;
	readonly subtitle: string;
	readonly body?: JSX.Element;
	readonly buttonLabel?: string;
	readonly screenRedirect?: NavigationItem;
	readonly footer?: JSX.Element;
};

export default function EightColumnLayout({
	header,
	icon,
	subtitle,
	body,
	buttonLabel,
	screenRedirect,
	footer
}: EightColumnLayoutProps) {
	const dispatch = useAppDispatch();

	return (
		<section className={styles.outerContainer}>
			<div className={styles.innerContainer}>
				<div className={styles.header}>
					{icon}
					<h1 data-test='8-column-layout-header'>{header}</h1>
				</div>
				<h3
					className={styles.subtitle}
					data-test='8-column-layout-subtitle'
				>
					{subtitle}
				</h3>
				<div className={styles.body}>
					{body}
					{buttonLabel && screenRedirect && (
						<Button
							appearance='primary'
							onClick={() =>
								dispatch(setActiveScreen(screenRedirect))
							}
						>
							{buttonLabel}
						</Button>
					)}
				</div>
			</div>
			{footer && <div className={styles.footer}>{footer}</div>}
		</section>
	);
}
