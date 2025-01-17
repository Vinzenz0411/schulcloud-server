import { Body, Controller, Get, Param, Put, StreamableFile } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { ScanResultParams } from '@src/modules/files-storage/controller/dto';
import { FilesStorageInternalActions } from '../files-storage.const';
import { FileRecordUC } from '../uc/file-record.uc';
import { FilesStorageUC } from '../uc/files-storage.uc';

@ApiTags('file-security')
@Controller()
export class FileSecurityController {
	constructor(private readonly filesStorageUC: FilesStorageUC, private readonly fileRecordUC: FileRecordUC) {}

	@ApiExcludeEndpoint()
	@Get(FilesStorageInternalActions.downloadBySecurityToken)
	async downloadBySecurityToken(@Param('token') token: string) {
		const res = await this.filesStorageUC.downloadBySecurityToken(token);

		return new StreamableFile(res.data, {
			type: res.contentType,
			disposition: `attachment;`,
		});
	}

	@ApiExcludeEndpoint()
	@Put(FilesStorageInternalActions.updateSecurityStatus)
	async updateSecurityStatus(@Body() scanResultDto: ScanResultParams, @Param('token') token: string) {
		await this.fileRecordUC.updateSecurityStatus(token, scanResultDto);
	}
}
