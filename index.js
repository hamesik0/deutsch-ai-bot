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

const MODEL_NAME = 'gemini-2.5-flash';
const ALLOWED_CHANNEL_ID = '1469795232601214996';

client.once('ready', () => {
  console.log(`✅ Zalogowano jako ${client.user.tag}`);
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
Jesteś niemieckim lingwistą (native C2).
Odpowiadasz zwięźle, precyzyjnie, akademicko i w języku polskim.

STRUKTURA OBOWIĄZKOWA:

1. REGUŁA (zgodnie z normą językową – Duden)
2. Krótkie wyjaśnienie
3. Analiza (Kasus / Rektion / Satzbau – jeśli istotne)
4. 2–3 poprawne przykłady
5. Rejestr (formalny / potoczny – jeśli dotyczy)
6. Poziom CEFR
7. Krótkie podsumowanie (1–2 zdania)

Nie rozpisuj się.
Nie filozofuj.
Nie urywaj zdań.
Kończ pełną myślą.

Pytanie:
${question}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let reply = response.text();

    if (!reply || reply.length < 5) {
      return message.reply('❌ Nie udało się wygenerować odpowiedzi.');
    }

    // 🔒 Zabezpieczenie przed urwaniem w połowie słowa
    reply = safeTrim(reply, 3900);

    // 🎨 Minimalistyczny premium embed
    const embed = new EmbedBuilder()
      .setColor('#1D3557') 
      .setAuthor({
        name: 'Deutsch AI – Lingwistyczna analiza',
        iconURL: client.user.displayAvatarURL(),
      })
      .setDescription(reply)
      .setTimestamp()
      .setFooter({
        text: `Zapytanie od ${message.author.username} • Gemini 2.5 Flash`,
        iconURL: message.author.displayAvatarURL(),
      });

    await message.reply({ embeds: [embed] });

  } catch (error) {
    console.error(error);
    message.reply('❌ Wystąpił błąd podczas generowania odpowiedzi.');
  }
});

/**
 * Bezpieczne przycinanie tekstu:
 * - nie ucina w połowie słowa
 * - próbuje zakończyć na kropce
 */
function safeTrim(text, maxLength) {
  if (text.length <= maxLength) return text;

  let trimmed = text.slice(0, maxLength);

  // spróbuj zakończyć na ostatniej kropce
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot > maxLength * 0.7) {
    return trimmed.slice(0, lastDot + 1);
  }

  // jeśli nie ma kropki – zakończ na ostatniej spacji
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace > -1) {
    return trimmed.slice(0, lastSpace) + '...';
  }

  return trimmed + '...';
}

client.login(process.env.DISCORD_TOKEN);
