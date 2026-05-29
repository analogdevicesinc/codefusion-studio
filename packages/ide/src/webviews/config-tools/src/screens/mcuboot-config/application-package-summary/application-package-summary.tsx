/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {useCallback, useEffect, useRef, useState} from 'react';
import HelpBanner from '../../../components/help-banner/HelpBanner';
import style from './application-package-summary.module.scss';
import {
	getApplicationPackageBanner,
	updateApplicationPackageBanner
} from '../../../utils/api';
import {Modal} from '../../../../../common/components/modal/Modal';
import {LocalizedMessage as t} from '@common/components/l10n/LocalizedMessage';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import {useActiveScreen} from '../../../state/slices/app-context/appContext.selector';
import {useApplicationPackages} from '../../../state/slices/application-packages/applicationPackages.selector';
import EmptyApplicationPackages from '../application-packages/empty-application-packages/empty-application-packages';
import ApplicationPackages from '../application-packages/application-packages';

function ApplicationPackageSummary() {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig;
	const id = useActiveScreen();
	const applicationPackages = useApplicationPackages();
	const [isHelpBannerDisplayed, setIsHelpBannerDisplayed] = useState<
		boolean | undefined
	>();

	const [isHelpModalOpen, setIsHelpModalOpen] =
		useState<boolean>(false);

	const handleHelpBanner = useCallback(async () => {
		setIsHelpBannerDisplayed(false);
		await updateApplicationPackageBanner(false);
	}, []);

	useEffect(() => {
		getApplicationPackageBanner()
			.then((resp: boolean) => {
				setIsHelpBannerDisplayed(resp);
			})
			.catch(err => {
				console.error(err);
			});
	}, []);

	return (
		<div
			ref={scrollContainerRef}
			className={style.container}
			data-test='mcuboot-config:application-package-summary'
		>
			<HelpBanner
				isHelpBannerDisplayed={Boolean(isHelpBannerDisplayed)}
				header={l10n?.['help-banner']?.title}
				description={l10n?.['help-banner']?.description}
				onDiscard={async () => handleHelpBanner()}
				onContinue={async () => handleHelpBanner()}
				onHelp={() => {
					setIsHelpModalOpen(prev => !prev);
				}}
			/>
			<div className={style.content}>
				{applicationPackages.length === 0 ? (
					<EmptyApplicationPackages />
				) : (
					<ApplicationPackages
						scrollContainerRef={scrollContainerRef}
					/>
				)}
			</div>
			<Modal
				isOpen={isHelpModalOpen}
				handleModalClose={() => {
					setIsHelpModalOpen(prev => !prev);
				}}
			>
				<div style={{textAlign: 'left'}}>
					<h1>{t({id: `${id}.help.title`})}</h1>
					{t({id: `${id}.description`, parseHtml: true})}
				</div>
			</Modal>
		</div>
	);
}

export default ApplicationPackageSummary;
