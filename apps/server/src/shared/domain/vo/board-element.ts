import { TaskWithStatusVo } from '@shared/domain/entity';

export type BoardElementType = {
	// TODO: should become fullblown class
	type: string;
	content: TaskWithStatusVo;
};
