import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Você é um engenheiro de tráfego especialista em vistorias de lombadas urbanas em Cabo Frio.
    Analise a imagem enviada e retorne estritamente um objeto JSON válido com estes exatos campos:
    - "lombada_detectada": true se houver uma lombada ou via sendo vistoriada; false se for uma foto aleatória sem relação com trânsito.
    - "tipo": se lombada_detectada for true, classifique entre "Tipo A", "Tipo B" ou "Irregular". Se false, deixe "".
    - "vertical": avalie placas entre "Bom", "Regular", "Ruim" ou "Inexistente". Se false, deixe "".
    - "horizontal": avalie pintura no chão entre "Bom", "Regular", "Ruim" ou "Inexistente". Se false, deixe "".
    - "observacoes": se true, descreva o estado da lombada. Se false, descreva o que aparece na foto e avise que nenhuma lombada foi identificada.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        prompt,
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
      ],
      config: { responseMimeType: "application/json" }
    });

    const dados = JSON.parse(response.text);
    return res.status(200).json(dados);

  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro interno na IA" });
  }
}
