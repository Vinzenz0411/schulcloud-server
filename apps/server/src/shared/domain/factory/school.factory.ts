import { School, ISchoolProperties } from '../entity/school.entity';
import { BaseFactory } from './base.factory';

export const schoolFactory = BaseFactory.define<School, ISchoolProperties>(School, ({ sequence }) => {
	return { name: `school #${sequence}` };
});
