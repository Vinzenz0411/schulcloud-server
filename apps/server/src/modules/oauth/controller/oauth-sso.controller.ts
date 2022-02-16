import { Configuration } from '@hpi-schul-cloud/commons';
import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParseObjectIdPipe } from '@shared/controller/pipe/parse-object-id.pipe';
import { ILogger, Logger } from '@src/core/logger';
import { Response } from 'express';
import { OauthUc } from '../uc/oauth.uc';
import { AuthorizationQuery } from './dto/authorization.query';
import { OAuthResponse } from './dto/oauth-response';

@ApiTags('SSO')
@Controller('sso')
export class OauthSSOController {
	private logger: ILogger;

	constructor(private readonly oauthUc: OauthUc) {
		this.logger = new Logger(OauthSSOController.name);
	}

	@Get('oauth/:systemid')
	async startOauthAuthorizationCodeFlow(
		@Query() query: AuthorizationQuery,
		@Res() res: Response,
		@Param('systemid', ParseObjectIdPipe) systemid: string
	): Promise<unknown> {
		let oauthResponse: OAuthResponse;
		const HOST = Configuration.get('HOST') as string;
		try {
			oauthResponse = await this.oauthUc.startOauth(query, systemid);
			if (oauthResponse.jwt) {
				res.cookie('jwt', oauthResponse.jwt);
				return res.redirect(`${HOST}/dashboard`);
			}
		} catch (error) {
			this.logger.log(error);
			oauthResponse = new OAuthResponse();
			oauthResponse.errorcode = 'OauthLoginFailed';
		}
		return res.redirect(`${HOST}/login?error=${oauthResponse.errorcode as string}`);
	}

	@Get('clientsecret/encrypt')
	encryptClientSecret(@Query() query: EncryptionQuery, @Res() res: Response) {
		const encryptedSecret: string = this.oauthUc.encryptCleintSecret(query.clientSecret, query.encryptionKey);
		return res.send(encryptedSecret);
	}

	@Get('clientsecret/decrypt')
	decryptClientSecret(@Query() query: EncryptionQuery, @Res() res: Response) {
		const decryptedSecret: string = this.oauthUc.decryptCleintSecret(query.clientSecret, query.encryptionKey);
		return res.send(decryptedSecret);
	}
}

interface EncryptionQuery {
	clientSecret: string;
	encryptionKey: string;
}
