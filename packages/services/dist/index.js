"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkingService = exports.MessageService = exports.ConversationService = exports.UserService = void 0;
const auth_1 = require("@splitbot/auth");
class UserService {
    clerkGateway;
    telegramIdentityRepository;
    userRepository;
    constructor(userRepository, telegramIdentityRepository, clerkGateway) {
        this.userRepository = userRepository;
        this.telegramIdentityRepository = telegramIdentityRepository;
        this.clerkGateway = clerkGateway;
    }
    async ensureTelegramUser(telegramUser) {
        const existingIdentity = await this.telegramIdentityRepository.findByTelegramId(telegramUser.telegramId);
        if (existingIdentity) {
            const existingUser = await this.userRepository.findById(existingIdentity.userId);
            if (!existingUser) {
                throw new Error(`Missing user ${existingIdentity.userId} for telegram:${telegramUser.telegramId}`);
            }
            return existingUser;
        }
        const clerkUser = await this.clerkGateway.createTelegramUser(telegramUser);
        const user = await this.userRepository.create({
            clerkUserId: clerkUser.id,
        });
        await this.telegramIdentityRepository.create({
            telegramId: telegramUser.telegramId,
            userId: user.id,
        });
        return user;
    }
}
exports.UserService = UserService;
class ConversationService {
    conversationRepository;
    constructor(conversationRepository) {
        this.conversationRepository = conversationRepository;
    }
    async getOrCreateForUser(userId) {
        const activeConversation = await this.conversationRepository.findActiveByUserId(userId);
        if (activeConversation) {
            return activeConversation;
        }
        return this.conversationRepository.createForUser(userId);
    }
}
exports.ConversationService = ConversationService;
class MessageService {
    conversationService;
    messageRepository;
    messageRouter;
    telegramGateway;
    userService;
    constructor(userService, conversationService, messageRepository, messageRouter, telegramGateway) {
        this.userService = userService;
        this.conversationService = conversationService;
        this.messageRepository = messageRepository;
        this.messageRouter = messageRouter;
        this.telegramGateway = telegramGateway;
    }
    async handleIncomingMessage(input) {
        const user = await this.userService.ensureTelegramUser(input.telegramUser);
        const conversation = await this.conversationService.getOrCreateForUser(user.id);
        await this.messageRepository.saveInboundMessage({
            ...input,
            userId: user.id,
        });
        const reply = await this.messageRouter.route({
            userId: user.id,
            text: input.text,
            conversationId: conversation.id,
        });
        await this.telegramGateway.sendMessage({
            chatId: input.chatId,
            text: reply,
        });
        return {
            user,
            conversation,
            reply,
        };
    }
}
exports.MessageService = MessageService;
class LinkingService {
    describeTelegramLink(telegramUser) {
        return {
            externalId: (0, auth_1.buildTelegramExternalId)(telegramUser.telegramId),
            telegramId: telegramUser.telegramId,
        };
    }
}
exports.LinkingService = LinkingService;
