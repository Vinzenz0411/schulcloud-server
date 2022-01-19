import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { PaginationQuery } from '@shared/controller';
import { Course, Task, Lesson, User } from '@shared/domain';

import {
	userFactory,
	courseFactory,
	lessonFactory,
	taskFactory,
	submissionFactory,
	roleFactory,
	setupEntities,
} from '@shared/testing';
import { TaskRepo, UserRepo } from '@shared/repo';
import { TaskUC } from './task.uc';
import { TaskAuthorizationService, TaskParentPermission, TaskDashBoardPermission } from './task.authorization.service';

let user!: User;
let currentPermissions!: TaskDashBoardPermission[];

const setupUser = (permissions: TaskDashBoardPermission[]) => {
	const role = roleFactory.build({ permissions });
	user = userFactory.buildWithId({ roles: [role] });
	currentPermissions = permissions;
	return user;
};

// TODO: add courseGroups tests
// TODO: what about ignoredTask?

describe('TaskUC', () => {
	let module: TestingModule;
	let service: TaskUC;
	let taskRepo: TaskRepo;
	let userRepo: UserRepo;
	let authorizationService: TaskAuthorizationService;
	let orm: MikroORM;

	beforeAll(async () => {
		orm = await setupEntities();
	});

	afterAll(async () => {
		await orm.close();
	});

	beforeEach(async () => {
		module = await Test.createTestingModule({
			providers: [
				TaskUC,
				{
					provide: TaskRepo,
					useValue: {
						findAllByParentIds() {
							throw new Error('Please write a mock for TaskRepo.findAllByParentIds');
						},
						findAllFinishedByParentIds() {
							throw new Error('Please write a mock for TaskRepo.findAllFinishedByParentIds');
						},
					},
				},
				{
					provide: UserRepo,
					useValue: {
						findById() {
							throw new Error('Please write a mock for UserRepo.findById');
						},
					},
				},
				{
					provide: TaskAuthorizationService,
					useValue: {
						getPermittedCourses() {
							throw new Error('Please write a mock for TaskAuthorizationService.getPermittedCourses');
						},
						getPermittedLessons() {
							throw new Error('Please write a mock for TaskAuthorizationService.getPermittedLessons');
						},
						hasTaskPermission() {
							throw new Error('Please write a mock for TaskAuthorizationService.hasTaskPermission');
						},
						hasOneOfTaskDashboardPermissions() {
							throw new Error('Please write a mock for TaskAuthorizationService.hasOneOfTaskDashboardPermissions');
						},
					},
				},
			],
		}).compile();

		service = module.get(TaskUC);
		taskRepo = module.get(TaskRepo);
		userRepo = module.get(UserRepo);
		authorizationService = module.get(TaskAuthorizationService);
	});

	afterEach(async () => {
		await module.close();
	});

	const setUserRepoMock = {
		findById: () => {
			const spy = jest.spyOn(userRepo, 'findById').mockImplementation(() => Promise.resolve(user));

			return spy;
		},
	};

	const setTaskRepoMock = {
		findAllByParentIds: (tasks: Task[] = []) => {
			const spy = jest
				.spyOn(taskRepo, 'findAllByParentIds')
				.mockImplementation(() => Promise.resolve([tasks, tasks.length]));

			return spy;
		},
		findAllFinishedByParentIds: (tasks: Task[] = []) => {
			const spy = jest
				.spyOn(taskRepo, 'findAllFinishedByParentIds')
				.mockImplementation(() => Promise.resolve([tasks, tasks.length]));

			return spy;
		},
	};

	const setAuthorizationServiceMock = {
		getPermittedCourses: (courses: Course[] = []) => {
			const spy = jest
				.spyOn(authorizationService, 'getPermittedCourses')
				.mockImplementation(() => Promise.resolve(courses));

			return spy;
		},
		getPermittedLessons: (lessons: Lesson[] = []) => {
			const spy = jest
				.spyOn(authorizationService, 'getPermittedLessons')
				.mockImplementation(() => Promise.resolve(lessons));

			return spy;
		},
		hasTaskPermission: (hasWritePermission = false) => {
			const spy = jest.spyOn(authorizationService, 'hasTaskPermission').mockImplementation(() => hasWritePermission);

			return spy;
		},
		hasOneOfTaskDashboardPermissions: () => {
			const spy = jest
				.spyOn(authorizationService, 'hasOneOfTaskDashboardPermissions')
				.mockImplementation((_: User, permission: TaskDashBoardPermission | TaskDashBoardPermission[]) => {
					const hasPermission: boolean = Array.isArray(permission)
						? permission.some((p) => currentPermissions.includes(p))
						: currentPermissions.includes(permission);

					return hasPermission;
				});

			return spy;
		},
	};

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	const findAllMock = (data?: {
		tasks?: Task[];
		lessons?: Lesson[];
		courses?: Course[];
		hasWritePermission?: boolean;
		hasOneOfTaskDashboardPermissions?: boolean;
	}) => {
		const spy1 = setTaskRepoMock.findAllFinishedByParentIds(data?.tasks);
		const spy2 = setAuthorizationServiceMock.getPermittedCourses(data?.courses);
		const spy3 = setAuthorizationServiceMock.getPermittedLessons(data?.lessons);
		const spy4 = setAuthorizationServiceMock.hasTaskPermission(data?.hasWritePermission);
		const spy5 = setAuthorizationServiceMock.hasOneOfTaskDashboardPermissions();
		const spy6 = setUserRepoMock.findById();
		const spy7 = setTaskRepoMock.findAllByParentIds(data?.tasks);

		const mockRestore = () => {
			spy1.mockRestore();
			spy2.mockRestore();
			spy3.mockRestore();
			spy4.mockRestore();
			spy5.mockRestore();
			spy6.mockRestore();
			spy7.mockRestore();
		};

		return mockRestore;
	};
	describe('findAllFinished', () => {
		beforeEach(() => {
			const permissions = [TaskDashBoardPermission.studentDashboard];
			user = setupUser(permissions);
		});

		it('should call user repo findById', async () => {
			const mockRestore = findAllMock();
			const spy = setUserRepoMock.findById();

			await service.findAllFinished(user.id);

			expect(spy).toHaveBeenCalled();

			mockRestore();
		});

		it('should return task for a user', async () => {
			const task = taskFactory.finished(user).build();
			const mockRestore = findAllMock({ tasks: [task], hasOneOfTaskDashboardPermissions: true });

			const [, total] = await service.findAllFinished(user.id);

			expect(total).toEqual(1);

			mockRestore();
		});

		it('should call task repo findAllFinishedByParentIds', async () => {
			const mockRestore = findAllMock({ hasOneOfTaskDashboardPermissions: true });
			const spy = setTaskRepoMock.findAllFinishedByParentIds();

			await service.findAllFinished(user.id);

			expect(spy).toHaveBeenCalled();

			mockRestore();
		});

		it('should call task repo findAllFinishedByParentIds for finished tasks', async () => {
			const mockRestore = findAllMock({ hasOneOfTaskDashboardPermissions: true });
			const spy = setTaskRepoMock.findAllFinishedByParentIds();

			await service.findAllFinished(user.id);

			const expectedParams = [
				{
					creatorId: user.id,
					openCourseIds: [],
					finishedCourseIds: [],
					lessonIdsOfOpenCourses: [],
					lessonIdsOfFinishedCourses: [],
				},
				{ pagination: undefined },
			];
			expect(spy).toHaveBeenCalledWith(...expectedParams);

			mockRestore();
		});

		it('should call authorization service getPermittedCourses', async () => {
			const mockRestore = findAllMock({});
			const spy = setAuthorizationServiceMock.getPermittedCourses();

			await service.findAllFinished(user.id);

			expect(spy).toHaveBeenCalled();

			mockRestore();
		});

		it('should call authorization service getPermittedLessons', async () => {
			const mockRestore = findAllMock({});
			const spy = setAuthorizationServiceMock.getPermittedLessons();

			await service.findAllFinished(user.id);

			expect(spy).toHaveBeenCalled();

			mockRestore();
		});

		it('should return a counted type', async () => {
			const mockRestore = findAllMock({});

			const [data, count] = await service.findAllFinished(user.id);

			expect(typeof count).toBe('number');
			expect(Array.isArray(data)).toBe(true);

			mockRestore();
		});

		it('should return read status vo for tasks', async () => {
			const student = userFactory.build();
			const task = taskFactory.finished(student).build();
			const mockRestore = findAllMock({ tasks: [task] });
			const status = task.createStudentStatusForUser(student);

			const [data] = await service.findAllFinished(student.id);

			expect(data[0]).toEqual({ task, status });

			mockRestore();
		});

		it('should pass skip option', async () => {
			const mockRestore = findAllMock({});
			const spy = setTaskRepoMock.findAllFinishedByParentIds();
			const skip = 5;

			await service.findAllFinished(user.id, { skip });

			const expectedParams = [
				{
					creatorId: user.id,
					openCourseIds: [],
					finishedCourseIds: [],
					lessonIdsOfOpenCourses: [],
					lessonIdsOfFinishedCourses: [],
				},
				{ pagination: { skip: 5 } },
			];
			expect(spy).toHaveBeenCalledWith(...expectedParams);

			mockRestore();
		});

		it('should pass limit option', async () => {
			const mockRestore = findAllMock({});
			const spy = setTaskRepoMock.findAllFinishedByParentIds();
			const limit = 5;
			await service.findAllFinished(user.id, { limit });

			const expectedParams = [
				{
					creatorId: user.id,
					openCourseIds: [],
					finishedCourseIds: [],
					lessonIdsOfOpenCourses: [],
					lessonIdsOfFinishedCourses: [],
				},
				{ pagination: { limit: 5 } },
			];
			expect(spy).toHaveBeenCalledWith(...expectedParams);

			mockRestore();
		});

		it('should used permitted lessons for search finished tasks', async () => {
			const lesson = lessonFactory.buildWithId();
			const mockRestore = findAllMock({ lessons: [lesson] });
			const spy = setTaskRepoMock.findAllFinishedByParentIds();

			await service.findAllFinished(user.id);

			const expectedParams = [
				{
					creatorId: user.id,
					openCourseIds: [],
					finishedCourseIds: [],
					lessonIdsOfOpenCourses: [lesson.id],
					lessonIdsOfFinishedCourses: [],
				},
				{ pagination: undefined },
			];
			expect(spy).toHaveBeenCalledWith(...expectedParams);

			mockRestore();
		});

		it('should used permitted courses for search finished tasks', async () => {
			const course = courseFactory.buildWithId();
			const mockRestore = findAllMock({ courses: [course] });
			const spy = setTaskRepoMock.findAllFinishedByParentIds();

			await service.findAllFinished(user.id);

			const expectedParams = [
				{
					creatorId: user.id,
					openCourseIds: [course.id],
					finishedCourseIds: [],
					lessonIdsOfOpenCourses: [],
					lessonIdsOfFinishedCourses: [],
				},
				{ pagination: undefined },
			];
			expect(spy).toHaveBeenCalledWith(...expectedParams);

			mockRestore();
		});

		describe('when user hasWritePermission and has teacherDashboard permission', () => {
			beforeEach(() => {
				const permissions = [TaskDashBoardPermission.teacherDashboard];
				user = setupUser(permissions);
			});

			it('should return finished tasks', async () => {
				const task = taskFactory.finished(user).build();
				const mockRestore = findAllMock({
					tasks: [task],
					hasWritePermission: true,
				});

				const [, total] = await service.findAllFinished(user.id);

				expect(total).toEqual(1);

				mockRestore();
			});

			it('should select the right status', async () => {
				const course = courseFactory.build({ teachers: [user] });
				const task = taskFactory.finished(user).build({ course });
				const mockRestore = findAllMock({
					tasks: [task],
					courses: [course],
					hasWritePermission: true,
				});

				const spy = jest.spyOn(task, 'createTeacherStatusForUser');

				await service.findAllFinished(user.id);

				expect(spy).toHaveBeenCalled();

				mockRestore();
			});
		});

		describe('when user has no task overview permissions', () => {
			beforeEach(() => {
				const permissions = [];
				user = setupUser(permissions);
			});

			it('should fail with UnauthorizedException', async () => {
				const mockRestore = findAllMock({ hasOneOfTaskDashboardPermissions: false });
				await expect(() => service.findAllFinished(user.id)).rejects.toThrow(UnauthorizedException);

				mockRestore();
			});
		});
	});

	describe('findAll', () => {
		beforeEach(() => {
			const permissions = [TaskDashBoardPermission.studentDashboard];
			user = setupUser(permissions);
		});

		it('should throw if user has no required permission', async () => {
			const permissions = [];
			user = setupUser(permissions);
			const mockRestore = findAllMock();

			const paginationQuery = new PaginationQuery();
			const action = async () => service.findAll(user.id, paginationQuery);
			await expect(action()).rejects.toThrow();

			mockRestore();
		});

		it(`should pass if user has ${TaskDashBoardPermission.studentDashboard} permission`, async () => {
			const mockRestore = findAllMock({});

			const paginationQuery = new PaginationQuery();
			const result = await service.findAll(user.id, paginationQuery);

			expect(result).toEqual([[], 0]);

			mockRestore();
		});

		it(`should pass if user has ${TaskDashBoardPermission.teacherDashboard} permission`, async () => {
			const mockRestore = findAllMock({});

			const paginationQuery = new PaginationQuery();
			const result = await service.findAll(user.id, paginationQuery);

			expect(result).toEqual([[], 0]);

			mockRestore();
		});
	});

	describe('as a student', () => {
		beforeEach(() => {
			const permissions = [TaskDashBoardPermission.studentDashboard];
			user = setupUser(permissions);
		});

		it('should get parent ids for student role', async () => {
			const mockRestore = findAllMock({});
			const spy = setAuthorizationServiceMock.getPermittedCourses();

			const paginationQuery = new PaginationQuery();
			await service.findAll(user.id, paginationQuery);

			const expectedParams = [user, TaskParentPermission.read];
			expect(spy).toHaveBeenCalledWith(...expectedParams);

			mockRestore();
		});

		it('should return a counted result', async () => {
			const mockRestore = findAllMock({});

			const paginationQuery = new PaginationQuery();
			const [result, count] = await service.findAll(user.id, paginationQuery);
			expect(Array.isArray(result)).toBeTruthy();
			expect(count).toEqual(0);

			mockRestore();
		});

		it('should find current tasks by permitted parent ids ordered by dueDate', async () => {
			const spy = setTaskRepoMock.findAllByParentIds([]);
			const course = courseFactory.buildWithId();
			const lesson = lessonFactory.buildWithId({ course, hidden: false });

			const mockRestore = findAllMock({
				lessons: [lesson],
				courses: [course],
			});
			const spyGetPermittedLessons = setAuthorizationServiceMock.getPermittedLessons([lesson]);
			const spyGetPermittedCourses = setAuthorizationServiceMock.getPermittedCourses([course]);

			const paginationQuery = new PaginationQuery();
			await service.findAll(user.id, paginationQuery);

			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0][0]).toEqual({
				courseIds: [course.id],
				lessonIds: [lesson.id],
			});
			expect(spy.mock.calls[0][1]?.draft).toEqual(false);
			expect(spy.mock.calls[0][1]?.finished).toEqual({ userId: user.id, value: false });
			expect(spy.mock.calls[0][1]?.afterDueDateOrNone).toBeDefined();
			expect(spy.mock.calls[0][2]).toEqual({
				order: { dueDate: 'asc' },
				pagination: { skip: paginationQuery.skip, limit: paginationQuery.limit },
			});

			expect(spyGetPermittedLessons).toHaveBeenCalledWith(user, [course]);

			spy.mockRestore();
			spyGetPermittedLessons.mockRestore();
			spyGetPermittedCourses.mockRestore();
			mockRestore();
		});

		it('should return well formed task with course and status', async () => {
			const course = courseFactory.build();
			const task = taskFactory.build({ course });

			const mockRestore = findAllMock({
				tasks: [task],
			});

			const paginationQuery = new PaginationQuery();
			const [result] = await service.findAll(user.id, paginationQuery);
			expect(result[0]).toEqual({
				task,
				status: { submitted: 0, maxSubmissions: 1, graded: 0, isDraft: false, isSubstitutionTeacher: false },
			});
			expect(result[0].task.course).toBeDefined();

			mockRestore();
		});

		it('should find a list of tasks', async () => {
			const course = courseFactory.build();
			const task1 = taskFactory.build({ course });
			const task2 = taskFactory.build({ course });
			const task3 = taskFactory.build({ course });

			const mockRestore = findAllMock({
				tasks: [task1, task2, task3],
			});

			const paginationQuery = new PaginationQuery();
			const [result, count] = await service.findAll(user.id, paginationQuery);
			expect(count).toEqual(3);
			expect(result.length).toEqual(3);

			mockRestore();
		});

		it('should compute submitted status for task', async () => {
			const student = user;
			const course = courseFactory.build();
			const task = taskFactory.build({ course });
			task.submissions.add(submissionFactory.build({ task, student }));

			const mockRestore = findAllMock({ tasks: [task] });

			const paginationQuery = new PaginationQuery();
			const [result] = await service.findAll(user.id, paginationQuery);

			expect(result.length).toEqual(1);
			expect(result[0].status).toEqual({
				graded: 0,
				submitted: 1,
				maxSubmissions: 1,
				isDraft: false,
				isSubstitutionTeacher: false,
			});

			mockRestore();
		});

		it('should only count the submissions of the given user', async () => {
			const student1 = user;
			const student2 = userFactory.build();
			const course = courseFactory.build();
			const task = taskFactory.build({ course });
			task.submissions.add(submissionFactory.build({ task, student: student1 }));
			task.submissions.add(submissionFactory.build({ task, student: student2 }));

			const mockRestore = findAllMock({ tasks: [task] });

			const paginationQuery = new PaginationQuery();
			const [result] = await service.findAll(user.id, paginationQuery);

			expect(result.length).toEqual(1);
			expect(result[0].status).toEqual({
				graded: 0,
				submitted: 1,
				maxSubmissions: 1,
				isDraft: false,
				isSubstitutionTeacher: false,
			});

			mockRestore();
		});

		it('should compute graded status for task', async () => {
			const student = user;
			const course = courseFactory.build();
			const task = taskFactory.build({ course });
			const submission = submissionFactory.build({ task, student });
			task.submissions.add(submission);

			const spyGraded = jest.spyOn(submission, 'isGraded').mockImplementation(() => true);
			const mockRestore = findAllMock({ tasks: [task] });

			const paginationQuery = new PaginationQuery();
			const [result] = await service.findAll(user.id, paginationQuery);

			expect(spyGraded).toBeCalled();
			expect(result.length).toEqual(1);
			expect(result[0].status).toEqual({
				graded: 1,
				submitted: 1,
				maxSubmissions: 1,
				isDraft: false,
				isSubstitutionTeacher: false,
			});

			mockRestore();
			spyGraded.mockRestore();
		});

		it('should only count the graded submissions of the given user', async () => {
			const student1 = user;
			const student2 = userFactory.build();
			const course = courseFactory.build();
			const task = taskFactory.build({ course });
			const submission1 = submissionFactory.build({ task, student: student1 });
			const submission2 = submissionFactory.build({ task, student: student2 });
			task.submissions.add(submission1, submission2);

			jest.spyOn(submission1, 'isGraded').mockImplementation(() => true);
			jest.spyOn(submission2, 'isGraded').mockImplementation(() => true);
			const mockRestore = findAllMock({ tasks: [task] });

			const paginationQuery = new PaginationQuery();
			const [result] = await service.findAll(user.id, paginationQuery);

			expect(result.length).toEqual(1);
			expect(result[0].status).toEqual({
				graded: 1,
				submitted: 1,
				maxSubmissions: 1,
				isDraft: false,
				isSubstitutionTeacher: false,
			});

			mockRestore();
		});
	});

	describe('as a teacher', () => {
		beforeEach(() => {
			const permissions = [TaskDashBoardPermission.teacherDashboard];
			user = setupUser(permissions);
		});

		it('should get parent ids for teacher role', async () => {
			const mockRestore = findAllMock({});
			const spy = setAuthorizationServiceMock.getPermittedCourses([]);

			const paginationQuery = new PaginationQuery();
			await service.findAll(user.id, paginationQuery);

			const expectedParams = [user, TaskParentPermission.write];
			expect(spy).toHaveBeenCalledWith(...expectedParams);

			mockRestore();
			spy.mockRestore();
		});

		it('should return a counted result', async () => {
			const mockRestore = findAllMock({});

			const paginationQuery = new PaginationQuery();
			const [result, count] = await service.findAll(user.id, paginationQuery);
			expect(Array.isArray(result)).toBeTruthy();
			expect(count).toEqual(0);

			mockRestore();
		});

		it('should find all tasks by permitted parent ids ordered by newest first', async () => {
			const course = courseFactory.buildWithId();
			const lesson = lessonFactory.buildWithId({ course, hidden: false });
			const tasks = [];
			const mockRestore = findAllMock({
				tasks,
				lessons: [lesson],
				courses: [course],
			});
			const spy = setTaskRepoMock.findAllByParentIds(tasks);

			const paginationQuery = new PaginationQuery();
			await service.findAll(user.id, paginationQuery);

			const notFinished = { userId: user.id, value: false };
			const expectedParams = [
				{ creatorId: user.id, courseIds: [course.id], lessonIds: [lesson.id] },
				{ finished: notFinished },
				{ order: { dueDate: 'desc' }, pagination: { skip: paginationQuery.skip, limit: paginationQuery.limit } },
			];

			expect(spy).toHaveBeenCalledWith(...expectedParams);

			mockRestore();
		});

		it('should return well formed task with course and status', async () => {
			const course = courseFactory.build();
			const task = taskFactory.draft().build({ course });

			const mockRestore = findAllMock({ tasks: [task] });

			const paginationQuery = new PaginationQuery();
			const [result] = await service.findAll(user.id, paginationQuery);
			expect(result[0]).toEqual({
				task,
				status: {
					submitted: 0,
					maxSubmissions: course.getNumberOfStudents(),
					graded: 0,
					isDraft: true,
					isSubstitutionTeacher: false,
				},
			});
			expect(result[0].task.course).toBeDefined();

			mockRestore();
		});

		it('should mark substitution teacher in status', async () => {
			const userData = user;
			const course = courseFactory.build({ substitutionTeachers: [userData] });
			const task = taskFactory.build({ course });

			const mockRestore = findAllMock({ tasks: [task], hasOneOfTaskDashboardPermissions: true });

			const paginationQuery = new PaginationQuery();
			const [result] = await service.findAll(userData.id, paginationQuery);
			expect(result[0].status.isSubstitutionTeacher).toBe(true);

			mockRestore();
		});

		it('should find a list of tasks', async () => {
			const course = courseFactory.build();
			const task1 = taskFactory.build({ course });
			const task2 = taskFactory.build({ course });
			const task3 = taskFactory.build({ course });

			const mockRestore = findAllMock({
				tasks: [task1, task2, task3],
				hasOneOfTaskDashboardPermissions: true,
			});

			const paginationQuery = new PaginationQuery();
			const [result, count] = await service.findAll(user.id, paginationQuery);
			expect(count).toEqual(3);
			expect(result.length).toEqual(3);

			mockRestore();
		});

		it('should compute submitted status for task', async () => {
			const student = user;
			const course = courseFactory.build();
			const task = taskFactory.build({ course });
			task.submissions.add(submissionFactory.build({ task, student }));

			const mockRestore = findAllMock({ tasks: [task], hasOneOfTaskDashboardPermissions: true });

			const paginationQuery = new PaginationQuery();
			const [result] = await service.findAll(user.id, paginationQuery);

			expect(result.length).toEqual(1);
			expect(result[0].status).toEqual({
				graded: 0,
				submitted: 1,
				maxSubmissions: course.getNumberOfStudents(),
				isDraft: false,
				isSubstitutionTeacher: false,
			});

			mockRestore();
		});

		it('should count all student ids of submissions', async () => {
			const student1 = userFactory.buildWithId();
			const student2 = userFactory.buildWithId();
			const course = courseFactory.build();
			const task = taskFactory.build({ course });
			const submission1 = submissionFactory.build({ task, student: student1 });
			const submission2 = submissionFactory.build({ task, student: student2 });
			task.submissions.add(submission1, submission2);

			const mockRestore = findAllMock({ tasks: [task], hasOneOfTaskDashboardPermissions: true });

			const paginationQuery = new PaginationQuery();
			const [result] = await service.findAll(user.id, paginationQuery);

			expect(result.length).toEqual(1);
			expect(result[0].status).toEqual({
				graded: 0,
				submitted: 2,
				maxSubmissions: course.getNumberOfStudents(),
				isDraft: false,
				isSubstitutionTeacher: false,
			});

			mockRestore();
		});

		it('should compute graded status for task', async () => {
			const student = userFactory.build();
			const course = courseFactory.build();
			const task = taskFactory.build({ course });
			const submission = submissionFactory.build({ task, student });
			task.submissions.add(submission);

			const spyGraded = jest.spyOn(submission, 'isGraded').mockImplementation(() => true);
			const mockRestore = findAllMock({ tasks: [task], hasOneOfTaskDashboardPermissions: true });

			const paginationQuery = new PaginationQuery();
			const [result] = await service.findAll(user.id, paginationQuery);

			expect(spyGraded).toBeCalled();
			expect(result.length).toEqual(1);
			expect(result[0].status).toEqual({
				graded: 1,
				submitted: 1,
				maxSubmissions: course.getNumberOfStudents(),
				isDraft: false,
				isSubstitutionTeacher: false,
			});

			mockRestore();
			spyGraded.mockRestore();
		});

		it('should count all student ids of graded submissions', async () => {
			const student1 = user;
			const student2 = userFactory.build();
			const course = courseFactory.build();
			const task = taskFactory.build({ course });
			const submission1 = submissionFactory.build({ task, student: student1 });
			const submission2 = submissionFactory.build({ task, student: student2 });
			task.submissions.add(submission1, submission2);

			jest.spyOn(submission1, 'isGraded').mockImplementation(() => true);
			jest.spyOn(submission2, 'isGraded').mockImplementation(() => true);
			const mockRestore = findAllMock({ tasks: [task], hasOneOfTaskDashboardPermissions: true });

			const paginationQuery = new PaginationQuery();
			const [result] = await service.findAll(user.id, paginationQuery);

			expect(result.length).toEqual(1);
			expect(result[0].status).toEqual({
				graded: 2,
				submitted: 2,
				maxSubmissions: course.getNumberOfStudents(),
				isDraft: false,
				isSubstitutionTeacher: false,
			});

			mockRestore();
		});

		it('should count only unique student ids of graded submissions', async () => {
			const student1 = user;
			const student2 = userFactory.build();
			const course = courseFactory.build();
			const task = taskFactory.build({ course });
			const submission1 = submissionFactory.build({ task, student: student1 });
			const submission2 = submissionFactory.build({ task, student: student2 });
			const submission3 = submissionFactory.build({ task, student: student2 });

			task.submissions.add(submission1, submission2, submission3);

			jest.spyOn(submission1, 'isGraded').mockImplementation(() => true);
			jest.spyOn(submission2, 'isGraded').mockImplementation(() => true);
			jest.spyOn(submission3, 'isGraded').mockImplementation(() => true);
			const mockRestore = findAllMock({ tasks: [task], hasOneOfTaskDashboardPermissions: true });

			const paginationQuery = new PaginationQuery();
			const [result, total] = await service.findAll(user.id, paginationQuery);

			expect(total).toEqual(1);
			expect(result[0].status).toEqual({
				graded: 2,
				submitted: 2,
				maxSubmissions: course.getNumberOfStudents(),
				isDraft: false,
				isSubstitutionTeacher: false,
			});

			mockRestore();
		});

		it('should count only unique student ids of submissions', async () => {
			const student1 = userFactory.buildWithId();
			const student2 = userFactory.buildWithId();
			const course = courseFactory.build();
			const task = taskFactory.build({ course });
			const submission1 = submissionFactory.build({ task, student: student1 });
			const submission2 = submissionFactory.build({ task, student: student1 });
			const submission3 = submissionFactory.build({ task, student: student2 });

			task.submissions.add(submission1, submission2, submission3);

			const mockRestore = findAllMock({ tasks: [task], hasOneOfTaskDashboardPermissions: true });

			const paginationQuery = new PaginationQuery();
			const [result, total] = await service.findAll(user.id, paginationQuery);

			expect(total).toEqual(1);
			expect(result[0].status).toEqual({
				graded: 0,
				submitted: 2,
				maxSubmissions: course.getNumberOfStudents(),
				isDraft: false,
				isSubstitutionTeacher: false,
			});

			mockRestore();
		});
	});
});
