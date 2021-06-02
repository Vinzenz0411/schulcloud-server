import { FilterQuery } from '@mikro-orm/core';
import { News } from '../entity';
import { NewsTargetFilter } from './news-target-filter';

export class NewsScope {
	private _queries: FilterQuery<News>[] = [];

	get query(): FilterQuery<News> {
		const query = this._queries.length > 1 ? { $and: this._queries } : this._queries[0];
		return query;
	}

	byTargets(targets: NewsTargetFilter[]): NewsScope {
		const queries: FilterQuery<News>[] = targets.map((target) => {
			return { $and: [{ targetModel: target.targetModel }, { 'target:in': target.targetIds }] };
		});
		const combinedQuery = queries.length > 1 ? { $or: queries } : queries[0];
		this.addQuery(combinedQuery);
		return this;
	}

	byUnpublished(unpublished: boolean): NewsScope {
		const now = new Date();
		this.addQuery({ displayAt: unpublished ? { $gt: now } : { $lte: now } });
		return this;
	}

	private addQuery(query: FilterQuery<News>) {
		this._queries.push(query);
	}
}
