export default function getRootPath(): string {
	const path = window.location.pathname;
	const parts = path.split('/');
	const adminIndex = parts.indexOf('game');
	const rootPath = parts.slice(0, adminIndex).join('/') + '/';
	return rootPath;
}
