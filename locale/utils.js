const ExtensionUtils = imports.misc.extensionUtils;
const extension = ExtensionUtils.getCurrentExtension();
const convenience = extension.imports.convenience;

const languages = extension.imports.locale.languages;
const numerals = extension.imports.locale.numerals;

const Schema = convenience.getSettings(extension, 'hijri-calendar');

/**
 *
 */
function listLanguages() {
    const langs = Object.keys(languages);
    langs.sort();
    return langs;
}

/**
 *
 */
function getLangStrings() {
    const lang = Schema.get_string('display-language');
    return languages[lang].strings;
}

/**
 *
 */
function getLangMetadata() {
    const lang = Schema.get_string('display-language');
    return languages[lang].metadata;
}

/**
 *
 */
function listNumerals() {
    const systems = Object.keys(numerals);
    systems.sort();
    return systems;
}

/**
 *
 * @param wantedSystem
 */
function getNumerals(wantedSystem) {
    if (!wantedSystem) {
        const system = Schema.get_string('numeral-system');
        return numerals[system].data;
    }
    return numerals[wantedSystem].data;
}

