const { ObjectId } = require('mongoose').Types;
const { expect } = require('chai');
const logger = require('../../../src/logger/index');
const { BadRequest } = require('../../../src/errors');

const appPromise = require('../../../src/app');
const {
	createTestUser,
	cleanup,
	teams: teamsHelper,
	generateRequestParams,
	createTestAccount,
} = require('../helpers/testObjects')(appPromise);
const testHelper = require('../helpers/testObjects')(appPromise);

const { equal: equalIds } = require('../../../src/helper/compare').ObjectId;

describe('Test team basic methods', () => {
	let app;
	let server;
	let teamService;
	let addService;

	before(async () => {
		app = await appPromise;
		teamService = app.service('/teams');
		addService = app.service('/teams/extern/add');
		addService.setup(app);
		server = await app.listen();
	});

	after((done) => {
		server.close(done);
	});

	describe('teams create', () => {
		let team;
		let teamId;
		let userId;

		before(async () => {
			const user = await createTestUser({ roles: ['administrator'] }).catch((err) => {
				logger.warning('Can not create test user', err);
			});

			const schoolId = user.schoolId.toString();
			userId = user._id.toString();
			const fakeLoginParams = {
				account: { userId },
				authenticated: true,
				provider: 'rest',
				query: {},
			};

			team = await teamService
				.create(
					{
						name: 'TestTeam',
						schoolId,
						userIds: [userId],
					},
					fakeLoginParams
				)
				.catch((err) => {
					logger.warning('Can not create test team', err);
				});

			teamId = team._id.toString();

			return Promise.resolve();
		});

		after(() => Promise.all([cleanup(), teamsHelper.removeOne(teamId)]));

		it('should for extern request only return the _id', () => {
			expect(Object.keys(team)).to.be.an('array').to.has.lengthOf(1);
			expect(ObjectId.isValid(team._id)).to.be.true;
		});

		it('should have 2 valid filePermissions that has ref to valid roles', async () => {
			const { filePermission } = await app.service('teams').get(teamId);
			expect(filePermission).to.be.an('array').to.have.lengthOf(2);
			expect(ObjectId.isValid(filePermission[0].refId)).to.be.true;
			expect(ObjectId.isValid(filePermission[1].refId)).to.be.true;
		});

		it('should find created test team for user', async () => {
			const result = await app.service('teams').find(userId);
			const elements = [];
			result.data.forEach((element) => {
				elements.push(element._id);
			});
			const testTeam = elements.pop();
			expect(testTeam.toString()).to.equal(teamId);
		});

		it('is allowed for superheroes', async () => {
			const hero = await createTestUser({ roles: ['superhero'] });
			const username = hero.email;
			const password = 'Schulcloud1!';
			await createTestAccount({ username, password }, 'local', hero);
			const params = await generateRequestParams({ username, password });

			try {
				const record = {
					name: 'test',
					schoolId: hero.schoolId,
					schoolIds: [hero.schoolId],
					userIds: [hero._id],
				};
				const slimteam = await teamService.create(record, { ...params, query: {} });
				expect(slimteam).to.be.ok;

				const { userIds } = await teamService.get(slimteam._id);
				expect(userIds.some((item) => equalIds(item.userId, hero._id))).to.equal(true);
			} finally {
				await cleanup();
			}
		});

		it('is not allowed for demoStudent', async () => {
			const demoStudent = await createTestUser({ roles: ['demoStudent'] });
			const username = demoStudent.email;
			const password = 'Schulcloud1!';
			await createTestAccount({ username, password }, 'local', demoStudent);
			const params = await generateRequestParams({ username, password });

			try {
				const record = {
					name: 'test',
					schoolId: demoStudent.schoolId,
					schoolIds: [demoStudent.schoolId],
					userIds: [demoStudent._id],
				};
				await teamService.create(record, { ...params, query: {} }).catch((e) => {
					expect(e.name).to.equal('Forbidden');
					expect(e.message).to.equal('Only administrator, teacher and students can create teams.');
				});
			} finally {
				await cleanup();
			}
		});
	});

	describe.only('teams patch', () => {
		let team;
		let teamId;
		let schoolId;
		let fakeLoginParams;
		let adminParams;
		let teamAdminParams;
		let teamMemberParams;

		before(async () => {
			const user = await createTestUser({ roles: ['administrator'] }).catch((err) => {
				logger.warning('Can not create test user', err);
			});

			const teamAdmin = await createTestUser({ roles: ['teamadministrator'], schoolId: user.schoolId }).catch((err) => {
				logger.warning('Can not create test user', err);
			});

			const teamMember = await createTestUser({ roles: ['teammember'], schoolId: user.schoolId }).catch((err) => {
				logger.warning('Can not create test user', err);
			});

			schoolId = user.schoolId.toString();
			const userId = user._id.toString();
			const teamAdminId = teamAdmin._id.toString();
			const teamMemberId = teamMember._id.toString();

			fakeLoginParams = {
				account: { userId },
				authenticated: true,
				provider: 'rest',
				query: {},
			};

			team = await teamService
				.create(
					{
						name: 'TestTeam',
						schoolId,
						userIds: [userId],
					},
					fakeLoginParams
				)
				.catch((err) => {
					logger.warning('Can not create test team', err);
				});

			teamId = team._id.toString();

			const adminUsername = user.email;
			const adminPassword = 'somePassword';

			await createTestAccount({ username: adminUsername, password: adminPassword }, 'local', user);
			adminParams = await generateRequestParams({ username: adminUsername, password: adminPassword });

			const teamAdminUsername = teamAdmin.email;
			const teamAdminPassword = 'somePassword';

			await createTestAccount({ username: teamAdminUsername, password: teamAdminPassword }, 'local', teamAdmin);
			teamAdminParams = await generateRequestParams({ username: teamAdminUsername, password: teamAdminPassword });

			const memberUsername = teamMember.email;
			const memberPassword = 'somePassword';

			await createTestAccount({ username: memberUsername, password: memberPassword }, 'local', teamMember);
			teamMemberParams = await generateRequestParams({ username: memberUsername, password: memberPassword });

			const data = {
				role: 'teamadministrator',
				teamAdminId,
			};

			const fakeParams2 = { ...adminParams, query: {} };
			const { message } = await addService.patch(teamId, data, fakeParams2);

			return Promise.resolve();
		});

		after(() => Promise.all([cleanup(), teamsHelper.removeOne(teamId)]));

		it('should work for team admins', async () => {
			const fakeParams = { ...teamAdminParams, query: {} };
			const result = await teamService.patch(teamId, { name: 'teamNameChanged' }, fakeParams);
			expect(result.name).to.equal('teamNameChanged');
		});

		it('should not work for team members', async () => {
			const fakeParams = { ...teamMemberParams, query: {} };
			const result = await teamService.patch(teamId, { name: 'someOtherName' }, fakeParams);
			expect(result).to.equal('XY');
		});
	});
});

