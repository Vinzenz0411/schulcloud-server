import { Module } from '@nestjs/common';

import { CourseRepo, LessonRepo, TaskRepo, UserRepo } from '@shared/repo';

import { TaskController } from './controller/task.controller';
import { TaskUC } from './uc';
import { TaskAuthorizationService } from './uc/task.authorization.service';

@Module({
	imports: [],
	controllers: [TaskController],
	providers: [TaskUC, TaskRepo, TaskAuthorizationService, LessonRepo, CourseRepo, UserRepo],
})
export class TaskModule {}
