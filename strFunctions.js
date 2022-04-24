const ExtensionUtils = imports.misc.extensionUtils;
const extension = ExtensionUtils.getCurrentExtension();
const convenience = extension.imports.convenience;

const lang = extension.imports.locale.utils;

function format(str) {
    let enums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    const numeralSystem = lang.getNumerals();
    const hnums = numeralSystem.values.split('');

    return replace(enums, hnums, str);
}

function replace (search, replace, subject) {
    let length = search.length;
    subject = subject.toString();

    for (let i=0; i<length; i++) {
        subject = subject.split(search[i]).join(replace[i]);
    }

    return subject;
}
