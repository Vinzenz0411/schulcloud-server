import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from '../constants';
import { JwtPayload } from '../interface/jwt-payload';
import { UserFacade } from '../../user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private readonly userFacade: UserFacade) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: jwtConstants.secret,
			...jwtConstants.jwtOptions,
		});
	}

	async validate(payload: JwtPayload): Promise<JwtPayload> {
		// TODO: check jwt is whitelisted
		// TODO: use user module for:
		// TODO: --> check user exist/is active
		// TODO: --> populate roles>permissions
		const resolvedUser = await this.userFacade.resolveUser(payload);
		payload.user = resolvedUser;
		return payload;
	}
}
