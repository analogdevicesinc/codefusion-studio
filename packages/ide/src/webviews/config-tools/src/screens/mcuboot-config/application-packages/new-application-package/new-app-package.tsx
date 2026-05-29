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

import {Button, EmptyState} from 'cfs-react-library';
import styles from './new-app-package.module.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';

type NewAppPackageProps = Readonly<{
	onAddImage: () => void;
}>;

function NewAppPackage({onAddImage}: NewAppPackageProps) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage?.[
			'new-package'
		];

	return (
		<div className={styles.container}>
			<EmptyState
				title={l10n?.title}
				description={l10n?.description}
				dataTest='application-package-summary:new-app-package'
			>
				<div slot='footer' className={styles.footer}>
					<Button
						appearance='primary'
						dataTest='application-package-summary:new-app-package:add-image-button'
						onClick={onAddImage}
					>
						{l10n?.addImageButton}
					</Button>
				</div>
			</EmptyState>
		</div>
	);
}

export default NewAppPackage;
