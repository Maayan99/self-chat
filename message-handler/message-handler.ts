import { IncomingMessage } from '../client/classes/incoming-message';
import { User } from '../classes/user';
import { dbUsers } from '../db/db-users';
import { dbCategories } from '../db/db-categories';
import { adminRoot } from '../conversation/adminRoot';
import { onboardingRoot } from '../conversation/onboardingRoot';
import { ConversationHandler } from '../conversation/ConversationHandler';
import {admins, client} from '../main';

export class MessageHandler {
    async handleReceivedMessage(message: IncomingMessage): Promise<void> {
        const from = message.from;
        const msgBody = message.body.trim();

        if (this.isAdmin(from)) {
            if (!msgBody.startsWith('סימו:')) {
                await this.handleAdminMessage(msgBody, from);
                return;
            }
        } else {
            let user: User | null = await dbUsers.getUserByPhone(from);

            if (!user) {
                // New user, start onboarding
                user = new User(from);
                await this.startOnboarding(user);
            } else {
                // Check for specific commands or category creations
                await this.handleUserMessage(msgBody, user);
            }
        }
    }

    private async startOnboarding(user: User): Promise<void> {
        const handler = new ConversationHandler(onboardingRoot, user, client);
        await handler.startConversation();

        // Insert user into DB after onboarding completes
        await dbUsers.insertUser(user.phone);
    }

    private async handleAdminMessage(message: string, from: string): Promise<void> {
        // Start admin conversation tree
        const handler = new ConversationHandler(adminRoot, new User(from), client);
        await handler.startConversation();
    }

    private async handleUserMessage(message: string, user: User): Promise<void> {
        // Check for category creation or specific commands
        if (message.startsWith('צ ')) {
            await this.handleCategoryCreation(message, user);
        } else if (message === 'עזרה') {
            await this.sendHelpResponse(user);
        } else if (message === 'הגדרות') {
            await this.sendSettingsResponse(user);
        } else if (message === 'תזכורת') {
            await this.sendReminderResponse(user);
        } else {
            // Handle general messages or unsupported commands
            // You can add logic here for handling general messages if needed
        }
    }

    private async handleCategoryCreation(message: string, user: User): Promise<void> {
        // Extract category name from message
        const categoryName = message.substring(2, message.indexOf(':')).trim();

        // Check if category exists for the user
        const categories = await dbCategories.getAllDbCategories(user);

        const categoryExists = categories.some((category) => category.name === categoryName);

        if (categoryExists) {
            // Logic for handling object creation within an existing category
            // Example: prompt for fields or process object creation
        } else {
            // Logic for creating a new category
            // Example: start a conversation flow for category creation
        }
    }

    private async sendHelpResponse(user: User): Promise<void> {
        // Logic for sending help response to the user
    }

    private async sendSettingsResponse(user: User): Promise<void> {
        // Logic for sending settings response to the user
    }

    private async sendReminderResponse(user: User): Promise<void> {
        // Logic for sending reminder response to the user
    }

    private isAdmin(phoneNumber: string): boolean {
        return admins.includes(phoneNumber);
    }
}
