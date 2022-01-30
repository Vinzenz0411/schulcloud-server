import { Injectable } from '@nestjs/common';
import { FilterQuery, QueryOrderMap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/mongodb';

import { IFindOptions, Team, Counted } from '@shared/domain';
import { TeamScope } from './team-scope';

@Injectable()
export class TeamRepo {
	constructor(private readonly em: EntityManager) {}

	async findByName(name: string, options?: IFindOptions<Team>): Promise<Counted<Team[]>> {
		const scope = new TeamScope();
		scope.byName(name);

		const countedTeamList = await this.findTeamsAndCount(scope.query, options);

		return countedTeamList;
	}

	private async findTeamsAndCount(query: FilterQuery<Team>, options?: IFindOptions<Team>): Promise<Counted<Team[]>> {
		const { pagination, order } = options || {};
		const [teamEntities, count] = await this.em.findAndCount(Team, query, {
			offset: pagination?.skip,
			limit: pagination?.limit,
			orderBy: order as QueryOrderMap,
		});

		// await this.em.populate(teamEntities, ['course', 'lesson', 'submissions']);

		return [teamEntities, count];
	}
}
