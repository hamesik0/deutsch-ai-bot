import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ⬇️ MĄDRZEJSZY MODEL
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro'
});

const CHANNEL_ID = process.env.CHANNEL_ID;

/**
 * Dzieli tekst na sensowne kawałki (po zdaniach)
 * max 4000 znaków (limit embeda)
 */
function splitTextSmart(text, maxLength = 4000) {
  const sentences = text.match(/[^.!?]+[.!?]+|\s*$/g);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CHANNEL_ID) return;
  if (!message.content.startsWith('!ai')) return;

  const question = message.content.replace('!ai', '').trim();
  if (!question) {
    await message.reply('❗ Użyj: `!ai [pytanie]`');
    return;
  }

  // 🧠 TWARDY PROMPT = MNIEJ GŁUPOT
  const prompt = `
Jesteś doświadczonym nauczycielem języka niemieckiego (min. 10 lat praktyki).
Twoim zadaniem jest poprawne i PRECYZYJNE tłumaczenie gramatyki.

ZASADY:
- Odpowiadasz WYŁĄCZNIE na temat gramatyki języka niemieckiego
- Jeśli pytanie jest nieprecyzyjne, NAJPIERW to zaznaczasz
- NIE zgadujesz
- Jeśli istnieją wyjątki, MUSISZ je podać
- Jeśli nie jesteś pewien, piszesz to wprost
- Odpowiadasz po polsku
- Styl: rzeczowy, nauczycielski, klarowny

STRUKTURA ODPOWIEDZI:
1. Krótkie wyjaśnienie reguły
2. Przykłady (minimum 2)
3. Wyjątki / uwagi (jeśli istnieją)

PYTANIE UCZNIA:
${question}
`;

  try {
    await message.channel.sendTyping();

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    const parts = splitTextSmart(reply);

    for (let i = 0; i < parts.length; i++) {
      const embed = new EmbedBuilder()
        .setTitle(i === 0 ? '🇩🇪 Gramatyka niemiecka' : '🇩🇪 Kontynuacja')
        .setDescription(parts[i])
        .setColor(0x1f8b4c)
        .setFooter({ text: 'DeutschAI • Gemini 1.5 Pro' });

      await message.reply({ embeds: [embed] });
    }

  } catch (err) {
    console.error(err);
    await message.reply('❌ Wystąpił błąd podczas generowania odpowiedzi.');
  }
});

client.login(process.env.DISCORD_TOKEN);
