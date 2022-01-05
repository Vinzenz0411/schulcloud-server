/* istanbul ignore file */ // TODO remove when implementation exists
import { Entity, Enum, IdentifiedReference, ManyToOne, Property, Reference, wrap } from '@mikro-orm/core';
import { BaseEntityWithTimestamps } from './base.entity';
import type { School } from './school.entity';

import { System } from './system.entity';

import type { User } from './user.entity';

export interface IImportUserProperties {
	// references
	school: School;
	system: System;
	// external identifiers
	ldapDn: string;
	ldapId: string;
	// descriptive properties
	firstName: string;
	lastName: string;
	email: string; // TODO VO
	roleNames?: RoleName[];
	classNames?: string[];
	user?: User;
	matchedBy?: MatchCreator;
	flagged?: boolean;
}

export enum MatchCreator {
	AUTO = 'auto',
	MANUAL = 'admin',
}
export enum RoleName {
	STUDENT = 'student',
	TEACHER = 'teacher',
	ADMIN = 'administrator',
}

@Entity({ tableName: 'importusers' })
export class ImportUser extends BaseEntityWithTimestamps {
	@ManyToOne(() => 'School', { fieldName: 'schoolId', wrappedReference: true, lazy: true })
	school: IdentifiedReference<School>;

	@ManyToOne(() => 'System', { wrappedReference: true, lazy: true })
	system: IdentifiedReference<System>;

	@Property()
	ldapDn: string;

	@Property()
	ldapId: string;

	@Property()
	firstName: string;

	@Property()
	lastName: string;

	@Property()
	/**
	 * Lowercase email string // TODO VO
	 */
	email: string;

	@Enum({ fieldName: 'roles' })
	roleNames: RoleName[] = [];

	@Property()
	classNames: string[] = [];

	/**
	 * Update user-match together with matchedBy
	 */
	@ManyToOne('User', { fieldName: 'match_userId', eager: true })
	user?: IdentifiedReference<User>;

	/**
	 * References who set the user-match
	 */
	@Enum({ fieldName: 'match_matchedBy' })
	matchedBy?: MatchCreator;

	@Property()
	flagged = false;

	setMatch(user: User, matchedBy: MatchCreator) {
		this.user = wrap(user).toReference();
		this.matchedBy = matchedBy;
	}

	revokeMatch() {
		delete this.user;
		delete this.matchedBy;
	}

	constructor(props: IImportUserProperties) {
		super();
		this.school = Reference.create(props.school);
		this.system = Reference.create(props.system);
		this.ldapDn = props.ldapDn;
		this.ldapId = props.ldapId;
		this.firstName = props.firstName;
		this.lastName = props.lastName;
		this.email = props.email;
		if (Array.isArray(props.roleNames) && props.roleNames.length > 0) this.roleNames.push(...props.roleNames);
		if (Array.isArray(props.classNames) && props.classNames.length > 0) this.classNames.push(...props.classNames);
		if (props.user && props.matchedBy) this.setMatch(props.user, props.matchedBy);
		if (props.flagged && props.flagged === true) this.flagged = true;
	}
}
