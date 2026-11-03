declare const process: {
	env: {
		CARTO_API_KEY?: string;
		BASEMAP_URL?: string;
		NODE_ENV?: string;
		[key: string]: string | undefined;
	};
};
