import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IPagination, Counted, ICurrentUser, SortOrder, TaskWithStatusVo, ITaskStatus, User } from '@shared/domain';

import { TaskRepo, UserRepo } from '@shared/repo';

import { TaskAuthorizationService, TaskParentPermission } from './task.authorization.service';

export enum TaskDashBoardPermission {
	teacherDashboard = 'TASK_DASHBOARD_TEACHER_VIEW_V3',
	studentDashboard = 'TASK_DASHBOARD_VIEW_V3',
}

@Injectable()
export class TaskUC {
	constructor(
		private readonly taskRepo: TaskRepo,
		private readonly authorizationService: TaskAuthorizationService,
		private readonly userRepo: UserRepo
	) {}

	// This uc includes 4 awaits + 1 from authentication services.
	// 5 awaits from with db calls from one request against the api is for me the absolut maximum what we should allowed.
	// TODO: clearify if Admin need TASK_DASHBOARD_TEACHER_VIEW_V3 permission
	async findAllFinished(currentUser: ICurrentUser, pagination?: IPagination): Promise<Counted<TaskWithStatusVo[]>> {
		// TODO do we have to check if user exists here? currently this is done in JWTStrategy.validate()
		const user = await this.userRepo.findById(currentUser.userId);

		// TODO: move to this.authorizationService? This can be determined with the User entity instead of the ICurrentUser.
		if (
			!this.hasTaskDashboardPermission(currentUser, TaskDashBoardPermission.teacherDashboard) &&
			!this.hasTaskDashboardPermission(currentUser, TaskDashBoardPermission.studentDashboard)
		) {
			throw new UnauthorizedException();
		}

		const { userId } = currentUser;

		const courses = await this.authorizationService.getPermittedCourses(user, TaskParentPermission.read);
		const lessons = await this.authorizationService.getPermittedLessons(user, courses);

		const openCourseIds = courses.filter((c) => !c.isFinished()).map((c) => c.id);
		const finishedCourseIds = courses.filter((c) => c.isFinished()).map((c) => c.id);
		const lessonIdsOfOpenCourses = lessons.filter((l) => !l.course.isFinished()).map((l) => l.id);
		const lessonIdsOfFinishedCourses = lessons.filter((l) => l.course.isFinished()).map((l) => l.id);

		const [tasks, total] = await this.taskRepo.findAllFinishedByParentIds(
			{
				creatorId: userId,
				openCourseIds,
				finishedCourseIds,
				lessonIdsOfOpenCourses,
				lessonIdsOfFinishedCourses,
			},
			{ pagination }
		);

		const taskWithStatusVos = tasks.map((task) => {
			let status: ITaskStatus;
			if (this.authorizationService.hasTaskPermission(user, task, TaskParentPermission.write)) {
				status = task.createTeacherStatusForUser(user);
			} else {
				// TaskParentPermission.read check is not needed on this place
				status = task.createStudentStatusForUser(user);
			}

			return new TaskWithStatusVo(task, status);
		});

		return [taskWithStatusVos, total];
	}

	// TODO: should it display task from courses that are not started?
	// TODO replace curentUser with userId. this requires that permissions are loaded inside the use case by authorization service
	// TODO: use authorizationService instant of private method
	async findAll(currentUser: ICurrentUser, pagination: IPagination): Promise<Counted<TaskWithStatusVo[]>> {
		let response: Counted<TaskWithStatusVo[]>;

		// TODO do we have to check if user exists here? currently this is done in JWTStrategy.validate()
		const user = await this.userRepo.findById(currentUser.userId);

		if (this.hasTaskDashboardPermission(currentUser, TaskDashBoardPermission.studentDashboard)) {
			response = await this.findAllForStudent(user, pagination);
		} else if (this.hasTaskDashboardPermission(currentUser, TaskDashBoardPermission.teacherDashboard)) {
			response = await this.findAllForTeacher(user, pagination);
		} else {
			throw new UnauthorizedException();
		}

		return response;
	}

	private async findAllForStudent(user: User, pagination: IPagination): Promise<Counted<TaskWithStatusVo[]>> {
		const courses = await this.authorizationService.getPermittedCourses(user, TaskParentPermission.read);
		const openCourses = courses.filter((c) => !c.isFinished());
		const lessons = await this.authorizationService.getPermittedLessons(user, openCourses);

		const dueDate = this.getDefaultMaxDueDate();
		const notFinished = { userId: user.id, value: false };

		const [tasks, total] = await this.taskRepo.findAllByParentIds(
			{
				courseIds: openCourses.map((c) => c.id),
				lessonIds: lessons.map((l) => l.id),
			},
			{ draft: false, afterDueDateOrNone: dueDate, finished: notFinished },
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
	}

	private async findAllForTeacher(user: User, pagination: IPagination): Promise<Counted<TaskWithStatusVo[]>> {
		const courses = await this.authorizationService.getPermittedCourses(user, TaskParentPermission.write);
		const openCourses = courses.filter((c) => !c.isFinished());
		const lessons = await this.authorizationService.getPermittedLessons(user, openCourses);

		const notFinished = { userId: user.id, value: false };

		const [tasks, total] = await this.taskRepo.findAllByParentIds(
			{
				creatorId: user.id,
				courseIds: openCourses.map((c) => c.id),
				lessonIds: lessons.map((l) => l.id),
			},
			{ finished: notFinished },
			{
				pagination,
				order: { dueDate: SortOrder.desc },
			}
		);

		const taskWithStatusVos = tasks.map((task) => {
			const status = task.createTeacherStatusForUser(user);
			return new TaskWithStatusVo(task, status);
		});

		return [taskWithStatusVos, total];
	}

	// TODO: move to this.authorizationService ?
	private hasTaskDashboardPermission(currentUser: ICurrentUser, permission: TaskDashBoardPermission): boolean {
		const hasPermission = currentUser.user.permissions.includes(permission);

		return hasPermission;
	}

	// It is more a util method or domain logic in context of findAllForStudent timeframe
	private getDefaultMaxDueDate(): Date {
		const oneWeekAgo = new Date();
		oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

		return oneWeekAgo;
	}
}
