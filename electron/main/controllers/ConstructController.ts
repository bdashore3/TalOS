import { ipcMain } from 'electron';
import Store from 'electron-store';
import { assembleConstructFromData, assemblePromptFromLog } from '../helpers/helpers';
import { generateText } from '../api/llm';
import { isReady, setDiscordBotInfo } from '../api/discord';
import { getConstruct, updateChat } from '../api/pouchdb';
import { ChatInterface, MessageInterface } from '../types/types';
const store = new Store({
    name: 'constructData',
});
type ConstructID = string;

export let ActiveConstructs: ConstructID[] = [];

export const retrieveConstructs = (): ConstructID[] => {
    return store.get('ids', []) as ConstructID[];
}

export const setDoMultiLine = (doMultiLine: boolean): void => {
    store.set('doMultiLine', doMultiLine);
}

export const getDoMultiLine = (): boolean => {
    return store.get('doMultiLine', false) as boolean;
}

const addConstruct = (newId: ConstructID): void => {
    const existingIds = retrieveConstructs();
    if (!existingIds.includes(newId)) {
        existingIds.push(newId);
        store.set('ids', existingIds);
    }
}

const removeConstruct = (idToRemove: ConstructID): void => {
    const existingIds = retrieveConstructs();
    const updatedIds = existingIds.filter(id => id !== idToRemove);
    store.set('ids', updatedIds);
}

const isConstructActive = (id: ConstructID): boolean => {
    const existingIds = retrieveConstructs();
    return existingIds.includes(id);
}

const clearActiveConstructs = (): void => {
    store.set('ids', []);
}

const setAsPrimary = async (id: ConstructID): Promise<void> => {
    const existingIds = retrieveConstructs();  // Assuming retrieveConstructs returns an array of ConstructID
    const index = existingIds.indexOf(id);
    
    if (index > -1) {
        existingIds.splice(index, 1);
    }

    existingIds.unshift(id);

    store.set('ids', existingIds); 
    if(isReady){
        let constructRaw = await getConstruct(id);
        let construct = assembleConstructFromData(constructRaw);
        setDiscordBotInfo(construct.name, construct.avatar);
    }
}

export function getCharacterPromptFromConstruct(construct: any) {
    let prompt = '';
    if(construct.background.length > 1){
        prompt += construct.background + '\n';
    }
    if(construct.interests.length > 1){
        prompt += 'Interests:\n';
        for(let i = 0; i < construct.interests.length; i++){
            prompt += '- ' + construct.interests[i] + '\n';
        }
    }
    if(construct.relationships.length > 1){
        prompt += 'Relationships:\n';
        for(let i = 0; i < construct.relationships.length; i++){
            prompt += '- ' + construct.relationships[i] + '\n';
        }
    }
    if(construct.personality.length > 1){
        prompt += construct.personality + '\n';
    }
    return prompt.replaceAll('{{char}}', `${construct.name}`);
}

export function assemblePrompt(construct: any, chatLog: any, currentUser: string = 'you', messagesToInclude?: any){
    let prompt = '';
    prompt += getCharacterPromptFromConstruct(construct);
    prompt += 'Current Conversation:\n';
    prompt += assemblePromptFromLog(chatLog, messagesToInclude);
    prompt += `${construct.name}:`;
    return prompt.replaceAll('{{user}}', `${currentUser}`);
}

export function assembleInstructPrompt(construct: any, chatLog: any, currentUser: string = 'you', messagesToInclude?: any){
    let prompt = '';
    
    return prompt.replaceAll('{{user}}', `${currentUser}`);
}

export async function generateContinueChatLog(construct: any, chatLog: any, currentUser?: string, messagesToInclude?: any, stopList?: string[]){
    let prompt = assemblePrompt(construct, chatLog, currentUser, messagesToInclude);
    const response = await generateText(prompt, currentUser, stopList);
    console.log(response);
    let reply = ''
    if(response){
        reply = response.results[0];
        return breakUpCommands(construct.name, reply, currentUser, stopList)
    }else{
        console.log('No valid response from GenerateText');
        return null;
    }
}

export function breakUpCommands(charName: string, commandString: string, user = 'You', stopList: string[] = []): string {
    let lines = commandString.split('\n');
    let formattedCommands = [];
    let currentCommand = '';
    let isFirstLine = true;
    
    if (getDoMultiLine() === false){
        lines = lines.slice(0, 1);
        let command = lines[0];
        return command;
    }
    
    for (let i = 0; i < lines.length; i++) {
        // If the line starts with a colon, it's the start of a new command
        let lineToTest = lines[i].toLowerCase();
        
        if (lineToTest.startsWith(`${user.toLowerCase()}:`) || lineToTest.startsWith('you:') || lineToTest.startsWith('<start>') || lineToTest.startsWith('<end>') || lineToTest.startsWith('<user>') || lineToTest.toLowerCase().startsWith('user:')) {
          break;
        }
        
        if (stopList !== null) {
            for(let j = 0; j < stopList.length; j++){
                if(lineToTest.startsWith(`${stopList[j].toLowerCase()}`)){
                    break;
                }
            }
        }
        
        if (lineToTest.startsWith(`${charName}:`)) {
            isFirstLine = false;
            if (currentCommand !== '') {
                // Push the current command to the formattedCommands array
                currentCommand = currentCommand.replace(new RegExp(`${charName}:`, 'g'), '')
                formattedCommands.push(currentCommand.trim());
            }
            currentCommand = lines[i];
        } else {
            if (currentCommand !== '' || isFirstLine){
                currentCommand += (isFirstLine ? '' : '\n') + lines[i];
            }
            if (isFirstLine) isFirstLine = false;
        }
    }
    
    // Don't forget to add the last command
    if (currentCommand !== '') {
        formattedCommands.push(currentCommand);
    }
    
    let final = formattedCommands.join('\n');
    return final;
}

