import { Entity, Property } from '@mikro-orm/core';
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
}
