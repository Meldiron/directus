import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import database from '../database';
import { SYSTEM_ASSET_ALLOW_LIST, ASSET_TRANSFORM_QUERY_KEYS } from '../constants';
import { InvalidQueryException, ForbiddenException } from '../exceptions';
import validate from 'uuid-validate';
import { pick } from 'lodash';
import { Transformation } from '../types/assets';
import storage from '../storage';
import { PayloadService, AssetsService } from '../services';
import useCollection from '../middleware/use-collection';
import env from '../env';
import ms from 'ms';

const router = Router();

router.use(useCollection('directus_files'));

router.get(
	'/:pk',

	// Check if file exists
	asyncHandler(async (req, res, next) => {
		const id = req.params.pk;

		/**
		 * This is a little annoying. Postgres will error out if you're trying to search in `where`
		 * with a wrong type. In case of directus_files where id is a uuid, we'll have to verify the
		 * validity of the uuid ahead of time.
		 * @todo move this to a validation middleware function
		 */
		const isValidUUID = validate(id, 4);
		if (isValidUUID === false) throw new ForbiddenException();

		const file = await database.select('id', 'storage', 'filename_disk').from('directus_files').where({ id }).first();

		if (!file) throw new ForbiddenException();

		const { exists } = await storage.disk(file.storage).exists(file.filename_disk);

		if (!exists) throw new ForbiddenException();

		return next();
	}),

	// Validate query params
	asyncHandler(async (req, res, next) => {
		const payloadService = new PayloadService('directus_settings', { schema: req.schema });
		const defaults = { storage_asset_presets: [], storage_asset_transform: 'all' };

		let savedAssetSettings = await database
			.select('storage_asset_presets', 'storage_asset_transform')
			.from('directus_settings')
			.first();

		if (savedAssetSettings) {
			await payloadService.processValues('read', savedAssetSettings);
		}

		const assetSettings = savedAssetSettings || defaults;

		const transformation = pick(req.query, ASSET_TRANSFORM_QUERY_KEYS);

		if (transformation.hasOwnProperty('key') && Object.keys(transformation).length > 1) {
			throw new InvalidQueryException(`You can't combine the "key" query parameter with any other transformation.`);
		}

		const systemKeys = SYSTEM_ASSET_ALLOW_LIST.map((transformation) => transformation.key);
		const allKeys: string[] = [
			...systemKeys,
			...(assetSettings.storage_asset_presets || []).map((transformation: Transformation) => transformation.key),
		];

		// For use in the next request handler
		res.locals.shortcuts = [...SYSTEM_ASSET_ALLOW_LIST, ...(assetSettings.storage_asset_presets || [])];
		res.locals.transformation = transformation;

		if (Object.keys(transformation).length === 0) {
			return next();
		}
		if (assetSettings.storage_asset_transform === 'all') {
			if (transformation.key && allKeys.includes(transformation.key as string) === false)
				throw new InvalidQueryException(`Key "${transformation.key}" isn't configured.`);
			return next();
		} else if (assetSettings.storage_asset_transform === 'presets') {
			if (allKeys.includes(transformation.key as string)) return next();
			throw new InvalidQueryException(`Only configured presets can be used in asset generation.`);
		} else {
			if (transformation.key && systemKeys.includes(transformation.key as string)) return next();
			throw new InvalidQueryException(`Dynamic asset generation has been disabled for this project.`);
		}
	}),

	// Return file
	asyncHandler(async (req, res) => {
		const service = new AssetsService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const transformation: Transformation = res.locals.transformation.key
			? res.locals.shortcuts.find(
					(transformation: Transformation) => transformation.key === res.locals.transformation.key
			  )
			: res.locals.transformation;

		const { stream, file } = await service.getAsset(req.params.pk, transformation);

		res.attachment(file.filename_download);
		res.setHeader('Content-Type', file.type);

		if (req.query.hasOwnProperty('download') === false) {
			res.removeHeader('Content-Disposition');
		}

		const access = !!req.accountability?.role ? 'private' : 'public';
		res.setHeader('Cache-Control', `${access}, max-age=${ms(env.ASSETS_CACHE_TTL as string)}`);
		stream.pipe(res);
	})
);

export default router;
