import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SISTER_STYLE } from './generatedStyle.js'; // ✅ NOWY IMPORT

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

// 🧠 Pamięć rozmów (per użytkownik)
const conversations = new Map();

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
        maxOutputTokens: 8129,
      },
    });

    const userId = message.author.id;

    if (!conversations.has(userId)) {
      conversations.set(userId, []);
    }

    const history = conversations.get(userId);

    // 📌 System prompt jako pierwsza wiadomość (jeśli nowa rozmowa)
    if (history.length === 0) {
      history.push({
        role: "user",
        parts: [{
          text: `
${SISTER_STYLE}

Jesteś niemieckim lingwistą (native C2).
Odpowiadasz zwięźle, precyzyjnie i w języku polskim. Nie masz kija w dupie i piszesz w miarę luźno ale z szacunkiem do osoby zadającej Ci pytanie.
Używaj języka potocznego do odpowiedzi ale nie wulgarnego.
Nie nadużywaj językoznawczej papki, nie używaj językoznawczych pojęć wykraczających poza poziom podstawowy jak przypadek, czasownik itp.
"an" po niemiecku znaczy "przy", a nie "na".
Każdą odpowiedź zaczynaj od przywitania "Cześć", "Witaj", lub podobnego.

Nie rozpisuj się.
Nie filozofuj.
Nie urywaj zdań.
Kończ pełną myślą.
Zawsze zakończ odpowiedź pełnym zdaniem.
Jeśli zbliżasz się do limitu, skróć mniej istotne części, ale zakończ logicznie.
`
        }]
      });
    }

    history.push({
      role: "user",
      parts: [{ text: question }]
    });

    if (history.length > 10) {
      history.splice(1, history.length - 10);
    }

    const result = await model.generateContent({
      contents: history,
    });

    const response = await result.response;
    let reply = response.text();

    if (!reply || reply.length < 5) {
      return message.reply('❌ Nie udało się wygenerować odpowiedzi.');
    }

    history.push({
      role: "model",
      parts: [{ text: reply }]
    });

    reply = safeTrim(reply, 3900);

    const embed = new EmbedBuilder()
      .setColor('#1D3557')
      .setAuthor({
        name: 'Deutsch AI',
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

function safeTrim(text, maxLength) {
  if (text.length <= maxLength) return text;

  let trimmed = text.slice(0, maxLength);

  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot > maxLength * 0.7) {
    return trimmed.slice(0, lastDot + 1);
  }

  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace > -1) {
    return trimmed.slice(0, lastSpace) + '...';
  }

  return trimmed + '...';
}

client.login(process.env.DISCORD_TOKEN);
