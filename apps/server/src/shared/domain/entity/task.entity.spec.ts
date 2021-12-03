import { MikroORM } from '@mikro-orm/core';
import { taskFactory, userFactory, submissionFactory, setupEntities, courseFactory } from '@shared/testing';

describe('Task Entity', () => {
	let orm: MikroORM;

	beforeAll(async () => {
		orm = await setupEntities();
	});

	afterAll(async () => {
		await orm.close();
	});

	describe('isDraft', () => {
		it('should return true by default', () => {
			const task = taskFactory.draft().build();
			expect(task.isDraft()).toEqual(true);
		});

		it('should return false if private = false', () => {
			const task = taskFactory.build();
			expect(task.isDraft()).toEqual(false);
		});

		it('should return private property as boolean if defined', () => {
			const task = taskFactory.draft().build();
			expect(task.isDraft()).toEqual(true);
		});

		it('should return private property as boolean if undefined', () => {
			const task = taskFactory.build();
			Object.assign(task, { private: undefined });
			expect(task.isDraft()).toEqual(false);
		});
	});

	describe('getSubmittedUsers', () => {
		it('should return the student who has submitted to the task', () => {
			const submission = submissionFactory.build();
			const task = taskFactory.build({ submissions: [submission] });
			const users = task.getSubmittedUsers();
			expect(users).toEqual([submission.student]);
		});

		it('should return an empty list if the task has no submissions', () => {
			const task = taskFactory.build();
			const users = task.getSubmittedUsers();
			expect(users).toEqual([]);
		});

		it('should return the list of unique students of all task submissions', () => {
			const user = userFactory.build();
			const submissions = submissionFactory.buildList(2, { student: user });
			const task = taskFactory.build({ submissions });
			const users = task.getSubmittedUsers();
			expect(users).toEqual([user]);
		});

		it('should return the number of different students of all task submissions', () => {
			const user1 = userFactory.build();
			const submissionsOfUser1 = submissionFactory.buildList(2, { student: user1 });
			const user2 = userFactory.build();
			const submissionsOfUser2 = submissionFactory.buildList(1, { student: user2 });
			const task = taskFactory.build({ submissions: [...submissionsOfUser1, ...submissionsOfUser2] });
			const users = task.getSubmittedUsers();
			expect(users).toEqual([user1, user2]);
		});
	});

	describe('getNumberOfSubmittedUsers', () => {
		it('should call getSubmittedUserIds', () => {
			const task = taskFactory.build();
			const spy = jest.spyOn(task, 'getSubmittedUsers');

			task.getNumberOfSubmittedUsers();

			expect(spy).toHaveBeenCalled();
		});

		it('should return the unique number of students that submitted to the task', () => {
			const user1 = userFactory.build();
			const submissionsOfUser1 = submissionFactory.buildList(2, { student: user1 });
			const user2 = userFactory.build();
			const submissionsOfUser2 = submissionFactory.buildList(1, { student: user2 });
			const task = taskFactory.build({ submissions: [...submissionsOfUser1, ...submissionsOfUser2] });
			const number = task.getNumberOfSubmittedUsers();
			expect(number).toEqual(2);
			expect(number).toEqual(task.getSubmittedUsers().length);
		});
	});

	describe('getGradedUsers', () => {
		it('should return the student whos submission is graded', () => {
			const submission1 = submissionFactory.build();
			const submission2 = submissionFactory.build();
			jest.spyOn(submission1, 'isGraded').mockReturnValue(true);
			jest.spyOn(submission2, 'isGraded').mockReturnValue(false);
			const task = taskFactory.build({ submissions: [submission1, submission2] });
			const users = task.getGradedUsers();
			expect(users).toEqual([submission1.student]);
		});

		it('should return an empty list if the task has no graded submissions', () => {
			const task = taskFactory.build();
			const users = task.getGradedUsers();
			expect(users).toEqual([]);
		});

		it('should return the list of unique students of all graded task submissions', () => {
			const user = userFactory.build();
			const submissions = submissionFactory.buildList(2, { student: user });
			jest.spyOn(submissions[0], 'isGraded').mockReturnValue(true);
			jest.spyOn(submissions[1], 'isGraded').mockReturnValue(true);
			const task = taskFactory.build({ submissions });
			const users = task.getGradedUsers();
			expect(users).toEqual([user]);
		});

		it('should return the number of different students of all task submissions', () => {
			const user1 = userFactory.build();
			const submissionsOfUser1 = submissionFactory.buildList(2, { student: user1 });
			jest.spyOn(submissionsOfUser1[0], 'isGraded').mockReturnValue(true);
			const user2 = userFactory.build();
			const submissionsOfUser2 = submissionFactory.buildList(1, { student: user2 });
			jest.spyOn(submissionsOfUser2[0], 'isGraded').mockReturnValue(true);
			const task = taskFactory.build({ submissions: [...submissionsOfUser1, ...submissionsOfUser2] });
			const users = task.getGradedUsers();
			expect(users).toEqual([user1, user2]);
		});
	});

	describe('getNumberOfGradedUsers', () => {
		it('should call getSubmittedUserIds', () => {
			const task = taskFactory.build();
			const spy = jest.spyOn(task, 'getGradedUsers');

			task.getNumberOfGradedUsers();

			expect(spy).toHaveBeenCalled();
		});

		it('should return the unique number of students that submitted to the task', () => {
			const user1 = userFactory.build();
			const submissionsOfUser1 = submissionFactory.buildList(2, { student: user1 });
			jest.spyOn(submissionsOfUser1[0], 'isGraded').mockReturnValue(true);
			const user2 = userFactory.build();
			const submissionsOfUser2 = submissionFactory.buildList(1, { student: user2 });
			jest.spyOn(submissionsOfUser2[0], 'isGraded').mockReturnValue(true);
			const task = taskFactory.build({ submissions: [...submissionsOfUser1, ...submissionsOfUser2] });
			const number = task.getNumberOfGradedUsers();
			expect(number).toEqual(2);
			expect(number).toEqual(task.getGradedUsers().length);
		});
	});

	describe('getMaxSubmissions', () => {
		describe('when no parent exist', () => {
			it('should return 0', () => {
				const task = taskFactory.build();

				const result = task.getMaxSubmissions();

				expect(result).toEqual(0);
			});
		});

		describe('when parent is a course', () => {
			it('should call course.getNumberOfStudents', () => {
				const course = courseFactory.build();
				const task = taskFactory.build({ course });
				const spy = jest.spyOn(course, 'getNumberOfStudents');

				task.getMaxSubmissions();

				expect(spy).toHaveBeenCalled();
			});

			it('should return the result', () => {
				const students = userFactory.buildList(2);
				const course = courseFactory.build({ students });
				const task = taskFactory.build({ course });

				const result = task.getMaxSubmissions();

				expect(result).toEqual(2);
			});
		});
	});

	// describe('createTeacherStatusForUser', () => {
	// 	it('should call getNumberOfSubmittedUsers and return the result as submitted property', () => {
	// 		const task = taskFactory.build();
	// 		const spy = jest.spyOn(task, 'getNumberOfSubmittedUsers').mockImplementation(() => 5);

	// 		const result = task.createTeacherStatusForUser('1');

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result.submitted).toEqual(5);

	// 		spy.mockReset();
	// 	});

	// 	it('should call getNumberOfGradedUsers and return the result as graded property', () => {
	// 		const task = taskFactory.build();
	// 		const spy = jest.spyOn(task, 'getNumberOfGradedUsers').mockImplementation(() => 5);

	// 		const result = task.createTeacherStatusForUser('1');

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result.graded).toEqual(5);

	// 		spy.mockReset();
	// 	});

	// 	it('should call getMaxSubmissions and return the result as maxSubmissions property', () => {
	// 		const task = taskFactory.build();
	// 		const spy = jest.spyOn(task, 'getMaxSubmissions').mockImplementation(() => 5);

	// 		const result = task.createTeacherStatusForUser('1');

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result.maxSubmissions).toEqual(5);

	// 		spy.mockReset();
	// 	});

	// 	it('should call isDraft and return the result as isDraft property', () => {
	// 		const task = taskFactory.build();
	// 		const spy = jest.spyOn(task, 'isDraft').mockImplementation(() => true);

	// 		const result = task.createTeacherStatusForUser('1');

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result.isDraft).toBe(true);

	// 		spy.mockReset();
	// 	});

	// 	describe('when parent is a course', () => {
	// 		it('should call course.getSubstitutionTeacherIds', () => {
	// 			const user = userFactory.build();
	// 			user.id = '0123456789ab';
	// 			const course = courseFactory.build();
	// 			const task = taskFactory.build({ course });
	// 			const spy = jest.spyOn(course, 'getSubstitutionTeacherIds');

	// 			task.createTeacherStatusForUser(user.id);

	// 			expect(spy).toHaveBeenCalled();
	// 		});

	// 		it('should return true if userId is part of it.', () => {
	// 			const user = userFactory.build();
	// 			user.id = '0123456789ab';
	// 			const course = courseFactory.build();
	// 			course.substitutionTeachers.add(user);
	// 			const task = taskFactory.build({ course });

	// 			const result = task.createTeacherStatusForUser(user.id);

	// 			expect(result.isSubstitutionTeacher).toBe(true);
	// 		});

	// 		it('should return false if userId not is part of it', () => {
	// 			const user = userFactory.build();
	// 			user.id = '0123456789ab';
	// 			const course = courseFactory.build();

	// 			const task = taskFactory.build({ course });

	// 			const result = task.createTeacherStatusForUser(user.id);

	// 			expect(result.isSubstitutionTeacher).toBe(false);
	// 		});
	// 	});
	// });

	// describe('isSubmittedForUser', () => {
	// 	it('should call getNumberOfSubmittedUsers and return true if userId is part of it.', () => {
	// 		const student = userFactory.build();
	// 		student.id = '0123456789ab';
	// 		const task = taskFactory.build();
	// 		const submission = submissionFactory.build({ student, task });
	// 		task.submissions.add(submission);

	// 		const spy = jest.spyOn(task, 'getSubmittedUserIds');

	// 		const result = task.isSubmittedForUser(student.id);

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result).toBe(true);

	// 		spy.mockReset();
	// 	});

	// 	it('should call getNumberOfSubmittedUsers and return false if userId is not part of it.', () => {
	// 		const student = userFactory.build();
	// 		student.id = '0123456789ab';
	// 		const task = taskFactory.build();
	// 		const submission = submissionFactory.build({ student, task });
	// 		task.submissions.add(submission);

	// 		const spy = jest.spyOn(task, 'getSubmittedUserIds');

	// 		const result = task.isSubmittedForUser('1');

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result).toBe(false);

	// 		spy.mockReset();
	// 	});
	// });

	// describe('isGradedForUser', () => {
	// 	it('should call getGradedUserIds and return true if userId is part of it.', () => {
	// 		const student = userFactory.build();
	// 		student.id = '0123456789ab';
	// 		const task = taskFactory.build();
	// 		const submission = submissionFactory.graded().build({ student, task });

	// 		task.submissions.add(submission);

	// 		const spy = jest.spyOn(task, 'getGradedUserIds');

	// 		const result = task.isGradedForUser(student.id);

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result).toBe(true);

	// 		spy.mockReset();
	// 	});

	// 	it('should call getGradedUserIds and return false if userId is not part of it.', () => {
	// 		const student = userFactory.build();
	// 		student.id = '0123456789ab';
	// 		const task = taskFactory.build();
	// 		const submission = submissionFactory.graded().build({ student, task });
	// 		task.submissions.add(submission);

	// 		const spy = jest.spyOn(task, 'getGradedUserIds');

	// 		const result = task.isGradedForUser('1');

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result).toBe(false);

	// 		spy.mockReset();
	// 	});
	// });

	// describe('createStudentStatusForUser', () => {
	// 	it('should call isSubmittedForUser and return 1 instant of true for property submitted', () => {
	// 		const task = taskFactory.build();
	// 		const spy = jest.spyOn(task, 'isSubmittedForUser').mockImplementation(() => true);

	// 		const result = task.createStudentStatusForUser('1');

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result.submitted).toEqual(1);

	// 		spy.mockReset();
	// 	});

	// 	it('should call isSubmittedForUser and return 0 instant of false for property submitted', () => {
	// 		const task = taskFactory.build();
	// 		const spy = jest.spyOn(task, 'isSubmittedForUser').mockImplementation(() => false);

	// 		const result = task.createStudentStatusForUser('1');

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result.submitted).toEqual(0);

	// 		spy.mockReset();
	// 	});

	// 	it('should call isGradedForUser and return 1 instant of true for property graded', () => {
	// 		const task = taskFactory.build();
	// 		const spy = jest.spyOn(task, 'isGradedForUser').mockImplementation(() => true);

	// 		const result = task.createStudentStatusForUser('1');

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result.graded).toEqual(1);

	// 		spy.mockReset();
	// 	});

	// 	it('should call isGradedForUser and return 0 instant of false for property graded', () => {
	// 		const task = taskFactory.build();
	// 		const spy = jest.spyOn(task, 'isGradedForUser').mockImplementation(() => false);

	// 		const result = task.createStudentStatusForUser('1');

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result.graded).toEqual(0);

	// 		spy.mockReset();
	// 	});

	// 	it('should return 1 for property maxSubmissions', () => {
	// 		const task = taskFactory.build();

	// 		const result = task.createStudentStatusForUser('1');

	// 		expect(result.maxSubmissions).toEqual(1);
	// 	});

	// 	it('should call isDraft and return the result as isDraft property', () => {
	// 		const task = taskFactory.build();
	// 		const spy = jest.spyOn(task, 'isDraft').mockImplementation(() => false);

	// 		const result = task.createStudentStatusForUser('1');

	// 		expect(spy).toHaveBeenCalled();
	// 		expect(result.isDraft).toEqual(false);

	// 		spy.mockReset();
	// 	});

	// 	it('should return false for property isSubstitutionTeacher', () => {
	// 		const task = taskFactory.build();

	// 		const result = task.createStudentStatusForUser('1');

	// 		expect(result.isSubstitutionTeacher).toEqual(false);
	// 	});
	// });

	// describe('getDescriptions', () => {
	// 	describe('when a course is set', () => {
	// 		it('should return the name and color of the course', () => {
	// 			const course = courseFactory.build();
	// 			const task = taskFactory.build({ course });
	// 			expect(task.getDescriptions().name).toEqual(course.name);
	// 			expect(task.getDescriptions().color).toEqual(course.color);
	// 		});

	// 		describe('when a lesson is set', () => {
	// 			it('should return the lesson name as description', () => {
	// 				const course = courseFactory.build();
	// 				const lesson = lessonFactory.build({ course });
	// 				const task = taskFactory.build({ course, lesson });
	// 				expect(task.getDescriptions().description).toEqual(lesson.name);
	// 			});
	// 		});
	// 		describe('when no lesson is set', () => {
	// 			it('should return an empty string as description', () => {
	// 				const course = courseFactory.build();
	// 				const task = taskFactory.build({ course });
	// 				expect(task.getDescriptions().description).toEqual('');
	// 			});
	// 		});
	// 	});

	// 	describe('when no course is set', () => {
	// 		it('should return the default name and color', () => {
	// 			const task = taskFactory.build();
	// 			expect(task.getDescriptions().name).toEqual('');
	// 			expect(task.getDescriptions().color).toEqual('#ACACAC');
	// 		});
	// 	});
	// });
});
