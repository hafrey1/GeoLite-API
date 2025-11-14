"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const legacyErrorMessage = `Maxmind v2 module has changed API.\n\
Upgrade instructions can be found here: \
https://github.com/runk/node-maxmind/wiki/Migration-guide\n\
If you want to use legacy library then explicitly install maxmind@1`;
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
exports.default = {
    assert,
    legacyErrorMessage,
};
