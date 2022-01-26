import { LearnroomMetadata } from '@shared/domain/types';
import { BoardElementType } from '@shared/domain/vo';

export interface ILearnroom {
	getMetadata: () => LearnroomMetadata;
}

export interface IBoard {
	roomId: string;
	displayColor: string;
	title: string;
	elements: BoardElementType[];
}
