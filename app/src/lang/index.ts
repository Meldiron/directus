import Vue from 'vue';
import VueI18n from 'vue-i18n';
import { RequestError } from '@/api';

import availableLanguages from './available-languages.yaml';

import enUSBase from './translations/en-US.yaml';
import dateFormats from './date-formats.yaml';

Vue.use(VueI18n);

export const i18n = new VueI18n({
	locale: 'en-US',
	fallbackLocale: 'en-US',
	messages: {
		'en-US': enUSBase,
	},
	dateTimeFormats: dateFormats,
	silentTranslationWarn: true,
});

export type Language = keyof typeof availableLanguages;

export const loadedLanguages: Language[] = ['en-US'];

export async function setLanguage(lang: Language): Promise<boolean> {
	if (Object.keys(availableLanguages).includes(lang) === false) {
		return false;
	}

	if (i18n.locale === lang) {
		return true;
	}

	if (loadedLanguages.includes(lang) === false) {
		const translations = await import(`@/lang/translations/${lang}.yaml`).catch((err) => console.warn(err));
		i18n.mergeLocaleMessage(lang, translations);
		loadedLanguages.push(lang);
	}

	i18n.locale = lang;
	(document.querySelector('html') as HTMLElement).setAttribute('lang', lang);

	return true;
}

export default i18n;

export function translateAPIError(error: RequestError | string) {
	const defaultMsg = error;

	let code = error;

	if (typeof error === 'object') {
		code = error?.response?.data?.errors?.[0]?.extensions?.code;
	}

	if (!error) return defaultMsg;
	if (!code === undefined) return defaultMsg;
	const key = `errors.${code}`;

	const exists = i18n.te(key);
	if (exists === false) return defaultMsg;
	return i18n.t(key);
}
