import { ipcMain } from 'electron';
import { ActivityType, Client, GatewayIntentBits, Collection, REST, Routes, Partials, TextChannel, DMChannel, NewsChannel, Snowflake, Webhook } from 'discord.js';

const intents = { 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildEmojisAndStickers, 
    GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.GuildModeration], 
    partials: [Partials.Channel, Partials.GuildMember, Partials.User, Partials.Reaction, Partials.Message] 
};
type ValidStatus = 'online' | 'dnd' | 'idle' | 'invisible';

function cleanUsername(username: string) {
    // Remove leading characters
    let cleaned = username.replace(/^[._-]+/, '');
  
    // Remove trailing characters
    cleaned = cleaned.replace(/[._-]+$/, '');
  
    return cleaned;
}

function cleanEmoji(text: string) {
    // Remove emoji characters using regex
    return text.replace(/<:[a-zA-Z0-9_]+:[0-9]+>/g, '');
}

export function DiscordJSRoutes(){
    const disClient = new Client(intents);
    const commands = new Collection();
    let isReady = false;

    disClient.on('messageCreate', async (message) => {
        if (message.author.bot) return;
    });

    disClient.on('ready', () => {
        if(!disClient.user) return;
        if(disClient.user){
            disClient.user.setActivity({ name: 'with your feelings', type: ActivityType.Playing });
        }
        isReady = true;
        console.log(`Logged in as ${disClient.user.tag}!`);
    });

    async function setDiscordBotInfo(botName: string, base64Avatar: string): Promise<void> {
        if(!isReady) return;
        if (!disClient.user) {
            console.error("Discord client user is not initialized.");
            return;
        }
        let newName;
        let newNameDot;
        try {
            await disClient.user.setUsername(botName);
            console.log(`My new username is ${botName}`);
        } catch (error) {
            console.error(`Failed to set username to ${botName}:`, error);

            // If the first attempt fails, add an underscore and try again
            try {
                newName = "_" + botName;
                await disClient.user.setUsername(newName);
                console.log(`My new username is ${newName}`);
            } catch (error) {
                console.error(`Failed to set username to ${newName}:`, error);
    
                // If the second attempt fails, add a dot and try again
                try {
                    newNameDot = "." + botName;
                    await disClient.user.setUsername(newNameDot);
                    console.log(`My new username is ${newNameDot}`);
                } catch (error) {
                    console.error(`Failed to set username to ${newNameDot}:`, error);
                }
            }
        }
    
        // Change bot's avatar
        try {
            const buffer = Buffer.from(base64Avatar, 'base64');
            await disClient.user.setAvatar(buffer);
            console.log('New avatar set!');
        } catch (error) {
            console.error('Failed to set avatar:', error);
        }
    }

    async function setStatus(message: string, type: string){
        if(!disClient.user) return;
        if(!isReady) return;
    
        let activityType: ActivityType.Playing | ActivityType.Streaming | ActivityType.Listening | ActivityType.Watching | ActivityType.Competing;
    
        switch (type) {
            case 'Playing':
                activityType = ActivityType.Playing;
                break;
            case 'Watching':
                activityType = ActivityType.Watching;
                break;
            case 'Listening':
                activityType = ActivityType.Listening;
                break;
            case 'Streaming':
                activityType = ActivityType.Streaming;
                break;
            case 'Competing':
                activityType = ActivityType.Competing;
                break;
            default:
                activityType = ActivityType.Playing;
                break;
        }
    
        disClient.user.setActivity(`${message}`, {type: activityType});
    }

    async function setOnlineMode(type: ValidStatus) {
        if(!disClient.user) return;
        if(!isReady) return;
        disClient.user.setStatus(type);
    }
    
    async function sendMessage(channelID: Snowflake, message: string): Promise<void> {
        if(!isReady) return;
        if (!disClient.user) {
            console.error("Discord client user is not initialized.");
            return;
        }
        const channel = await disClient.channels.fetch(channelID);
    
        // Check if the channel is one of the types that can send messages
        if (channel instanceof TextChannel || channel instanceof DMChannel || channel instanceof NewsChannel) {
            channel.send(message);
        }
    }

    async function getWebhookForCharacter(charName: string, channelID: Snowflake): Promise<Webhook | undefined> {
        if(!isReady) return;
        const channel = disClient.channels.cache.get(channelID);
    
        if (!(channel instanceof TextChannel || channel instanceof NewsChannel)) {
            return undefined;
        }
    
        const webhooks = await channel.fetchWebhooks();
        return webhooks.find(webhook => webhook.name === charName);
    }
    
    async function sendMessageAsCharacter(charName: string, channelID: Snowflake, message: string): Promise<void> {
        if(!isReady) return;
        const webhook = await getWebhookForCharacter(charName, channelID);
        
        if (!webhook) {
            throw new Error(`Webhook for character ${charName} not found.`);
        }
    
        await webhook.send(message);
    }
    
    async function getWebhooksForChannel(channelID: Snowflake): Promise<string[]> {
        if(!isReady) return [];
        const channel = disClient.channels.cache.get(channelID);
    
        if (!(channel instanceof TextChannel || channel instanceof NewsChannel)) {
            return [];
        }
    
        const webhooks = await channel.fetchWebhooks();
        return webhooks.map(webhook => webhook.name);
    }

    ipcMain.handle('discord-login', async (event, token: string) => {
        await disClient.login(token);
        return true;
    });

    ipcMain.handle('discord-logout', async (event) => {
        await disClient.destroy();
        return true;
    });

    ipcMain.handle('discord-set-bot-info', async (event, botName: string, base64Avatar: string) => {
        if(!isReady) return false;
        await setDiscordBotInfo(botName, base64Avatar);
        return true;
    });

    ipcMain.handle('discord-set-status', async (event, message: string, type: string) => {
        if(!isReady) return false;
        await setStatus(message, type);
        return true;
    });

    ipcMain.handle('discord-set-online-mode', async (event, type: ValidStatus) => {
        if(!isReady) return false;
        await setOnlineMode(type);
        return true;
    });

    ipcMain.handle('discord-send-message', async (event, channelID: Snowflake, message: string) => {
        if(!isReady) return false;
        await sendMessage(channelID, message);
        return true;
    });

    ipcMain.handle('discord-send-message-as-character', async (event, charName: string, channelID: Snowflake, message: string) => {
        if(!isReady) return false;
        await sendMessageAsCharacter(charName, channelID, message);
        return true;
    });

    ipcMain.on('discord-get-webhooks-for-channel', async (event, channelID: Snowflake) => {
        if(!isReady) return false;
        const webhooks = await getWebhooksForChannel(channelID);
        event.sender.send('discord-get-webhooks-for-channel-reply', webhooks);
    });

    ipcMain.on('discord-get-webhook-for-character', async (event, charName: string, channelID: Snowflake) => {
        if(!isReady) return false;
        const webhook = await getWebhookForCharacter(charName, channelID);
        event.sender.send('discord-get-webhook-for-character-reply', webhook);
    });

    ipcMain.on('discord-get-user', async (event) => {
        if(!isReady) return false;
        if (!disClient.user) {
            console.error("Discord client user is not initialized.");
            return false;
        }
        event.sender.send('discord-get-user-reply', disClient.user);
    });

    ipcMain.on('discord-get-user-id', async (event) => {
        if(!isReady) return false;
        if (!disClient.user) {
            console.error("Discord client user is not initialized.");
            return false;
        }
        event.sender.send('discord-get-user-id-reply', disClient.user.id);
    });

    ipcMain.on('discord-get-user-username', async (event) => {
        if(!isReady) return false;
        if (!disClient.user) {
            console.error("Discord client user is not initialized.");
            return false;
        }
        event.sender.send('discord-get-user-username-reply', disClient.user.username);
    });

    ipcMain.on('discord-get-user-avatar', async (event) => {
        if(!isReady) return false;
        if (!disClient.user) {
            console.error("Discord client user is not initialized.");
            return false;
        }
        event.sender.send('discord-get-user-avatar-reply', disClient.user.avatarURL());
    });

    ipcMain.on('discord-get-user-discriminator', async (event) => {
        if(!isReady) return false;
        if (!disClient.user) {
            console.error("Discord client user is not initialized.");
            return false;
        }
        event.sender.send('discord-get-user-discriminator-reply', disClient.user.discriminator);
    });

    ipcMain.on('discord-get-user-tag', async (event) => {
        if(!isReady) return false;
        if (!disClient.user) {
            console.error("Discord client user is not initialized.");
            return false;
        }
        event.sender.send('discord-get-user-tag-reply', disClient.user.tag);
    });

    ipcMain.on('discord-get-user-createdAt', async (event) => {
        if(!isReady) return false;
        if (!disClient.user) {
            console.error("Discord client user is not initialized.");
            return false;
        }
        event.sender.send('discord-get-user-createdAt-reply', disClient.user.createdAt);
    });

    ipcMain.on('discord-bot-status', async (event) => {
        event.sender.send('discord-bot-status-reply', isReady);
    });
};