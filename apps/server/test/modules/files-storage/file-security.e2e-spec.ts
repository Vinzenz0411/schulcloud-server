import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Request } from 'express';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/mongodb';

import { FilesStorageTestModule } from '@src/modules/files-storage/files-storage.module';
import { FileRecordListResponse, ScanResultParams } from '@src/modules/files-storage/controller/dto';
import { JwtAuthGuard } from '@src/modules/authentication/guard/jwt-auth.guard';
import { FileRecord, FileRecordParentType, ICurrentUser } from '@shared/domain';
import {
	userFactory,
	roleFactory,
	cleanupCollections,
	mapUserToCurrentUser,
	fileRecordFactory,
	schoolFactory,
} from '@shared/testing';
import { ApiValidationError } from '@shared/common';

const baseRouteName = '/file-security';
const scanResult: ScanResultParams = { virus_detected: false };

class API {
	app: INestApplication;

	constructor(app: INestApplication) {
		this.app = app;
	}

	async put(requestString: string, body: ScanResultParams) {
		const response = await request(this.app.getHttpServer())
			.put(`${baseRouteName}${requestString}`)
			.set('Accept', 'application/json')
			.send(body);

		return {
			result: response.body as FileRecordListResponse,
			error: response.body as ApiValidationError,
			status: response.status,
		};
	}
}

describe(`${baseRouteName} (api)`, () => {
	let app: INestApplication;
	let orm: MikroORM;
	let em: EntityManager;
	let currentUser: ICurrentUser;
	let api: API;
	let validId: string;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [FilesStorageTestModule],
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

		app = module.createNestApplication();
		await app.init();
		orm = app.get(MikroORM);
		em = module.get(EntityManager);
		api = new API(app);
	});

	afterAll(async () => {
		await orm.close();
		await app.close();
	});

	beforeEach(async () => {
		await cleanupCollections(em);
		const roles = roleFactory.buildList(1, { permissions: [] });
		const school = schoolFactory.build();
		const user = userFactory.build({ roles, school });

		await em.persistAndFlush([user]);
		em.clear();

		currentUser = mapUserToCurrentUser(user);
		validId = user.school.id;
	});

	describe('with bad request data', () => {
		it('should return status 400 for invalid token', async () => {
			const fileRecord = fileRecordFactory.build({
				schoolId: validId,
				parentId: validId,
				parentType: FileRecordParentType.School,
			});
			await em.persistAndFlush(fileRecord);
			em.clear();

			const response = await api.put(`/update-status/wrong-token`, scanResult);

			expect(response.status).toEqual(404);
		});
	});

	describe(`with valid request data`, () => {
		it('should return right type of data', async () => {
			const fileRecord = fileRecordFactory.build({
				schoolId: validId,
				parentId: validId,
				parentType: FileRecordParentType.School,
			});
			const token = fileRecord.securityCheck.requestToken || '';
			await em.persistAndFlush(fileRecord);
			em.clear();

			const response = await api.put(`/update-status/${token}`, scanResult);
			const changedFileRecord = await em.findOneOrFail(FileRecord, fileRecord.id);

			expect(changedFileRecord.securityCheck.status).toStrictEqual('verified');
			expect(response.status).toEqual(200);
		});
	});
});
