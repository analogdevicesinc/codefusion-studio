import CoresSelectionContainer from './CoresSelectionContainer';
import WorkspaceCreationLayout from '../../common/components/WorkspaceCreationLayout';
import {
	useSelectedBoardPackage,
	useSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.selector';

export default function CoresSelection() {
	const selectedSoc = useSelectedSoc();
	const {boardId, packageId} = useSelectedBoardPackage();

	return (
		<WorkspaceCreationLayout
			title='Cores and Configuration'
			description={`${selectedSoc} | ${boardId} ${packageId}. Select the cores to add to your workspace.`}
		>
			<CoresSelectionContainer />
		</WorkspaceCreationLayout>
	);
}
