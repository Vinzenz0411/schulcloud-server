import { Entity, Collection, ManyToMany, ManyToOne } from '@mikro-orm/core';
import { Lesson } from './lesson.entity';
import { BaseEntityWithTimestamps } from './base.entity';
import { BoardElement, BoardElementType } from './boardelement.entity';

export type BoardProps = {
	references: BoardElement[];
};

@Entity({ tableName: 'board' })
export class Board extends BaseEntityWithTimestamps {
	constructor(props: BoardProps) {
		super();
		this.references.set(props.references);
	}

	@ManyToMany('BoardElement', undefined, { fieldName: 'referenceIds' })
	references = new Collection<BoardElement>(this);

	syncLessons(lessons: Lesson[]): void {}

	private async removeLessonsNotIn(lessons: Lesson[]): Promise<void> {
		const loadedReferences = await this.references.loadItems();
		const lessonReferences = loadedReferences.filter((element) => element.boardElementType === BoardElementType.Lesson);
		lessonReferences.forEach((reference) => {
			if (lessons.find((lesson) => lesson.id === reference.target.id)) {
			}
		});
	}
}
