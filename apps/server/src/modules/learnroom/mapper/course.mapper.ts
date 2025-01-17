import { Course } from '@shared/domain';
import { CourseMetadataResponse } from '../controller/dto';

export class CourseMapper {
	static mapToMetadataResponse(course: Course): CourseMetadataResponse {
		const courseMetadata = course.getMetadata();
		const dto = new CourseMetadataResponse(
			courseMetadata.id,
			courseMetadata.title,
			courseMetadata.shortTitle,
			courseMetadata.displayColor,
			courseMetadata.startDate,
			courseMetadata.untilDate
		);
		return dto;
	}
}