export async function removeMessagesFromChatLog(chatLog: ChatInterface, messageContent: string){
    let newChatLog = chatLog;
    let messages = newChatLog.messages;
    for(let i = 0; i < messages.length; i++){
        if(messages[i].text === messageContent){
            messages.splice(i, 1);
            break;
        }
    }
    newChatLog.messages = messages;
    await updateChat(newChatLog);
    return newChatLog;
}

export async function regenerateMessageFromChatLog(chatLog: ChatInterface, messageContent: string, messageID?: string){
    let messages = chatLog.messages;
    let beforeMessages: MessageInterface[] = [];
    let afterMessages: MessageInterface[] = [];
    let foundMessage: MessageInterface | undefined;
    let messageIndex = -1;
    for(let i = 0; i < messages.length; i++){
        if(messageID !== undefined){
            if(messages[i]._id === messageID){
                messageIndex = i;
                foundMessage = messages[i];
                break;
            }
        }
        if(messages[i].text === messageContent){
            messageIndex = i;
            foundMessage = messages[i];
            break;
        }
    }
    if(foundMessage === undefined){
        return;
    }
    if (messageIndex !== -1) {
        beforeMessages = messages.slice(0, messageIndex);
        afterMessages = messages.slice(messageIndex + 1);
        messages.splice(messageIndex, 1);
    }
    
    // If you want to update the chat without the target message
    chatLog.messages = messages;
    let constructData = await getConstruct(foundMessage.userID);
    if(constructData === null){
        return;
    }
    let construct = assembleConstructFromData(constructData);
    let newReply = await generateContinueChatLog(construct, chatLog, foundMessage.participants[0]);
    if(newReply === null){
        return;
    }
    let newMessage = {
        _id: Date.now().toString(),
        user: construct.name,
        text: newReply,
        userID: construct._id,
        timestamp: Date.now(),
        origin: 'Discord',
        isHuman: false,
        isCommand: false,
        isPrivate: false,
        participants: foundMessage.participants,
        attachments: [],
    }
    messages = beforeMessages.concat(newMessage, afterMessages);    
    chatLog.messages = messages;
    await updateChat(chatLog);
    return newReply;
}

function constructController() {
    ActiveConstructs = retrieveConstructs();
    
    ipcMain.on('add-construct-to-active', (event, arg) => {
        addConstruct(arg);
        ActiveConstructs = retrieveConstructs();
        event.reply('add-construct-to-active-reply', ActiveConstructs);
    });
    
    ipcMain.on('remove-construct-active', (event, arg) => {
        removeConstruct(arg);
        ActiveConstructs = retrieveConstructs();
        event.reply('remove-construct-active-reply', ActiveConstructs);
    });
    
    ipcMain.on('get-construct-active-list', (event, arg) => {
        ActiveConstructs = retrieveConstructs();
        event.reply('get-construct-active-list-reply', ActiveConstructs);
    });

    ipcMain.on('is-construct-active', (event, arg) => {
        const isActive = isConstructActive(arg);
        event.reply('is-construct-active-reply', isActive);
    });

    ipcMain.on('remove-all-constructs-active', (event, arg) => {
        clearActiveConstructs();
        ActiveConstructs = retrieveConstructs();
        event.reply('remove-all-constructs-active-reply', ActiveConstructs);
    });

    ipcMain.on('set-construct-primary', (event, arg) => {
        setAsPrimary(arg);
        ActiveConstructs = retrieveConstructs();
        event.reply('set-construct-primary-reply', ActiveConstructs);
    });

    ipcMain.on('set-do-multi-line', (event, arg) => {
        setDoMultiLine(arg);
        event.reply('set-do-multi-line-reply', getDoMultiLine());
    });

    ipcMain.on('get-do-multi-line', (event, arg) => {
        event.reply('get-do-multi-line-reply', getDoMultiLine());
    });

    ipcMain.on('get-character-prompt-from-construct', (event, arg) => {
        let prompt = getCharacterPromptFromConstruct(arg);
        event.reply('get-character-prompt-from-construct-reply', prompt);
    });

    ipcMain.on('assemble-prompt', (event, construct, chatLog, currentUser, messagesToInclude) => {
        let prompt = assemblePrompt(construct, chatLog, currentUser, messagesToInclude);
        event.reply('assemble-prompt-reply', prompt);
    });

    ipcMain.on('assemble-instruct-prompt', (event, construct, chatLog, currentUser, messagesToInclude) => {
        let prompt = assembleInstructPrompt(construct, chatLog, currentUser, messagesToInclude);
        event.reply('assemble-instruct-prompt-reply', prompt);
    });

    ipcMain.on('generate-continue-chat-log', (event, construct, chatLog, currentUser, messagesToInclude, stopList) => {
        generateContinueChatLog(construct, chatLog, currentUser, messagesToInclude, stopList).then((response) => {
            event.reply('generate-continue-chat-log-reply', response);
        });
    });

    ipcMain.on('remove-messages-from-chat-log', (event, chatLog, messageContent) => {
        removeMessagesFromChatLog(chatLog, messageContent).then((response) => {
            event.reply('remove-messages-from-chat-log-reply', response);
        });
    });

    ipcMain.on('regenerate-message-from-chat-log', (event, chatLog, messageContent, messageID) => {
        regenerateMessageFromChatLog(chatLog, messageContent, messageID).then((response) => {
            event.reply('regenerate-message-from-chat-log-reply', response);
        });
    });

    ipcMain.on('break-up-commands', (event, charName, commandString, user, stopList) => {
        let response = breakUpCommands(charName, commandString, user, stopList);
        event.reply('break-up-commands-reply', response);
    });

}
export default constructController;