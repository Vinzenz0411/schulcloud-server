import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Request } from 'express';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EntityId } from '@shared/domain';
import * as moment from 'moment';
import { PaginationResponse } from '@shared/controller/dto/pagination.response';
import { ServerModule } from '../../../src/server.module';
import { JwtAuthGuard } from '../../../src/modules/authentication/guard/jwt-auth.guard';
import { ICurrentUser } from '../../../src/modules/authentication/interface/jwt-payload';

import { News, NewsTargetModel, NewsTargetModelValue } from '../../../src/modules/news/entity';
import { CreateNewsParams, NewsResponse, UpdateNewsParams } from '../../../src/modules/news/controller/dto';
import { AuthorizationService } from '../../../src/modules/authorization/authorization.service';

jest.setTimeout(30000);

describe('News Controller (e2e)', () => {
	let app: INestApplication;
	let orm: MikroORM;
	let mongod: MongoMemoryServer;
	let em: EntityManager;
	const user: ICurrentUser = {
		userId: '0000d224816abba584714c9c',
		roles: [],
		schoolId: '5f2987e020834114b8efd6f8',
		accountId: '0000d225816abba584714c9d',
	};
	const courseTargetId = new ObjectId().toHexString();
	const unpublishedCourseTargetId = new ObjectId().toHexString();
	const teamTargetId = new ObjectId().toHexString();
	const targets = [
		{
			targetModel: NewsTargetModel.Course,
			targetIds: [courseTargetId, unpublishedCourseTargetId],
		},
		{
			targetModel: NewsTargetModel.Team,
			targetIds: [teamTargetId],
		},
	];
	beforeAll(async () => {
		mongod = new MongoMemoryServer();
		const module: TestingModule = await Test.createTestingModule({
			imports: [ServerModule],
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({
				canActivate(context: ExecutionContext) {
					const req: Request = context.switchToHttp().getRequest();
					req.user = user;
					return true;
				},
			})
			.overrideProvider(AuthorizationService)
			.useValue({
				checkEntityPermissions() {},
				// eslint-disable-next-line @typescript-eslint/no-shadow
				getPermittedEntities(userId, targetModel, permissions) {
					return targets.filter((target) => target.targetModel === targetModel).flatMap((target) => target.targetIds);
				},
				getEntityPermissions() {
					return ['NEWS_VIEW', 'NEWS_EDIT'];
				},
			})
			.compile();
		// const legacyApp = await legacyAppPromise;
		// const adapter = new ExpressAdapter(legacyApp);
		// legacyApp.setup();
		app = module.createNestApplication();
		await app.init();
		orm = module.get<MikroORM>(MikroORM);
		em = module.get<EntityManager>(EntityManager);
	});

	beforeEach(async () => {
		await em.nativeDelete(News, {});
	});

	afterAll(async () => {
		await app.close();
		await orm.close();
	});

	const newTestNews = (targetModel: NewsTargetModelValue, targetId: EntityId, unpublished = false): News => {
		const displayAt = unpublished ? moment().add(1, 'days').toDate() : moment().subtract(1, 'days').toDate();
		const news = News.createInstance(targetModel, {
			school: user.schoolId,
			title: 'test course news',
			content: 'content',
			target: targetId,

			displayAt,
			creator: user.userId,
		});
		return news;
	};

	const createTestNews = async (targetModel: NewsTargetModelValue, targetId: EntityId, unpublished = false) => {
		const news = newTestNews(targetModel, targetId, unpublished);
		await em.persistAndFlush(news);
		return news;
	};
	describe('GET /news', () => {
		it('should get empty response if there is no news', async () => {
			const response = await request(app.getHttpServer()).get(`/news`).expect(200);
			const { data, total } = response.body as PaginationResponse<NewsResponse[]>;
			expect(total).toBe(0);
			expect(data.length).toBe(0);
		});

		it('should get for /news without parameters', async () => {
			const news = await createTestNews(NewsTargetModel.Course, courseTargetId);
			const expected = {
				data: [news],
				total: 1,
			};
			const response = await request(app.getHttpServer()).get(`/news`).expect(200);
			const { data, total } = response.body as PaginationResponse<NewsResponse[]>;
			expect(total).toBe(expected.total);
			expect(data.length).toBe(expected.data.length);
			expect(data[0].id).toBe(expected.data[0]._id.toString());
		});

		it('should get for /news with unpublished params only unpublished news', async () => {
			const publishedNews = await createTestNews(NewsTargetModel.Course, courseTargetId, false);
			const unpublishedNews = await createTestNews(NewsTargetModel.Course, unpublishedCourseTargetId, true);
			const expected = {
				data: [unpublishedNews],
				total: 1,
			};
			const response = await request(app.getHttpServer()).get(`/news?unpublished=true`).expect(200);
			const { data, total } = response.body as PaginationResponse<NewsResponse[]>;

			expect(total).toBe(expected.total);
			expect(data.length).toBe(expected.data.length);
			expect(data[0].id).toBe(expected.data[0]._id.toString());
		});
	});

	describe('GET /news/{id}', () => {
		it('should get news by id', async () => {
			const news = await createTestNews(NewsTargetModel.Course, courseTargetId);
			const response = await request(app.getHttpServer()).get(`/news/${news._id.toHexString()}`).expect(200);
			const body = response.body as NewsResponse;
			expect(body.id).toBe(news._id.toString());
		});

		it('should throw not found if news was not found', async () => {
			const randomId = new ObjectId().toHexString();
			await request(app.getHttpServer()).get(`/news/${randomId}`).expect(404);
		});
	});

	describe('POST /news', () => {
		it('should create news by input params', async () => {
			const courseId = new ObjectId().toString();

			const params = new CreateNewsParams();
			Object.assign(params, {
				title: 'test course news',
				body: 'content',
				targetModel: NewsTargetModel.Course,
				targetId: courseId,
				displayAt: new Date(),
			});

			const response = await request(app.getHttpServer()).post(`/news`).send(params).expect(201);
			const body = response.body as NewsResponse;
			expect(body.id).toBeDefined();
			expect(body.title).toBe(params.title);
			expect(body.targetId).toBe(params.targetId);
		});
	});

	/*
	TODO:
 describe('PATCH /news', () => {
 	it('should update news by update params', async () => {
 		const news = await createTestNews(NewsTargetModel.Course, courseTargetId);

 		const courseId = new ObjectId().toString();

 		const params = new UpdateNewsParams();
 		Object.assign(params, {
 			title: 'test course news',
 			body: 'content',
 			targetModel: NewsTargetModel.Course,
 			targetId: courseId,
 			displayAt: new Date(),
 		});

 		const response = await request(app.getHttpServer())
 			.patch(`/news/${news._id.toHexString()}`)
 			.send(params)
 			.expect(201);
 		const body = response.body as NewsResponse;
 		expect(body.id).toBeDefined();
 		expect(body.title).toBe(params.title);
 		expect(body.targetId).toBe(params.targetId);
 	});
	 });
	 */
});
