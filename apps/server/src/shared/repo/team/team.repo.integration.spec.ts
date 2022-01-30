import { EntityManager } from '@mikro-orm/mongodb';
import { Test, TestingModule } from '@nestjs/testing';
import { Task } from '@shared/domain';

import { MongoMemoryDatabaseModule } from '@shared/infra/database';
import { cleanupCollections } from '@shared/testing/cleanup-collections';
import { teamFactory } from '@shared/testing/factory/team.factory';

import { TeamRepo } from './team.repo';

describe('TeamRepo', () => {
	let module: TestingModule;
	let repo: TeamRepo;
	let em: EntityManager;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [MongoMemoryDatabaseModule.forRoot()],
			providers: [TeamRepo],
		}).compile();
		repo = module.get(TeamRepo);
		em = module.get(EntityManager);
	});

	afterAll(async () => {
		await module.close();
	});

	afterEach(async () => {
		await cleanupCollections(em);
		await em.nativeDelete(Task, {});
	});

	describe('findByName', () => {
		describe('find by name', () => {
			it('should find teams by name', async () => {
				const teamName1 = 'name1';
				const teamName2 = 'name2';
				const team1 = teamFactory.build({ name: teamName1 });
				const team2 = teamFactory.build({ name: teamName2 });

				await em.persistAndFlush([team1, team2]);
				em.clear();

				const [result, total] = await repo.findByName(teamName1);
				expect(total).toEqual(1);
				expect(result[0].name).toEqual(teamName1);
			});
		});
	});
});
