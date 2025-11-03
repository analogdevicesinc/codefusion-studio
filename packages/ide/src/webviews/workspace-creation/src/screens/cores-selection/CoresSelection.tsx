import CoresSelectionContainer from './CoresSelectionContainer';
import WorkspaceCreationLayout from '../../common/components/WorkspaceCreationLayout';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';

export default function CoresSelection() {
	const l10n: TLocaleContext | undefined = useLocaleContext();

	return (
		<WorkspaceCreationLayout
			title={l10n?.['cores-config']?.title}
			description={l10n?.['cores-config']?.description}
		>
			<CoresSelectionContainer />
		</WorkspaceCreationLayout>
	);
}
