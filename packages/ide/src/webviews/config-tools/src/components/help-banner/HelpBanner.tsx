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

import {Button, CloseIcon} from 'cfs-react-library';
import styles from './HelpBanner.module.scss';

type HelpBannerProps = Readonly<{
	isHelpBannerDisplayed: boolean;
	header: string;
	description: string;
	onContinue: () => void;
	onHelp: () => void;
	onDiscard: () => void;
}>;

export default function HelpBanner({
	isHelpBannerDisplayed,
	header,
	description,
	onContinue,
	onHelp,
	onDiscard
}: HelpBannerProps) {
	if (!isHelpBannerDisplayed) return null;

	return (
		<div
			className={styles.helpBanner}
			data-test='peripheral-help-banner:container'
		>
			<div className={styles.closeContainer}>
				<CloseIcon
					onClick={() => {
						onDiscard();
					}}
				/>
			</div>
			<div className={styles.contentContainer}>
				<h2 data-test='help-banner:title'>{header}</h2>
				<p data-test='help-banner:description'>{description}</p>
				<div className={styles.actionsContainer}>
					<Button
						dataTest='help-banner:continue-button'
						onClick={() => {
							onContinue();
						}}
					>
						Got it
					</Button>
					<Button appearance='secondary' onClick={onHelp}>
						Help
					</Button>
				</div>
			</div>
		</div>
	);
}
