const { static: staticContent } = require('@feathersjs/express');
const path = require('path');
const courseCopyService = require('./services/course-copy-service');
const courseScopelistService = require('./services/courseScopeLists');
const ClassSuccessorService = require('./services/classSuccessor');
const { setup: coursePermissionService } = require('./services/coursePermission');
const { setup: courseMembersService } = require('./services/courseMembers');
const classSuccessorHooks = require('./hooks/classSuccessor');
const { classesService, classesHooks } = require('./services/classes');
const { classModelService, classModelServiceHooks } = require('./services/classModelService');
const { courseModelService, courseModelServiceHooks } = require('./services/courseModelService');
const { courseService, courseHooks } = require('./services/courses');
const { courseGroupModelService, courseGroupModelServiceHooks } = require('./services/courseGroupModelService');
const { courseGroupHooks, courseGroupService } = require('./services/courseGroups');

// eslint-disable-next-line func-names
module.exports = function () {
	const app = this;

	app.use('/courses/api', staticContent(path.join(__dirname, '/docs/openapi.yaml')));

	/* Course model */
	app.use('/courseModel', courseModelService);
	app.service('/courseModel').hooks(courseModelServiceHooks);

	app.use('/courses', courseService);
	app.service('/courses').hooks(courseHooks);

	/* CourseGroup model */
	app.use('/courseGroupModel', courseGroupModelService);
	app.service('/courseGroupModel').hooks(courseGroupModelServiceHooks);

	app.use('/courseGroups', courseGroupService);
	app.service('/courseGroups').hooks(courseGroupHooks);

	/* Class model */
	app.use('/classModel', classModelService);
	app.service('/classModel').hooks(classModelServiceHooks);

	app.use('/classes', classesService);
	app.service('/classes').hooks(classesHooks);

	app.use('/classes/successor', new ClassSuccessorService(app));
	const classSuccessorService = app.service('/classes/successor');
	classSuccessorService.hooks(classSuccessorHooks);

	app.configure(courseCopyService);
	app.configure(courseScopelistService);
	app.configure(coursePermissionService);
	app.configure(courseMembersService);
};
