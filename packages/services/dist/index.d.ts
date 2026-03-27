import type { AppUser, ClerkGateway, Conversation, ConversationRepository, IncomingTelegramMessage, MessageRepository, MessageRouter, TelegramGateway, TelegramIdentityRepository, TelegramProfile, UserRepository } from "@splitbot/shared";
export declare class UserService {
    private readonly clerkGateway;
    private readonly telegramIdentityRepository;
    private readonly userRepository;
    constructor(userRepository: UserRepository, telegramIdentityRepository: TelegramIdentityRepository, clerkGateway: ClerkGateway);
    ensureTelegramUser(telegramUser: TelegramProfile): Promise<AppUser>;
}
export declare class ConversationService {
    private readonly conversationRepository;
    constructor(conversationRepository: ConversationRepository);
    getOrCreateForUser(userId: string): Promise<Conversation>;
}
export interface MessageServiceResult {
    conversation: Conversation;
    reply: string;
    user: AppUser;
}
export declare class MessageService {
    private readonly conversationService;
    private readonly messageRepository;
    private readonly messageRouter;
    private readonly telegramGateway;
    private readonly userService;
    constructor(userService: UserService, conversationService: ConversationService, messageRepository: MessageRepository, messageRouter: MessageRouter, telegramGateway: TelegramGateway);
    handleIncomingMessage(input: IncomingTelegramMessage): Promise<MessageServiceResult>;
}
export interface TelegramLinkDescriptor {
    externalId: string;
    telegramId: number;
}
export declare class LinkingService {
    describeTelegramLink(telegramUser: TelegramProfile): TelegramLinkDescriptor;
}
//# sourceMappingURL=index.d.ts.map