import { EntityManager } from '@mikro-orm/mongodb';
import { Injectable } from '@nestjs/common';

import { Counted, EntityId } from '@shared/domain';

// CourseGroupInfo must use from learnroom
import { CourseGroupInfo, Submission, Task } from '../entity';

// TODO: add scope helper

@Injectable()
export class SubmissionRepo {
	constructor(private readonly em: EntityManager) {}

	async findByTasks(tasks: Task[]): Promise<Counted<Submission[]>> {
		const [submissions, count] = await this.em.findAndCount(Submission, {
			task: { $in: tasks },
		});

		return [submissions, count];
	}

	async findByUserId(userId: EntityId): Promise<Counted<Submission[]>> {
		const courseGroupsOfUser = await this.em.find(CourseGroupInfo, { students: userId });
		const result = await this.em.findAndCount(Submission, {
			$or: [{ student: userId }, { teamMembers: userId }, { courseGroup: { $in: courseGroupsOfUser } }],
		});
		return result;
	}
}
