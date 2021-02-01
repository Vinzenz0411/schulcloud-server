const axios = require('axios');
const FormData = require('form-data');
const logger = require('../../../logger');

const apiToken = require('../../../../config/secrets').IDAS_API_KEY;

class WalletFileService {
	setup(app) {
		this.app = app;
	}

	async create(data, params) {
		const form = new FormData();
		form.append('file', params.file.buffer, {
			filename: params.file.originalname,
			contentType: params.file.mimetype,
		});
		form.append('title', data.title);
		form.append('expiresAt', new Date(Date.now() + 1000 * 60 * 60).toISOString());
		form.append('description', data.description);

		const file = await axios
			.post('https://daad.idas.solutions/api/v1/Files', form, {
				headers: {
					...form.getHeaders(),
					'X-API-KEY': apiToken,
				},
			})
			.catch((error) => {
				logger.error(error.response);
			});

		logger.info(file.data.result);

		const fileID = file.data.result.id;

		const { userId } = params.account;
		const user = await this.app.service('users').get(userId);

		const { relationshipId } = user;
		logger.info(`RelationshipID: ${relationshipId}`);
		const relationship = await axios.get(`https://daad.idas.solutions/api/v1/Relationships/${relationshipId}`, {
			headers: {
				'X-API-KEY': apiToken,
			},
		});

		logger.info(relationship.data.result);

		const recipientID = relationship.data.result.from;

		const message = await axios.post(
			'https://daad.idas.solutions/api/v1/Messages',
			{
				recipients: [recipientID],
				content: {
					'@type': 'Attribute',
					name: 'dc.languageAssessmentDe',
					value: '{"value":"B1","source":"DAAD"}',
				},
				attachments: [fileID],
			},
			{
				headers: {
					'X-API-KEY': apiToken,
				},
			}
		);

		logger.info(message.data.result);

		return message.data.result;
	}
}

module.exports = WalletFileService;