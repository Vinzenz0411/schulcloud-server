import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MikroORM } from '@mikro-orm/core';
import { ManagementTestModule } from '@src/modules/management/management.module';

describe('Database Management Controller (e2e)', () => {
	let app: INestApplication;
	let orm: MikroORM;
	const sampleCollectionName = 'accounts';

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ManagementTestModule],
		}).compile();

		app = module.createNestApplication();
		await app.init();
		orm = module.get(MikroORM);
		await orm.getSchemaGenerator().clearDatabase();
	});

	afterAll(async () => {
		await app.close();
		await orm.close();
	});

	describe('When post to database management route', () => {
		it('should seed all collections', async () => {
			const result = await request(app.getHttpServer()).post(`/management/database/seed`);

			expect(result.status).toEqual(200);
		});
		it('should seed all collections with sync indexes', async () => {
			const result = await request(app.getHttpServer()).get(`/management/database/seed?with-indexes=true`);

			expect(result.status).toEqual(200);
		});
		it('should seed a collection', async () => {
			const result = await request(app.getHttpServer()).post(`/management/database/seed/${sampleCollectionName}`);

			expect(result.status).toEqual(201);
		});
		it('should fail for unknown collection', async () => {
			const result = await request(app.getHttpServer()).post(`/management/database/seed/unknown_collection_name`);

			expect(result.status).toEqual(500);
		});
		it('should export the whole database to filesystem', async () => {
			const result = await request(app.getHttpServer()).post(`/management/database/export`);

			expect(result.status).toEqual(201);
		});
		it('should export a collection to filesystem', async () => {
			const result = await request(app.getHttpServer()).post(`/management/database/export/${sampleCollectionName}`);

			expect(result.status).toEqual(201);
		});
		it('should export a collection to filesystem', async () => {
			const result = await request(app.getHttpServer()).post(`/management/database/sync-indexes`);

			expect(result.status).toEqual(201);
		});
	});
});
