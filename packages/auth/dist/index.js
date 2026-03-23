"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTelegramPrivateMetadata = exports.buildTelegramExternalId = exports.TELEGRAM_EXTERNAL_ID_PREFIX = void 0;
exports.TELEGRAM_EXTERNAL_ID_PREFIX = "telegram";
const buildTelegramExternalId = (telegramId) => `${exports.TELEGRAM_EXTERNAL_ID_PREFIX}:${telegramId}`;
exports.buildTelegramExternalId = buildTelegramExternalId;
const buildTelegramPrivateMetadata = (profile) => ({
    telegramId: profile.telegramId,
    telegramUsername: profile.username,
    telegramFirstName: profile.firstName,
    telegramLastName: profile.lastName,
});
exports.buildTelegramPrivateMetadata = buildTelegramPrivateMetadata;
