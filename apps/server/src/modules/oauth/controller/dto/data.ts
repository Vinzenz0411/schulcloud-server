export class Data {
	client_id?: string;

	client_secret?: string;

	redirect_uri?: string;

	grant_type?: string;

	code!: string;
}