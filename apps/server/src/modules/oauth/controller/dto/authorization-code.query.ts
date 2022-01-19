import { IsDefined, IsString } from 'class-validator';

export class AuthorizationCodeQuery {
	@IsString()
	@IsDefined()
	code!: string;
}
