import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseInterceptors,
	ClassSerializerInterceptor,
} from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { ApiTags } from '@nestjs/swagger';
import { NewsEntity } from './entities/news.entity';
import { Authenticate, CurrentUser } from '../auth/auth.decorator';
import { ICurrentUser } from '../auth/interfaces/jwt-payload';
import { ParseObjectIdPipe } from './parse-object-id.pipe';
import { ObjectId } from 'mongoose';

@ApiTags('News')
@Authenticate('jwt')
@Controller('news')
@UseInterceptors(ClassSerializerInterceptor) // works only for class instances, default object are not covered!
export class NewsController {
	constructor(private readonly newsService: NewsService) {}

	@Post()
	create(@Body() createNewsDto: CreateNewsDto): Promise<NewsEntity> {
		return this.newsService.create(createNewsDto);
	}

	// @Get()
	// findAll(@CurrentUser() currentUser: ICurrentUser): Promise<NewsEntity[]> {
	// 	return this.newsService.findAll(currentUser);
	// }

	/** Retrieve a specific news entry by id. A user may only read news of scopes he has the read permission. The news entity has school and user names populated. */
	@Get(':id')
	async findOne(
		// A parameter pipe like ParseObjectIdPipe gives us the guarantee of typesafety for @Param
		@Param('id', ParseObjectIdPipe) newsId: ObjectId,
		@CurrentUser() currentUser: ICurrentUser
	): Promise<NewsEntity> {
		const { userId } = currentUser;
		const news = await this.newsService.getOne(newsId, userId);
		return news;
	}

	// @Patch(':id')
	// update(
	// 	@Param('id', ParseObjectIdPipe)
	// 	newsId: ObjectId,
	// 	@Body() updateNewsDto: UpdateNewsDto
	// ) {
	// 	return this.newsService.update(newsId, updateNewsDto);
	// }

	// @Delete(':id')
	// remove(@Param('id') id: string): Promise<string> {
	// 	return this.newsService.remove(id);
	// }
}