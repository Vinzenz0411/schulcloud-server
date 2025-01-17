const mongoose = require('mongoose');
// eslint-disable-next-line no-unused-vars
const { alert, error } = require('../src/logger');

const { connect, close } = require('../src/utils/database');

const { Schema } = mongoose;

const { userModel } = require('../src/services/user/model');
const { courseModel } = require('../src/services/user-group/model');
const { teamsModel } = require('../src/services/teams/model');
const { schoolModel } = require('../src/services/school/model');

const FileModel = mongoose.model(
	'file_20210906',
	new mongoose.Schema({
		refOwnerModel: { type: String },
		owner: { type: Schema.Types.ObjectId },
		creator: { type: Schema.Types.ObjectId },
		bucket: { type: String },
		storageProviderId: { type: Schema.Types.ObjectId },
	}),
	'files'
);

const ownerModel = {
	user: userModel,
	course: courseModel,
	teams: teamsModel,
};

async function* batchIterator(iterator, batchSize) {
	let batch = [];
	for await (const item of iterator) {
		if (batch.length >= batchSize) {
			yield batch;
			batch = [];
		}
		batch.push(item);
	}
	yield batch;
}

const addBucketAndStorageProviderToFiles = async (files) =>
	Promise.all(
		files.map(async (file) => {
			try {
				let schoolId;
				const creatorId = file.creator;
				if (creatorId) {
					const creator = await userModel.findById(creatorId).lean().exec();
					({ schoolId } = creator);
				} else {
					const ownerType = file.refOwnerModel;
					const owner = await ownerModel[ownerType].findById(file.owner).lean().exec();
					({ schoolId } = owner);
				}
				const school = await schoolModel.findById(schoolId).lean().exec();
				const bucket = `bucket-${schoolId}`;
				if (!file.bucket) file.bucket = bucket;
				if (!file.storageProviderId) file.storageProviderId = school.storageProvider;
				await file.save();
			} catch (err) {
				error(`bucket could not be added to the file ${file._id}`, err);
			}
		})
	);

module.exports = {
	up: async function up() {
		alert('Start adding buckets to file documents...');
		await connect();
		const files = FileModel.find({ $or: [{ bucket: { $exists: false } }, { storageProviderId: { $exists: false } }] });
		const fileCount = await files.count();
		alert(`${fileCount} files will be processed...`);
		const fileBatchIterator = batchIterator(files, 100);
		let fileBatch = await fileBatchIterator.next();
		while (!fileBatch.done) {
			// eslint-disable-next-line no-await-in-loop
			await addBucketAndStorageProviderToFiles(fileBatch.value);
			// eslint-disable-next-line no-await-in-loop
			fileBatch = await fileBatchIterator.next();
		}
		await close();
		alert('Done!');
	},

	down: async function down() {
		await connect();
		await FileModel.updateMany({}, { $unset: { bucket: '', storageProviderId: '' } });
		await close();
	},
};
