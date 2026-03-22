import type {
  IncomingTelegramMessage,
  TelegramProfile,
} from "@splitbot/shared";

export interface TelegramUserLike {
  first_name: string;
  id: number;
  is_bot: boolean;
  language_code?: string;
  last_name?: string;
  username?: string;
}

export interface CreateIncomingTelegramMessageInput {
  chatId: number | string;
  telegramUser: TelegramUserLike;
  text: string;
}

export const toTelegramProfile = (
  telegramUser: TelegramUserLike
): TelegramProfile => ({
  telegramId: telegramUser.id,
  isBot: telegramUser.is_bot,
  firstName: telegramUser.first_name,
  lastName: telegramUser.last_name ?? null,
  username: telegramUser.username ?? null,
  languageCode: telegramUser.language_code ?? null,
});

export const createIncomingTelegramMessage = (
  input: CreateIncomingTelegramMessageInput
): IncomingTelegramMessage => ({
  chatId: input.chatId,
  text: input.text,
  telegramUser: toTelegramProfile(input.telegramUser),
});
