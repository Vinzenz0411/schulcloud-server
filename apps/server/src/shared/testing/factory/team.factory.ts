import { Team, ITeamProperties } from '@shared/domain';
import { schoolFactory } from './school.factory';
import { BaseFactory } from './base.factory';
import { userFactory } from './user.factory';

export const teamFactory = BaseFactory.define<Team, ITeamProperties>(Team, ({ sequence }) => {
	return {
		name: `team #${sequence}`,
		userIds: [
			{
				userId: userFactory.build(),
				role: `role #${sequence}`,
				schoolId: schoolFactory.build(),
			},
		],
	};
});
