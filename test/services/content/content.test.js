const assert = require('assert');

const chai = require('chai');
const mockery = require('mockery');
const promisify = require("es6-promisify");
const fs = require("fs");
const readFile = promisify(fs.readFile);
const path = require("path");


describe('content service', function () {
	const requestMock = (options) => {
			return readFile(requestToFilename(options));
	};

	let app = null;
	let contentService = null;

	before(function () {
		mockery.enable({
			warnOnReplace: false,
			warnOnUnregistered: false,
			useCleanCache: true
		});
		mockery.registerMock('request-promise-native', requestMock);
		app = require('../../../src/app');
		contentService = app.service('contents');
	});

	it('registered the users service', () => {
		assert.ok(contentService);
	});

	it('provides the default resources with an empty query', () => {
		return contentService.find({query: {}}).then(result => {
			chai.expect(result.data).to.have.length.above(4);
		});
	});

	it('provides only a single resource with $limit 1', () => {
		return contentService.find({query: {$limit: 1}})
			.then(result => {
				chai.expect(result.data).to.have.lengthOf(1);
			});
	});

	it('filters subjects correctly', () => {
		const selectedSubjects = ["0", "640"];
		return contentService.find({query: {filter: {subjects: selectedSubjects}}})
			.then(result => {
				result.data.forEach(d => {
					d.attributes.subjects.forEach(
						s => chai.expect(s).to.be.oneOf(selectedSubjects)
					);
					chai.expect(d.attributes.subjects).to.have.length.below(selectedSubjects.length + 1);
				});
			});
	});
});

function writeResponseToDisk(requestOptions, response) {
	const fs = require('fs');
	fs.writeFile(requestToFilename(requestOptions, response), string, function(err) {
		if(err) {
			return console.error(err);
		}
		console.log("The file was saved!");
	});
}

function requestToFilename(requestOptions) {
	const filename = `response${JSON.stringify(requestOptions.qs).replace(/[^\x00-\x7F]/g, "")}.txt`;
	return path.resolve(__dirname, 'mock', filename);
}