describe('Test team extern add services', () => {
	let app;
	let server;

	let teacher;
	let params;
	let owner;
	let expert;
	let student;
	let addService;

	before(async () => {
		app = await appPromise;
		addService = app.service('/teams/extern/add');
		addService.setup(app);
		server = await app.listen();

		[owner, teacher, expert, student] = await Promise.all([
			createTestUser({ roles: ['teacher'] }),
			createTestUser({ roles: ['teacher'] }),
			createTestUser({ roles: ['expert'] }),
			createTestUser({ roles: ['student'] }),
		]);

		const username = owner.email;
		const password = 'Schulcloud1!';

		await createTestAccount({ username, password }, 'local', owner);
		params = await generateRequestParams({ username, password });
	});

	after(async () => {
		await testHelper.cleanup;
		await server.close();
	});

	it('add new teamadministrator with userId', async () => {
		const { _id: teamId } = await teamsHelper.create(owner);
		const userId = teacher._id.toString();
		const data = {
			role: 'teamadministrator',
			userId,
		};

		const fakeParams = { ...params, query: {} };
		const { message } = await addService.patch(teamId, data, fakeParams);

		expect(message).to.equal('Success!');
		const { userIds } = await teamsHelper.getById(teamId);
		expect(userIds).to.be.an('array').with.lengthOf(2);
		const exist = userIds.some((teamUser) => teamUser.userId.toString() === userId);
		expect(exist).to.be.true;
	});

	it('add new teamexpert', async () => {
		const { _id: teamId } = await teamsHelper.create(owner);
		const { email } = expert;
		const data = {
			role: 'teamexpert',
			email,
		};

		const fakeParams = { ...params, query: {} };
		const { message } = await addService.patch(teamId, data, fakeParams);

		expect(message).to.equal('Success!');
		const { invitedUserIds } = await teamsHelper.getById(teamId);
		expect(invitedUserIds).to.be.an('array').with.lengthOf(1);
		const exist = invitedUserIds.some((inv) => inv.email === email);
		expect(exist).to.be.true;
	});

	it('add new teamadministrator without userId should do nothing', async () => {
		const { _id: teamId } = await teamsHelper.create(owner);
		const data = {
			role: 'teamadministrator',
		};

		const fakeParams = { ...params, query: {} };
		const { message } = await addService.patch(teamId, data, fakeParams);

		expect(message).to.equal('Success!');
		const { userIds } = await teamsHelper.getById(teamId);
		expect(userIds).to.be.an('array').with.lengthOf(1);
	});

	it('add new teamexpert without email should do nothing', async () => {
		const { _id: teamId } = await teamsHelper.create(owner);
		const data = {
			role: 'teamexpert',
		};

		const fakeParams = { ...params, query: {} };
		const { message } = await addService.patch(teamId, data, fakeParams);

		expect(message).to.equal('Success!');
		const { invitedUserIds } = await teamsHelper.getById(teamId);
		expect(invitedUserIds).to.be.an('array').with.lengthOf(0);
	});

	it('add student from other school shoult not work', async () => {
		const { _id: teamId } = await teamsHelper.create(owner);
		const { email } = student;
		const data = {
			role: 'student',
			email,
		};

		const fakeParams = { ...params, query: {} };
		const { message } = await addService.patch(teamId, data, fakeParams);

		expect(message).to.equal('Success!');
		const { invitedUserIds } = await teamsHelper.getById(teamId);
		expect(invitedUserIds).to.be.an('array').with.lengthOf(0);
	});
});
