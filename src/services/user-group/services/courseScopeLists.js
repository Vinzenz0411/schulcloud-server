const { ScopeListService } = require('../../helpers/scopePermissions');
const { courseModel } = require('../model');

const buildUnpreviledgedUserQuery = (query, userId) => {
	const userQuery = { $or: [] };
	if (['false', 'all', undefined].includes(query.substitution)) {
		userQuery.$or.push({ userIds: userId });
		userQuery.$or.push({ teacherIds: userId });
	}
	if (['true', 'all', undefined].includes(query.substitution)) {
		userQuery.$or.push({ substitutionIds: userId });
	}
	return userQuery;
};

const buildArchiveQuery = (query) => {
	let filter = 'active';
	if (query.filter && ['active', 'archived', 'all'].includes(query.filter)) {
		({ filter } = query);
	}

	const oneDayInMilliseconds = 864e5;
	let untilQuery = {};
	if (filter === 'active') {
		untilQuery = {
			$or: [
				{ untilDate: { $exists: false } },
				{ untilDate: null },
				{ untilDate: { $gte: Date.now() - oneDayInMilliseconds } },
			],
		};
	}
	if (filter === 'archived') {
		untilQuery = { untilDate: { $lt: Date.now() - oneDayInMilliseconds } };
	}
	return untilQuery;
};

module.exports = function setup() {
	const app = this;

	ScopeListService.initialize(app, '/users/:scopeId/courses', async (user, permissions, params) => {
		const userQuery = buildUnpreviledgedUserQuery(params.query, user._id);
		const untilQuery = buildArchiveQuery(params.query);

		if (params.query.count === 'true') {
			const courseCount = await courseModel.count({
				$and: [
					userQuery,
					untilQuery,
				],
			}).exec();

			return {
				total: courseCount,
			};
		}

		return app.service('courses').find({
			query: {
				$and: [
					userQuery,
					untilQuery,
				],
				$skip: params.query.$skip,
				$limit: params.query.$limit,
			},
			paginate: params.paginate,
		});
	});
};
