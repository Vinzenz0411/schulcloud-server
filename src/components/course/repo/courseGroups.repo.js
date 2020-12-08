const { courseGroupModel } = require('../../../services/user-group/model');
const { updateManyResultDAO2BO, filterUserInUserGroups } = require('./helper');

// converter DAO 2 BO

const courseGroupToBO = (courseGroupDAO) => {
	return { ...courseGroupDAO };
};

// public members

/**
 *
 * @param {String} courseGroupId
 */
const getCourseGroupById = async (courseGroupId) => {
	const result = await courseGroupModel.findById(courseGroupId).lean().exec();
	return courseGroupToBO(result);
};

const getCourseGroupsWithUser = async (userId) => {
	const result = await courseGroupModel.find(filterUserInUserGroups(userId)).lean().exec();
	return result.map(courseGroupToBO);
};

const deleteUserFromUserGroups = async (userId) => {
	const filter = filterUserInUserGroups(userId);
	const result = await courseGroupModel.updateMany(filter, { $pull: { userIds: userId } }).exec();
	return updateManyResultDAO2BO(result);
};

module.exports = {
	getCourseGroupById,
	getCourseGroupsWithUser,
	deleteUserFromUserGroups,
};
