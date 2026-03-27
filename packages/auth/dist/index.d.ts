import type { TelegramProfile } from "@splitbot/shared";
export declare const TELEGRAM_EXTERNAL_ID_PREFIX = "telegram";
export interface TelegramPrivateMetadata {
    telegramFirstName: string;
    telegramId: number;
    telegramLastName: string | null;
    telegramUsername: string | null;
}
export declare const buildTelegramExternalId: (telegramId: number) => string;
export declare const buildTelegramPrivateMetadata: (profile: TelegramProfile) => TelegramPrivateMetadata;
//# sourceMappingURL=index.d.ts.map