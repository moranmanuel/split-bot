export interface AppUser {
    clerkUserId: string;
    createdAt: Date;
    id: string;
}
export interface TelegramIdentity {
    createdAt: Date;
    telegramId: number;
    userId: string;
}
export interface TelegramProfile {
    firstName: string;
    isBot: boolean;
    languageCode: string | null;
    lastName: string | null;
    telegramId: number;
    username: string | null;
}
export interface Conversation {
    createdAt: Date;
    id: string;
    status: "active" | "archived";
    updatedAt: Date;
    userId: string;
}
export interface IncomingTelegramMessage {
    chatId: number | string;
    telegramUser: TelegramProfile;
    text: string;
}
export interface OutboundMessage {
    chatId: number | string;
    text: string;
}
export interface NewUser {
    clerkUserId: string;
}
export interface UserRepository {
    create(input: NewUser): Promise<AppUser>;
    findById(id: string): Promise<AppUser | null>;
}
export interface NewTelegramIdentity {
    telegramId: number;
    userId: string;
}
export interface TelegramIdentityRepository {
    create(input: NewTelegramIdentity): Promise<TelegramIdentity>;
    findByTelegramId(telegramId: number): Promise<TelegramIdentity | null>;
}
export interface SaveInboundMessageInput extends IncomingTelegramMessage {
    userId: string;
}
export interface MessageRepository {
    saveInboundMessage(input: SaveInboundMessageInput): Promise<void>;
}
export interface ConversationRepository {
    createForUser(userId: string): Promise<Conversation>;
    findActiveByUserId(userId: string): Promise<Conversation | null>;
}
export interface ClerkUser {
    externalId: string;
    id: string;
    username: string | null;
}
export interface ClerkGateway {
    createTelegramUser(telegramUser: TelegramProfile): Promise<ClerkUser>;
}
export interface TelegramGateway {
    sendMessage(message: OutboundMessage): Promise<void>;
}
export interface RouteMessageInput {
    conversationId: string | null;
    text: string;
    userId: string;
}
export interface MessageRouter {
    route(input: RouteMessageInput): Promise<string>;
}
//# sourceMappingURL=index.d.ts.map