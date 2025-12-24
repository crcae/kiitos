import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import es from './locales/es.json';

const resources = { es: { translation: es }, en: { translation: en } };

i18n.use(initReactI18next).init({
    resources,
    lng: 'es', // Force Spanish as default
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
});

export default i18n;
