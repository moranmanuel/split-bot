import type { TelegramProfile } from "@splitbot/shared";

export const TELEGRAM_EXTERNAL_ID_PREFIX = "telegram";

export interface TelegramPrivateMetadata {
  telegramFirstName: string;
  telegramId: number;
  telegramLastName: string | null;
  telegramUsername: string | null;
}

export const buildTelegramExternalId = (telegramId: number): string =>
  `${TELEGRAM_EXTERNAL_ID_PREFIX}:${telegramId}`;

export const buildTelegramPrivateMetadata = (
  profile: TelegramProfile
): TelegramPrivateMetadata => ({
  telegramId: profile.telegramId,
  telegramUsername: profile.username,
  telegramFirstName: profile.firstName,
  telegramLastName: profile.lastName,
});
