import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL_NAME = 'gemini-1.5-flash';
const ALLOWED_CHANNEL_ID = '1469795232601214996';

client.once('ready', () => {
  console.log(`Zalogowano jako ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== ALLOWED_CHANNEL_ID) return;
  if (!message.content.startsWith('!ai')) return;

  const question = message.content.replace('!ai', '').trim();
  if (!question) {
    return message.reply('Podaj pytanie po komendzie !ai');
  }

  try {
    await message.channel.sendTyping();

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
    });

    const prompt = `
Jesteś niemieckim lingwistą (poziom native C2).
Twoim zadaniem jest udzielanie precyzyjnych, akademickich wyjaśnień gramatycznych.

ZASADY OBOWIĄZKOWE:

1. Odpowiadasz zgodnie ze standardową normą językową (Hochdeutsch).
2. Każdą regułę formułujesz jako:
   "Zgodnie z normą języka niemieckiego (Duden)..."
3. Określasz poziom CEFR (A1–C2).
4. Wyjaśniasz:
   - regułę gramatyczną
   - rekcję (jeśli dotyczy)
   - przypadek (Kasus)
   - strukturę zdania (Satzstruktur)
5. Podajesz:
   - 3 poprawne przykłady
   - 1 kontrprzykład (błędny) z wyjaśnieniem
6. Rozróżniasz:
   - Sprache formell
   - Umgangssprache (jeśli występuje różnica)
7. Nie upraszczasz nadmiernie.
8. Nie zgadujesz. Jeśli istnieją warianty regionalne – zaznacz to.
9. Unikaj lania wody i motywacyjnych wstawek.

Pytanie:
${question}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let reply = response.text();

    if (!reply) {
      return message.reply('Nie udało się wygenerować odpowiedzi.');
    }

    const chunks = splitMessage(reply, 4000);

    for (const chunk of chunks) {
      const embed = new EmbedBuilder()
        .setColor(0x1F8B4C)
        .setTitle('🇩🇪 Deutsch AI – Analiza językowa')
        .setDescription(chunk)
        .setFooter({ text: 'Tryb: Akademicki | Model: Gemini 1.5-flash | CEFR + Duden styl' });

      await message.reply({ embeds: [embed] });
    }

  } catch (error) {
    console.error(error);
    message.reply('❌ Wystąpił błąd podczas generowania odpowiedzi.');
  }
});

function splitMessage(text, maxLength) {
  const paragraphs = text.split('\n');
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if ((current + paragraph).length > maxLength) {
      chunks.push(current);
      current = '';
    }
    current += paragraph + '\n';
  }

  if (current) chunks.push(current);
  return chunks;
}

client.login(process.env.DISCORD_TOKEN);

