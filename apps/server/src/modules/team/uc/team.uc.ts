import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
	EntityId,
	IPagination,
	Counted,
	SortOrder,
	TaskWithStatusVo,
	ITeamProperties,
	User,
	Team,
} from '@shared/domain';

import { TeamRepo } from '@shared/repo';

@Injectable()
export class TeamUC {
	constructor(private readonly teamRepo: TeamRepo) {}

	async findAll(name: string, pagination: IPagination): Promise<Counted<Team[]>> {
		const response: Counted<Team[]> = await this.findAll(name, pagination);

		return response;
	}

	/*
	private async findAllForStudent(user: User, pagination: IPagination): Promise<Counted<TaskWithStatusVo[]>> {
		const courses = await this.authorizationService.getPermittedCourses(user, TaskParentPermission.read);
		const openCourses = courses.filter((c) => !c.isFinished());
		const lessons = await this.authorizationService.getPermittedLessons(user, openCourses);

		const dueDate = this.getDefaultMaxDueDate();
		const notFinished = { userId: user.id, value: false };

		const [tasks, total] = await this.taskRepo.findAllByParentIds(
			{
				creatorId: user.id,
				courseIds: openCourses.map((c) => c.id),
				lessonIds: lessons.map((l) => l.id),
			},
			{ afterDueDateOrNone: dueDate, finished: notFinished, availableOn: new Date() },
			{
				pagination,
				order: { dueDate: SortOrder.asc },
			}
		);

		const taskWithStatusVos = tasks.map((task) => {
			const status = task.createStudentStatusForUser(user);
			return new TaskWithStatusVo(task, status);
		});

		return [taskWithStatusVos, total];
	} */
}
