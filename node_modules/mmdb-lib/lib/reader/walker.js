"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readNodeRight24 = (db) => (offset) => db.readUIntBE(offset + 3, 3);
const readNodeLeft24 = (db) => (offset) => db.readUIntBE(offset, 3);
const readNodeLeft28 = (db) => (offset) => ((db[offset + 3] & 0xf0) << 20) | db.readUIntBE(offset, 3);
const readNodeRight28 = (db) => (offset) => ((db[offset + 3] & 0x0f) << 24) | db.readUIntBE(offset + 4, 3);
const readNodeLeft32 = (db) => (offset) => db.readUInt32BE(offset);
const readNodeRight32 = (db) => (offset) => db.readUInt32BE(offset + 4);
exports.default = (db, recordSize) => {
    switch (recordSize) {
        case 24:
            return { left: readNodeLeft24(db), right: readNodeRight24(db) };
        case 28:
            return { left: readNodeLeft28(db), right: readNodeRight28(db) };
        case 32:
            return { left: readNodeLeft32(db), right: readNodeRight32(db) };
    }
    throw new Error('Unsupported record size');
};
