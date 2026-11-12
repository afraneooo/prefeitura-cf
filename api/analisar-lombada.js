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
    - "lombada_detectada": true se houver uma lombada, quebra-molas ou via sendo vistoriada na foto; false se for uma foto aleatória (ex: mesa, parede, rosto, objeto sem relação com trânsito).
    - "tipo": se lombada_detectada for true, classifique entre "Tipo A", "Tipo B" ou "Irregular". Se for false, deixe "".
    - "vertical": avalie a sinalização vertical (placas) entre "Bom", "Regular", "Ruim" ou "Inexistente". Se lombada_detectada for false, deixe "".
    - "horizontal": avalie a sinalização horizontal (pintura no chão) entre "Bom", "Regular", "Ruim" ou "Inexistente". Se lombada_detectada for false, deixe "".
    - "observacoes": se lombada_detectada for true, descreva brevemente o estado da lombada e da sinalização. Se for false, descreva brevemente o que aparece na foto e avise que nenhuma lombada foi identificada.`;

    // Função auxiliar com tentativa automática caso o servidor esteja com alta demanda
    async function chamarGemini(modelo) {
      return await ai.models.generateContent({
        model: modelo,
        contents: [
          prompt,
          { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
        ],
        config: { responseMimeType: "application/json" }
      });
    }

    let response;
    try {
      // Tenta primeiro no modelo principal
      response = await chamarGemini("gemini-3.8-flash");
    } catch (err) {
      // Se der erro de alta demanda (503 / 429), tenta automaticamente no modelo alternativo estável
      response = await chamarGemini("gemini-2.5-flash");
    }

    const dados = JSON.parse(response.text);
    return res.status(200).json(dados);

  } catch (error) {
    const msg = error.message || "";
    if (msg.includes("503") || msg.includes("overloaded") || msg.includes("429")) {
      return res.status(503).json({ error: "Servidores da IA com alta demanda no momento. Aguarde 5 segundos e tente novamente." });
    }
    return res.status(500).json({ error: msg });
  }
}
