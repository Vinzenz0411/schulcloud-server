const { NotImplemented, SyncError, BadRequest } = require('../../../../errors');
const { batchFilterKeys } = require('../../utils');

class BaseConumerStrategie {
	constructor(type, options) {
		this.filterActive = true;
		this.type = type;

		Object.entries(options).forEach((k, v) => {
			this[k] = v;
		});
	}

	/**
	 * @private
	 * @param {string} type
	 * @returns {boolean}
	 */
	matchType(type) {
		return this.type === type;
	}

	/**
	 * @private
	 * @param {object} data
	 * @returns {Promise}
	 */
	async action(data = {}) {
		throw new NotImplemented('Must be implemented');
	}

	/**
	 * @private
	 * @param {object} data
	 * @returns {object}
	 */
	filterData(data) {
		return batchFilterKeys(data, this.allowedLogKeys);
	}

	/**
	 * @public
	 * @param {object} content
	 * @returns {Promise}
	 */
	async exec({ type, data, syncId } = {}) {
		if (!this.matchType(type)) {
			// return Promise.resolve();
			throw new BadRequest(`The ${type} is not the supported message action.`);
		}

		return this.action(data).catch((err) => {
			const filteredData = this.filterActive ? this.filterData(data) : data;
			throw new SyncError(this.type, err, {
				data: filteredData,
				syncId,
			});
		});
	}
}

module.exports = BaseConumerStrategie;
