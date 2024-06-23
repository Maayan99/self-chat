import { IncomingMessage } from '../client/classes/incoming-message';
import { User } from '../classes/user';
import { dbUsers } from '../db/db-users';
import { adminRoot } from '../conversation/admin-root';
import { onboardingRoot } from '../conversation/onboarding-root';
import { ConversationHandler } from '../conversation-handler/conversation-handler';
import { client } from '../main';
import { admins } from "../main";

const KEYWORDS = ['בטל', 'עזרה', 'הגדרות', 'תזכורת', 'קטגוריה'];

export class MessageHandler {
    private conversationHandlers: ConversationHandler[] = [];

    async handleReceivedMessage(message: IncomingMessage): Promise<void> {
        const from = message.from;
        if (typeof message.body === 'string') {
            const msgBody = message.body.trim();

            // Check for specific keywords
            if (this.isSpecialKeyword(msgBody)) {
                await this.handleSpecialKeyword(msgBody, from);
                return;
            }
        }

        // Check for existing conversation handler
        const foundConversationHandler = this.findConversationHandler(from);
        if (foundConversationHandler) {
            await foundConversationHandler.handleTriggerMessage(message);
            return;
        }

        // Handle new user onboarding
        let user: User | null = await dbUsers.getUserByPhone(from);
        if (!user) {
            user = new User(from);
            await this.startOnboarding(user);
        }
    }

    private async handleSpecialKeyword(keyword: string, from: string): Promise<void> {
        switch (keyword) {
            case 'בטל':
                this.cancelConversation(from);
                break;
            case 'עזרה':
                await this.sendHelpMessage(from);
                break;
            case 'הגדרות':
                await this.sendSettingsMessage(from);
                break;
            case 'תזכורת':
                await this.sendReminderMessage(from);
                break;
            case 'קטגוריה':
                await this.handleCategoryCreation(from);
                break;
            default:
                // Handle unrecognized keyword
                break;
        }
    }

    private async startOnboarding(user: User): Promise<void> {
        const handler = new ConversationHandler(onboardingRoot, user, client);
        this.conversationHandlers.push(handler);
        await handler.startConversation();
    }

    private cancelConversation(from: string): void {
        const index = this.conversationHandlers.findIndex((handler) => handler.getConvoPartner() === from);
        if (index !== -1) {
            this.conversationHandlers[index].deleteConvo();
            this.conversationHandlers.splice(index, 1);
        }
    }

    private async sendHelpMessage(from: string): Promise<void> {
        // Implement sending help message to the user
        // Example:
        // await client.sendMessage('Here is the help information...', from);
    }

    private async sendSettingsMessage(from: string): Promise<void> {
        // Implement sending settings message to the user
        // Example:
        // await client.sendMessage('Here are the settings...', from);
    }

    private async sendReminderMessage(from: string): Promise<void> {
        // Implement sending reminder message to the user
        // Example:
        // await client.sendMessage('Here is a reminder...', from);
    }

    private async handleCategoryCreation(from: string): Promise<void> {
        // Implement handling category creation
        // Example:
        // await client.sendMessage('Creating a new category...', from);
    }

    private isSpecialKeyword(message: string): boolean {
        return KEYWORDS.includes(message);
    }

    private findConversationHandler(from: string): ConversationHandler | undefined {
        return this.conversationHandlers.find((handler) => handler.getConvoPartner() === from);
    }

    private isAdmin(phoneNumber: string): boolean {
        return admins.includes(phoneNumber);
    }
}
