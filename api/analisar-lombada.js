import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Você é um engenheiro de tráfego especialista em vistorias de lombadas urbanas. 
    Analise esta foto tirada em campo e retorne estritamente um objeto JSON válido (sem blocos de código markdown extras, apenas o JSON) contendo exatamente estes campos:
    - "tipo": classifique entre "Tipo A", "Tipo B" ou "Irregular".
    - "vertical": avalie a sinalização vertical (placas) entre "Bom", "Regular", "Ruim" ou "Inexistente".
    - "horizontal": avalie a sinalização horizontal (pintura no chão) entre "Bom", "Regular", "Ruim" ou "Inexistente".
    - "observacoes": um texto curto descrevendo o estado da lombada e problemas encontrados.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const responseText = result.response.text();
    const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const dados = JSON.parse(cleanJsonText);

    return res.status(200).json(dados);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
