import { Team } from '@shared/domain';
import { Scope } from '../scope';

export class TeamScope extends Scope<Team> {
	byName(name: string): TeamScope {
		this.addQuery({ name });
		return this;
	}
}
