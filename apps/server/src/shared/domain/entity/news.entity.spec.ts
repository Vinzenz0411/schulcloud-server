import { wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/mongodb';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryDatabaseModule } from '@shared/infra/database';
import { courseNewsFactory, cleanUpCollections } from '@shared/testing';
import { News } from './news.entity';

describe('News entity', () => {
	let em: EntityManager;
	let module: TestingModule;

	const createNews = async (): Promise<News> => {
		const news = courseNewsFactory.build();

		await em.persistAndFlush(news);
		em.clear();

		return news;
	};

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [MongoMemoryDatabaseModule.forRoot()],
		}).compile();

		em = module.get(EntityManager);
	});

	afterAll(async () => {
		await module.close();
	});

	afterEach(async () => {
		await cleanUpCollections(em);
	});

	it('can do lazy loading without a repo or direct access to the entity manager', async () => {
		const newsId = (await createNews()).id;

		const news = await em.findOneOrFail(News, { id: newsId });

		expect(news.school.id).toBeDefined();
		expect(news.school.name).toBeUndefined();

		let isSchoolInitialized = wrap(news.school).isInitialized();
		expect(isSchoolInitialized).toEqual(false);

		// look ma, no em needed! => trigger db call
		await wrap(news.school).init();
		isSchoolInitialized = wrap(news.school).isInitialized();
		expect(isSchoolInitialized).toEqual(true);
		expect(news.school.name).toBeDefined();
	});

	it('needs wrapping of the reference to get access to the IWrappedEntity interface', async () => {
		const newsId = (await createNews()).id;

		const news = await em.findOneOrFail(News, { id: newsId });

		await em.populate([news], 'school');

		// we have to wrap the reference as well to get access to the IWrappedEntity interface
		const isSchoolInitialized = wrap(news.school).isInitialized();
		expect(isSchoolInitialized).toEqual(true);
		expect(news.school.name).toBeDefined();
	});
});
