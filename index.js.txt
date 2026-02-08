import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const CHANNEL_ID = process.env.CHANNEL_ID;

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CHANNEL_ID) return;
  if (!message.content.startsWith('!ai')) return;

  const question = message.content.replace('!ai', '').trim();
  if (!question) {
    await message.reply('❗ Napisz pytanie po `!ai`');
    return;
  }

  const prompt = `
Jesteś nauczycielem języka niemieckiego.
Tłumaczysz jasno, krótko i na poziomie ucznia.
Skupiasz się na gramatyce języka niemieckiego.
Jeśli trzeba, podajesz przykłady zdań.
Odpowiadasz po polsku.

Pytanie ucznia:
${question}
`;

  try {
    await message.channel.sendTyping();
    const result = await model.generateContent(prompt);
    const reply = result.response.text();
    await message.reply(reply.slice(0, 1900));
  } catch (e) {
    console.error(e);
    await message.reply('❌ Błąd AI');
  }
});

client.login(process.env.DISCORD_TOKEN);
