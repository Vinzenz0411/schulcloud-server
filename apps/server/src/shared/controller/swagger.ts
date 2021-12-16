import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

/** *********************************************
 * OpenAPI docs setup
 * **********************************************
 * They will be generated by Controller routes
 * and DTOs/Entities passed. Their properties
 * must use @ApiProperty
 */

// build default openapi spec, it contains all registered controllers by default
// DTO's and Entity properties have to use @ApiProperty decorator to add their properties
const config = new DocumentBuilder()
	.addServer('/api/v3/') // add default path as server to have correct urls ald let 'try out' work
	.setTitle('HPI Schul-Cloud Server API')
	.setDescription('This is v3 of HPI Schul-Cloud Server. Checkout /docs for v1.')
	.setVersion('3.0')
	/** set authentication for all routes enabled by default */
	.addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
	.build();

export const enableOpenApiDocs = (app: INestApplication, path: string): void => {
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup(path, app, document);
};
