import { Test, TestingModule } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/core';
import { PaginationQuery } from '@shared/controller';
import { Team, User } from '@shared/domain';

import { userFactory, roleFactory, setupEntities } from '@shared/testing';
import { TeamRepo, UserRepo } from '@shared/repo';
import { TeamUC } from './team.uc';

let user!: User;

describe('TeamUC', () => {
	let module: TestingModule;
	let service: TeamUC;
	let teamRepo: TeamRepo;
	let userRepo: UserRepo;
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
				TeamUC,
				{
					provide: TeamRepo,
					useValue: {
						findByName() {
							throw new Error('Please write a mock for TeamRepo.findByName');
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
			],
		}).compile();

		service = module.get(TeamUC);
		teamRepo = module.get(TeamRepo);
		userRepo = module.get(UserRepo);
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

	/*
	const setTeamRepoMock = {
		findByName: (teams: Team[] = []) => {
			const spy = jest.spyOn(teamRepo, 'findByName').mockImplementation(() => Promise.resolve([teams, teams.length]));

			return spy;
		},
	};
*/

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
	/*
	describe('findAll', () => {
		beforeEach(() => {
			// user = setupUser();
		});


	it('should call user repo findById', async () => {
		const spy = setUserRepoMock.findById();
		const teamName = 'team1';
		const paginationQuery = new PaginationQuery();

		await service.findAll(teamName, paginationQuery);
		expect(spy).toHaveBeenCalled();
	});
*/
	it('should pass', async () => {
		const teamName = 'team1';
		const paginationQuery = new PaginationQuery();
		const result = await service.findAll(teamName, paginationQuery);
		expect(result).toEqual([[], 0]);
	});
});
