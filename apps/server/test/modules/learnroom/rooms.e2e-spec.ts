import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Request } from 'express';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/mongodb';
import { ServerTestModule } from '@src/server.module';
import { BoardResponse } from '@src/modules/learnroom/controller/dto';
import { JwtAuthGuard } from '@src/modules/authentication/guard/jwt-auth.guard';
import {
	userFactory,
	courseFactory,
	taskFactory,
	cleanupCollections,
	roleFactory,
	boardFactory,
	lessonFactory,
	mapUserToCurrentUser,
} from '@shared/testing';
import { ICurrentUser, Task } from '@shared/domain';

describe('Rooms Controller (e2e)', () => {
	let app: INestApplication;
	let orm: MikroORM;
	let em: EntityManager;
	let currentUser: ICurrentUser;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [ServerTestModule],
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({
				canActivate(context: ExecutionContext) {
					const req: Request = context.switchToHttp().getRequest();
					req.user = currentUser;
					return true;
				},
			})
			.compile();

		app = moduleFixture.createNestApplication();
		await app.init();
		orm = app.get(MikroORM);
		em = app.get(EntityManager);
	});

	afterEach(async () => {
		await cleanupCollections(em);
		await app.close();
		await orm.close();
	});

	it('[GET] board', async () => {
		const roles = roleFactory.buildList(1, { permissions: [] });
		const student = userFactory.build({ roles });
		const course = courseFactory.build({ students: [student] });
		const task = taskFactory.build({ course });

		await em.persistAndFlush([course, task]);
		em.clear();

		currentUser = mapUserToCurrentUser(student);

		const response = await request(app.getHttpServer()).get(`/rooms/${course.id}/board`);

		expect(response.status).toEqual(200);
		const body = response.body as BoardResponse;
		expect(body.roomId).toEqual(course.id);
	});

	describe('[PATCH] ElementVisibility', () => {
		it('should return 200', async () => {
			const roles = roleFactory.buildList(1, { permissions: [] });
			const teacher = userFactory.build({ roles });
			const course = courseFactory.build({ teachers: [teacher] });
			const board = boardFactory.buildWithId({ course });
			const task = taskFactory.draft().build({ course });
			board.syncTasksFromList([task]);

			await em.persistAndFlush([course, board, task]);
			em.clear();

			currentUser = mapUserToCurrentUser(teacher);
			const params = { visibility: true };

			const response = await request(app.getHttpServer())
				.patch(`/rooms/${course.id}/elements/${task.id}/visibility`)
				.send(params);

			expect(response.status).toEqual(200);
		});

		it('should make task visible', async () => {
			const roles = roleFactory.buildList(1, { permissions: [] });
			const teacher = userFactory.build({ roles });
			const course = courseFactory.build({ teachers: [teacher] });
			const board = boardFactory.buildWithId({ course });
			const task = taskFactory.draft().build({ course });
			board.syncTasksFromList([task]);

			await em.persistAndFlush([course, board, task]);
			em.clear();

			currentUser = mapUserToCurrentUser(teacher);
			const params = { visibility: true };

			await request(app.getHttpServer()).patch(`/rooms/${course.id}/elements/${task.id}/visibility`).send(params);
			const updatedTask = await em.findOneOrFail(Task, task.id);

			expect(updatedTask.isDraft()).toEqual(false);
		});

		it('should make task invisibible', async () => {
			const roles = roleFactory.buildList(1, { permissions: [] });
			const teacher = userFactory.build({ roles });
			const course = courseFactory.build({ teachers: [teacher] });
			const board = boardFactory.buildWithId({ course });
			const task = taskFactory.build({ course });
			board.syncTasksFromList([task]);

			await em.persistAndFlush([course, board, task]);
			em.clear();

			currentUser = mapUserToCurrentUser(teacher);
			const params = { visibility: false };

			await request(app.getHttpServer()).patch(`/rooms/${course.id}/elements/${task.id}/visibility`).send(params);
			const updatedTask = await em.findOneOrFail(Task, task.id);

			expect(updatedTask.isDraft()).toEqual(true);
		});
	});

	describe('[PATCH] order', () => {
		it('should return 200', async () => {
			const roles = roleFactory.buildList(1, { permissions: [] });
			const teacher = userFactory.build({ roles });
			const course = courseFactory.build({ teachers: [teacher] });
			const board = boardFactory.buildWithId({ course });
			const tasks = taskFactory.buildList(3, { course });
			const lessons = lessonFactory.buildList(3, { course });
			board.syncTasksFromList(tasks);
			board.syncLessonsFromList(lessons);

			await em.persistAndFlush([course, board, ...tasks, ...lessons]);
			em.clear();

			currentUser = mapUserToCurrentUser(teacher);
			const params = {
				elements: [tasks[2], lessons[1], tasks[0], lessons[2], tasks[1], lessons[0]].map((el) => el.id),
			};

			const response = await request(app.getHttpServer()).patch(`/rooms/${course.id}/board/order`).send(params);

			expect(response.status).toEqual(200);
		});
	});
});
