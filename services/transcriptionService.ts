import { GoogleGenAI } from "@google/genai";
import { TranscriptionResponse } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Transcreve um arquivo de áudio utilizando o modelo Gemini.
 */
export const transcribeAudio = async (file: File): Promise<TranscriptionResponse> => {
  try {
    // Converter arquivo para Base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remover o prefixo data URL (ex: "data:audio/mp3;base64,")
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error("Falha ao ler o arquivo."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Chamada à API do Gemini
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
            text: "Você é um especialista em transcrição de áudio. Transcreva o áudio fornecido de forma precisa e completa, mantendo a pontuação e parágrafos coerentes. Responda apenas com o texto da transcrição."
          }
        ]
      }
    });

    const text = response.text;

    if (!text) {
      throw new Error("O modelo não retornou texto.");
    }

    return {
      text: text,
      confidence: 1.0 // A API não retorna confiança global para geração de conteúdo padrão
    };

  } catch (error) {
    console.error("Erro na transcrição:", error);
    throw error;
  }
};