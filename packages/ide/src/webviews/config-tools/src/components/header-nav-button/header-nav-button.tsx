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
import {LocalizedMessage as t} from '@common/components/l10n/LocalizedMessage';
import {useAppDispatch} from '../../state/store';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {type NavigationItem} from '@common/types/navigation';
import {useActiveScreen} from '../../state/slices/app-context/appContext.selector';
import styles from './header-nav-button.module.scss';
import {PanelTab} from 'cfs-react-library';

type HeaderNavButtonProps = {
	readonly id: NavigationItem;
};

export default function HeaderNavButton({id}: HeaderNavButtonProps) {
	const dispatch = useAppDispatch();
	const currentScreen = useActiveScreen() as NavigationItem;

	return (
		<div
			className={`${styles.container} ${id === currentScreen ? styles.selected : ''}`}
		>
			<PanelTab
				id={id}
				ariaSelected={id === currentScreen}
				testId={`header-nav-tab:${id}`}
				onClick={() => dispatch(setActiveScreen(id))}
			>
				{t({id: `${id}.title`})}
			</PanelTab>
		</div>
	);
}
