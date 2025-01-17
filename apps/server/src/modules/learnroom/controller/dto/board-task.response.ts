import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DecodeHtmlEntities } from '@shared/controller';
import { RoomBoardElementTypes } from '../../types';
import { BoardTaskStatusResponse } from './board-task-status.response';

export class BoardTaskResponse {
	constructor({ id, name, createdAt, updatedAt, status }: BoardTaskResponse) {
		this.id = id;
		this.name = name;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
		this.status = status;
	}

	@ApiProperty()
	id: string;

	@ApiProperty()
	@DecodeHtmlEntities()
	name: string;

	@ApiPropertyOptional()
	availableDate?: Date;

	@ApiPropertyOptional()
	duedate?: Date;

	@ApiPropertyOptional()
	@DecodeHtmlEntities()
	courseName?: string;

	@ApiPropertyOptional()
	@DecodeHtmlEntities()
	description?: string;

	@ApiPropertyOptional()
	displayColor?: string;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	@ApiProperty()
	status: BoardTaskStatusResponse;
}

export class BoardLockedTaskResponse {
	constructor({ id, name }: BoardLockedTaskResponse) {
		this.id = id;
		this.name = name;
	}

	@ApiProperty()
	id: string;

	@ApiProperty()
	@DecodeHtmlEntities()
	name: string;
}

export class BoardLessonResponse {
	constructor({ id, name, hidden, createdAt, updatedAt }: BoardLessonResponse) {
		this.id = id;
		this.name = name;
		this.hidden = hidden;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	@ApiProperty()
	id: string;

	@ApiProperty()
	@DecodeHtmlEntities()
	name: string;

	@ApiPropertyOptional()
	@DecodeHtmlEntities()
	courseName?: string;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	@ApiProperty()
	hidden: boolean;
}

export class BoardElementResponse {
	constructor({ type, content }: BoardElementResponse) {
		this.type = type;
		this.content = content;
	}

	@ApiProperty({
		description: 'the type of the element in the content. For possible types, please refer to the enum',
		enum: RoomBoardElementTypes,
	})
	type: RoomBoardElementTypes;

	@ApiProperty({
		description: 'Content of the Board, either: a task or a lesson specific for the board',
	})
	content: BoardTaskResponse | BoardLockedTaskResponse | BoardLessonResponse;
}

// TODO: this and DashboardResponse should be combined
export class BoardResponse {
	constructor({ roomId, title, displayColor, elements }: BoardResponse) {
		this.roomId = roomId;
		this.title = title;
		this.displayColor = displayColor;
		this.elements = elements;
	}

	@ApiProperty({
		description: 'The id of the room this board belongs to',
		pattern: '[a-f0-9]{24}',
	})
	roomId: string;

	@ApiProperty({
		description: 'Title of the Board',
	})
	title: string;

	@ApiProperty({
		description: 'Color of the Board',
	})
	displayColor: string;

	@ApiProperty({
		type: [BoardElementResponse],
		description: 'Array of board specific tasks or lessons with matching type property',
	})
	elements: BoardElementResponse[];
}
