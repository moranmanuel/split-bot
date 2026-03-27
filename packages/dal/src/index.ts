import { buildTelegramExternalId } from "@splitbot/auth";
import type {
  AppUser,
  ClerkGateway,
  ClerkUser,
  Conversation,
  ConversationRepository,
  MessageRepository,
  SaveInboundMessageInput,
  TelegramGateway,
  TelegramIdentity,
  TelegramIdentityRepository,
  TelegramProfile,
  UserRepository,
} from "@splitbot/shared";

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, AppUser>();
  private userSequence = 0;

  findById(id: string): Promise<AppUser | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  create(input: { clerkUserId: string }): Promise<AppUser> {
    const user: AppUser = {
      id: `user-${++this.userSequence}`,
      clerkUserId: input.clerkUserId,
      createdAt: new Date(),
    };

    this.users.set(user.id, user);

    return Promise.resolve(user);
  }
}

export class InMemoryTelegramIdentityRepository
  implements TelegramIdentityRepository
{
  private readonly identities = new Map<number, TelegramIdentity>();

  findByTelegramId(telegramId: number): Promise<TelegramIdentity | null> {
    return Promise.resolve(this.identities.get(telegramId) ?? null);
  }

  create(input: {
    telegramId: number;
    userId: string;
  }): Promise<TelegramIdentity> {
    const identity: TelegramIdentity = {
      telegramId: input.telegramId,
      userId: input.userId,
      createdAt: new Date(),
    };

    this.identities.set(identity.telegramId, identity);

    return Promise.resolve(identity);
  }
}

export class InMemoryMessageRepository implements MessageRepository {
  readonly messages: SaveInboundMessageInput[] = [];

  saveInboundMessage(input: SaveInboundMessageInput): Promise<void> {
    this.messages.push(input);

    return Promise.resolve();
  }
}

export class InMemoryConversationRepository implements ConversationRepository {
  private readonly conversationsByUserId = new Map<string, Conversation>();
  private conversationSequence = 0;

  findActiveByUserId(userId: string): Promise<Conversation | null> {
    return Promise.resolve(this.conversationsByUserId.get(userId) ?? null);
  }

  createForUser(userId: string): Promise<Conversation> {
    const now = new Date();
    const conversation: Conversation = {
      id: `conversation-${++this.conversationSequence}`,
      userId,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    this.conversationsByUserId.set(userId, conversation);

    return Promise.resolve(conversation);
  }
}

export class StubClerkGateway implements ClerkGateway {
  private userSequence = 0;

  createTelegramUser(telegramUser: TelegramProfile): Promise<ClerkUser> {
    return Promise.resolve({
      id: `clerk-${++this.userSequence}`,
      externalId: buildTelegramExternalId(telegramUser.telegramId),
      username: telegramUser.username,
    });
  }
}

export class MemoryTelegramGateway implements TelegramGateway {
  readonly sentMessages: Array<{
    chatId: number | string;
    text: string;
  }> = [];

  sendMessage(message: {
    chatId: number | string;
    text: string;
  }): Promise<void> {
    this.sentMessages.push(message);

    return Promise.resolve();
  }
}
