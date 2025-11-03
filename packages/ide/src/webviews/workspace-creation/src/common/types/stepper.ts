import type {Step, SubStep} from 'cfs-react-library';

export type StepItem = Step & {
	id: string;
	substeps: SubStep[] | undefined;
};
