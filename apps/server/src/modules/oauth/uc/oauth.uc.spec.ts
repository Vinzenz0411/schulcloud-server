/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@src/core/logger';

import { UserRepo } from '@shared/repo/user/user.repo';
import { SystemRepo } from '@shared/repo/system';
import { User, School, Role } from '@shared/domain';
import { FeathersJwtProvider } from '@src/modules/authorization';
import { AxiosResponse } from 'axios';
import { ObjectId } from 'bson';
import { Collection } from '@mikro-orm/core';
import { HttpModule, HttpService } from '@nestjs/axios';
import { systemFactory } from '@shared/testing/factory/system.factory';
import { of } from 'rxjs';
import { OauthUc } from '.';
import { OauthTokenResponse } from '../controller/dto/oauth-token-response';

describe('OAuthUc', () => {
	let service: OauthUc;
	let userRepo: UserRepo;
	let systemRepo: SystemRepo;
	let jwtService: FeathersJwtProvider;

	const defaultAuthCode = '43534543jnj543342jn2';
	const defaultQuery = { code: defaultAuthCode };
	const defaultErrorQuery = { error: 'Default Error' };
	const defaultScool: School = {
		name: '',
		_id: new ObjectId(),
		id: '',
	};
	const defaultUser: User = {
		email: '',
		roles: new Collection<Role>([]),
		school: defaultScool,
		_id: new ObjectId(),
		id: '',
		createdAt: new Date(),
		updatedAt: new Date(),
		ldapId: '1111',
		firstName: '',
		lastName: '',
	};
	const defaultUserId = '123456789';
	const defaultJWT =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJ1dWlkIjoiMTIzIn0.H_iI0kYNrlAUtHfP2Db0EmDs4cH2SV9W-p7EU4K24bI';
	const wrongJWT =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
	const defaultTokenResponse: OauthTokenResponse = {
		access_token: 'zzzz',
		refresh_token: 'zzzz',
		id_token: defaultJWT,
	};
	const defaultAxiosResponse: AxiosResponse<OauthTokenResponse> = {
		data: defaultTokenResponse,
		status: 0,
		statusText: '',
		headers: {},
		config: {},
	};

	const defaultDecryptedSecret = 'IchBinNichtMehrGeheim';

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [LoggerModule, HttpModule],
			providers: [
				OauthUc,
				{
					provide: 'OAuthEncryptionService',
					useValue: {
						decrypt: () => {
							return defaultDecryptedSecret;
						},
					},
				},
				{
					provide: HttpService,
					useValue: {
						post: () => {
							return of(defaultAxiosResponse);
						},
					},
				},
				{
					provide: SystemRepo,
					useValue: {
						findById: jest.fn(() => {
							return systemFactory.build();
						}),
					},
				},
				{
					provide: UserRepo,
					useValue: {
						findByLdapId() {
							return defaultUser;
						},
					},
				},
				{
					provide: FeathersJwtProvider,
					useValue: {
						generateJwt() {
							return defaultJWT;
						},
					},
				},
			],
		}).compile();

		service = await module.resolve<OauthUc>(OauthUc);
		jest.mock('axios', () =>
			jest.fn(() => {
				return Promise.resolve(defaultAxiosResponse);
			})
		);
		userRepo = await module.resolve<UserRepo>(UserRepo);
		systemRepo = await module.resolve<SystemRepo>(SystemRepo);
		jwtService = await module.resolve<FeathersJwtProvider>(FeathersJwtProvider);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('startOauth', () => {
		it('should extract query to code as string', async () => {
			const response = await service.startOauth(defaultQuery, '1234');
			expect(response).toEqual({ jwt: defaultJWT });
		});
	});

	describe('checkAuthorizationCode', () => {
		it('should extract code from query', () => {
			const extract = service.checkAuthorizationCode(defaultQuery);
			expect(extract).toBe(defaultAuthCode);
		});
		it('should throw an error from a query that contains an error', () => {
			expect(() => {
				return service.checkAuthorizationCode(defaultErrorQuery);
			}).toThrow(defaultErrorQuery.error);
		});
		it('should throw an error from a falsy query', () => {
			expect(() => {
				return service.checkAuthorizationCode({});
			}).toThrow(Error);
		});
	});
	describe('requestToken', () => {
		it('should get token from the external server', async () => {
			const defaultSystem = systemFactory.build();
			const responseToken = await service.requestToken(defaultAuthCode, defaultSystem.id);
			expect(systemRepo.findById).toBeCalledWith(defaultSystem.id);
			expect(responseToken).toStrictEqual(defaultTokenResponse);
		});
	});

	describe('decodeToken', () => {
		it('should get uuid from id_token', () => {
			const uuid: string = service.decodeToken(defaultJWT);
			expect(uuid).toStrictEqual('123');
		});

		it('should throw an error for id_token that does not exist an uuid', () => {
			expect(() => {
				const uuid: string = service.decodeToken(wrongJWT);
				return uuid;
			}).toThrow(Error);
		});
	});

	describe('findUserById', () => {
		it('should return the user according to the uuid(LdapId)', async () => {
			const resolveUserSpy = jest.spyOn(userRepo, 'findByLdapId');
			const user: User = await service.findUserById(defaultUserId);
			expect(resolveUserSpy).toHaveBeenCalled();
			expect(user).toBe(defaultUser);
		});
	});

	describe('getJWTForUser', () => {
		it('should return a JWT for a user', async () => {
			const resolveJWTSpy = jest.spyOn(jwtService, 'generateJwt');
			const jwt = await service.getJWTForUser(defaultUser);
			expect(resolveJWTSpy).toHaveBeenCalled();
			expect(jwt).toStrictEqual(defaultJWT);
		});
	});
});