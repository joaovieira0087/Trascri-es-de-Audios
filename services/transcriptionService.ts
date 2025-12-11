import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResponse, TranscriptionSegment } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Transcreve um arquivo de áudio utilizando o modelo Gemini.
 * Solicita retorno em JSON estruturado com timestamps para sincronização.
 */
export const transcribeAudio = async (file: File): Promise<TranscriptionResponse> => {
  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error("Falha ao ler o arquivo."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          },
          {
            text: `Você é um especialista em transcrição de áudio.
            Sua tarefa é transcrever o áudio fornecido e segmentá-lo por frases ou pausas naturais.
            
            REGRAS OBRIGATÓRIAS:
            1. Retorne APENAS um JSON array.
            2. Cada objeto do array deve ter: "start" (número, segundos), "end" (número, segundos) e "text" (string).
            3. Se houver múltiplos falantes, inclua a identificação (ex: "Participante A:") dentro do campo "text".
            4. Certifique-se de que o texto esteja pontuado corretamente.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER },
              text: { type: Type.STRING }
            },
            required: ["start", "end", "text"]
          }
        }
      }
    });

    // O SDK já tenta parsear o JSON se o responseMimeType for application/json,
    // mas acessamos .text para garantir e fazemos o parse manual para tipagem segura.
    const rawText = response.text;
    
    if (!rawText) {
      throw new Error("O modelo não retornou dados.");
    }

    let segments: TranscriptionSegment[] = [];
    try {
      segments = JSON.parse(rawText);
    } catch (e) {
      console.error("Erro ao fazer parse do JSON:", e);
      // Fallback simples se o JSON falhar
      segments = [{ start: 0, end: 0, text: rawText }];
    }

    // Reconstrói o texto completo a partir dos segmentos para uso nas outras abas
    const fullText = segments.map(seg => seg.text).join(' ');

    return {
      text: fullText,
      segments: segments,
      confidence: 1.0
    };

  } catch (error) {
    console.error("Erro na transcrição:", error);
    throw error;
  }
};

/**
 * Gera um resumo em tópicos do texto transcrito.
 */
export const generateSummary = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{
          text: `Crie um resumo executivo do seguinte texto. 
          O resumo deve ser em Português e conter entre 3 a 5 tópicos principais (bullet points).
          Seja conciso e direto.
          
          Texto Original:
          ${text}`
        }]
      }
    });
    return response.text || "Não foi possível gerar o resumo.";
  } catch (error) {
    console.error("Erro ao gerar resumo:", error);
    throw error;
  }
};

/**
 * Traduz o texto transcrito para Inglês.
 */
export const translateText = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{
          text: `Traduza o seguinte texto integralmente para o Inglês. Mantenha a formatação original.
          
          Texto em Português:
          ${text}`
        }]
      }
    });
    return response.text || "Não foi possível traduzir o texto.";
  } catch (error) {
    console.error("Erro ao traduzir:", error);
    throw error;
  }
};