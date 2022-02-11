import { Injectable } from '@nestjs/common';
import { Board } from '@shared/domain/entity';
import { BaseRepo } from '../base.repo';

@Injectable()
export class BoardRepo extends BaseRepo<Board> {}
