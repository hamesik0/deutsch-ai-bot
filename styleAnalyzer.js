import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = 'gemini-2.5-flash';

async function analyzeStyle() {
  try {
    const rawText = fs.readFileSync('./sister_text.txt', 'utf8');

    if (!rawText || rawText.length < 1000) {
      console.log('⚠️ Tekst jest za krótki.');
      return;
    }

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
    });

    const prompt = `
Przeanalizuj poniższy tekst i wygeneruj szczegółowe "DNA stylu pisania".

Zrób analizę:
- struktury zdań
- długości zdań
- poziomu formalności
- typowych zwrotów
- emocjonalności
- sposobu tłumaczenia
- czy używa ironii
- czy używa przykładów
- charakterystycznych słów

Wygeneruj gotowy blok instrukcji do użycia jako system prompt dla AI.

Tekst:
${rawText.slice(0, 120000)}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const styleDNA = response.text();

    const fileContent = `
export const SISTER_STYLE = \`
${styleDNA}
\`;
`;

    fs.writeFileSync('./generatedStyle.js', fileContent);

    console.log('✅ Wygenerowano generatedStyle.js');
  } catch (err) {
    console.error('❌ Błąd analizy:', err);
  }
}

analyzeStyle();
