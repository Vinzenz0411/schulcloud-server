import { Test, TestingModule } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/core';
import { PaginationQuery } from '@shared/controller';
import { Counted, IFindOptions, Team, User } from '@shared/domain';

import { userFactory, roleFactory, setupEntities, teamFactory } from '@shared/testing';
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
						findByName(name: string, options?: IFindOptions<Team>): Promise<Counted<Team[]>> {
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

	const setTeamRepoMock = {
		findByName: (teams: Team[] = []) => {
			const spy = jest.spyOn(teamRepo, 'findByName').mockImplementation(() => Promise.resolve([teams, teams.length]));

			return spy;
		},
	};

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
	describe('findAll', () => {
		it('should pass', async () => {
			const spy = setTeamRepoMock.findByName();
			const teamName = 'team1';
			const paginationQuery = new PaginationQuery();
			await service.findAll(teamName, paginationQuery);
			expect(spy).toHaveBeenCalled();
			// expect(result).toEqual([[], 0]);
		});

		it('should return teams', async () => {
			const teams = teamFactory.buildList(2);
			const spy = jest.spyOn(teamRepo, 'findByName').mockImplementation((name: string) => {
				return Promise.resolve([teams, 5]);
			});

			const [array, count] = await service.findAll('someTeamId');
			expect(count).toEqual(5);
			expect(array).toEqual(teams);
		});

		it('should return full team after remove user', async () => {
			const teams = teamFactory.buildList(2);
			const spy = jest.spyOn(teamRepo, 'findByName').mockImplementation((name: string) => {
				return Promise.resolve([teams, 2]);
			});
			if (teams[0].userIds) {
				const team = await service.removeUserFromTeam(teams[0].name, teams[0].userIds[0].userId._id.toString());
			}
		});
	});
});
