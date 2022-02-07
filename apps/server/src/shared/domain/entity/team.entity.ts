import { Entity, Property } from '@mikro-orm/core';
// eslint-disable-next-line import/no-cycle
import { EntityId } from '@shared/domain';
import type { User } from './user.entity';
import { BaseEntity } from './base.entity';
import type { School } from './school.entity';

export type TeamUsers = { userId: User; role: string; schoolId: School };

export interface ITeamProperties {
	name: string;
	userIds: TeamUsers[];
}

@Entity({ tableName: 'teams' })
export class Team extends BaseEntity {
	@Property()
	name!: string;

	@Property()
	userIds?: TeamUsers[];

	constructor(props: ITeamProperties) {
		super();
		this.name = props.name;
		this.userIds = props.userIds;
	}

	removeFromTeam(user: EntityId): Team {
		const teamUser = this.userIds?.filter((obj) => {
			return obj.userId === user;
		});
		if (teamUser) {
			const index = this.userIds?.indexOf(teamUser[0]);
			if (this.userIds && index) {
				this.userIds.splice(index, 1);
				return this;
			}
			throw new Error('index not found');
		}
		throw new Error('no userIds found');
	}
}
