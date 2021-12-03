import { Injectable } from '@nestjs/common';
import { EntityId, Course, Lesson, Task, User } from '@shared/domain';
import { CourseRepo, LessonRepo } from '@shared/repo';

export enum TaskParentPermission {
	read,
	write,
}

@Injectable()
export class TaskAuthorizationService {
	constructor(private readonly courseRepo: CourseRepo, private readonly lessonRepo: LessonRepo) {}

	// it should return also the scopePermissions for this user added to the entity .scopePermission: { userId, read: boolean, write: boolean }
	// then we can pass and allow only scoped courses to getPermittedLessonIds and validate read write of .scopePermission
	async getPermittedCourses(user: User, neededPermission: TaskParentPermission): Promise<Course[]> {
		let permittedCourses: Course[] = [];

		if (neededPermission === TaskParentPermission.write) {
			[permittedCourses] = await this.courseRepo.findAllForTeacher(user.id);
		} else if (neededPermission === TaskParentPermission.read) {
			[permittedCourses] = await this.courseRepo.findAllByUserId(user.id);
		}

		return permittedCourses;
	}

	async getPermittedLessons(user: User, courses: Course[]): Promise<Lesson[]> {
		const writeCourses = courses.filter((c) => this.hasCourseWritePermission(user, c));
		const readCourses = courses.filter((c) => this.hasCourseReadPermission(user, c));

		const writeCourseIds = writeCourses.map((c) => c.id);
		const readCourseIds = readCourses.map((c) => c.id);

		// idea as combined query:
		// [{courseIds: onlyWriteCoursesIds}, { courseIds: onlyReadCourses, filter: { hidden: false }}]
		const [[writeLessons], [readLessons]] = await Promise.all([
			this.lessonRepo.findAllByCourseIds(writeCourseIds),
			this.lessonRepo.findAllByCourseIds(readCourseIds, { hidden: false }),
		]);

		const permittedLessons = [...writeLessons, ...readLessons];

		return permittedLessons;
	}

	private hasCourseWritePermission(user: User, course: Course): boolean {
		const hasPermission = course.substitutionTeachers.contains(user) || course.teachers.contains(user);

		return hasPermission;
	}

	private hasCourseReadPermission(user: User, course: Course): boolean {
		const hasPermission = course.students.contains(user);

		return hasPermission;
	}

	hasTaskPermission(user: User, task: Task, permission: TaskParentPermission): boolean {
		const isCreator = task.creator === user;

		let hasCoursePermission = false;
		if (task.course) {
			if (permission === TaskParentPermission.write) {
				hasCoursePermission = this.hasCourseWritePermission(user, task.course);
			} else if (permission === TaskParentPermission.read) {
				hasCoursePermission =
					this.hasCourseReadPermission(user, task.course) || this.hasCourseWritePermission(user, task.course);
			}
		}

		const hasPermission = isCreator || hasCoursePermission;

		return hasPermission;
	}
}
