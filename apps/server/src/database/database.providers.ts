import * as mongoose from 'mongoose';

export const databaseProviders = [
	{
		provide: 'DATABASE_CONNECTION',
		useFactory: () => {
			// TODO return await mongoose.connect('mongodb://localhost/schulcloud')
			return mongoose; // we use the existing connection now
		},
	},
];