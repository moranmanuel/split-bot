import { buildTelegramExternalId } from "@splitbot/auth";
import type {
  AppUser,
  ClerkGateway,
  Conversation,
  ConversationRepository,
  IncomingTelegramMessage,
  MessageRepository,
  MessageRouter,
  TelegramGateway,
  TelegramIdentityRepository,
  TelegramProfile,
  UserRepository,
} from "@splitbot/shared";

export class UserService {
  private readonly clerkGateway: ClerkGateway;
  private readonly telegramIdentityRepository: TelegramIdentityRepository;
  private readonly userRepository: UserRepository;

  constructor(
    userRepository: UserRepository,
    telegramIdentityRepository: TelegramIdentityRepository,
    clerkGateway: ClerkGateway
  ) {
    this.userRepository = userRepository;
    this.telegramIdentityRepository = telegramIdentityRepository;
    this.clerkGateway = clerkGateway;
  }

  async ensureTelegramUser(telegramUser: TelegramProfile): Promise<AppUser> {
    const existingIdentity =
      await this.telegramIdentityRepository.findByTelegramId(
        telegramUser.telegramId
      );

    if (existingIdentity) {
      const existingUser = await this.userRepository.findById(
        existingIdentity.userId
      );

      if (!existingUser) {
        throw new Error(
          `Missing user ${existingIdentity.userId} for telegram:${telegramUser.telegramId}`
        );
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

export class ConversationService {
  private readonly conversationRepository: ConversationRepository;

  constructor(conversationRepository: ConversationRepository) {
    this.conversationRepository = conversationRepository;
  }

  async getOrCreateForUser(userId: string): Promise<Conversation> {
    const activeConversation =
      await this.conversationRepository.findActiveByUserId(userId);

    if (activeConversation) {
      return activeConversation;
    }

    return this.conversationRepository.createForUser(userId);
  }
}

export interface MessageServiceResult {
  conversation: Conversation;
  reply: string;
  user: AppUser;
}

export class MessageService {
  private readonly conversationService: ConversationService;
  private readonly messageRepository: MessageRepository;
  private readonly messageRouter: MessageRouter;
  private readonly telegramGateway: TelegramGateway;
  private readonly userService: UserService;

  constructor(
    userService: UserService,
    conversationService: ConversationService,
    messageRepository: MessageRepository,
    messageRouter: MessageRouter,
    telegramGateway: TelegramGateway
  ) {
    this.userService = userService;
    this.conversationService = conversationService;
    this.messageRepository = messageRepository;
    this.messageRouter = messageRouter;
    this.telegramGateway = telegramGateway;
  }

  async handleIncomingMessage(
    input: IncomingTelegramMessage
  ): Promise<MessageServiceResult> {
    const user = await this.userService.ensureTelegramUser(input.telegramUser);
    const conversation = await this.conversationService.getOrCreateForUser(
      user.id
    );

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

export interface TelegramLinkDescriptor {
  externalId: string;
  telegramId: number;
}

export class LinkingService {
  describeTelegramLink(telegramUser: TelegramProfile): TelegramLinkDescriptor {
    return {
      externalId: buildTelegramExternalId(telegramUser.telegramId),
      telegramId: telegramUser.telegramId,
    };
  }
}
