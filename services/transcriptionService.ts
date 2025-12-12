import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionResponse, TranscriptionSegment, ChatMessage, Metadata } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper para limpar formatação Markdown de JSON
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned;
};

// Helper para extrair ID do YouTube de forma robusta
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^#\&\?\/]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^#\&\?\/]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^#\&\?\/]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^#\&\?\/]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^#\&\?\/]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};

/**
 * Transcreve um arquivo de áudio utilizando o modelo Gemini.
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
          { inlineData: { mimeType: file.type, data: base64Data } },
          {
            text: `Você é um estenógrafo profissional.
            Sua tarefa é transcrever EXATAMENTE o que é dito no áudio.
            
            REGRAS DE OURO:
            1. NÃO RESUMA.
            2. NÃO OMITA PALAVRAS.
            3. Use pontuação correta para separar as falas.
            
            Retorne JSON com categorias e segmentos.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { start: { type: Type.NUMBER }, end: { type: Type.NUMBER }, text: { type: Type.STRING } },
                required: ["start", "end", "text"]
              }
            }
          },
          required: ["category", "segments"]
        }
      }
    });

    const rawText = response.text;
    if (!rawText) throw new Error("O modelo não retornou dados.");

    let parsedData: { category: string, segments: TranscriptionSegment[] } = { category: 'Geral', segments: [] };
    try {
      parsedData = JSON.parse(rawText);
    } catch (e) {
      console.error("Erro parse JSON:", e);
      parsedData = { category: 'Geral', segments: [{ start: 0, end: 0, text: rawText }] };
    }

    const segments = parsedData.segments || [];
    const fullText = segments.map(seg => seg.text).join(' ');

    const metadata = await generateMetadata(fullText);

    return {
      text: fullText,
      category: parsedData.category,
      metadata: metadata,
      segments: segments,
      confidence: 1.0
    };

  } catch (error) {
    console.error("Erro na transcrição:", error);
    throw error;
  }
};

/**
 * PASSO 1: Busca o conteúdo FOCADO NO TEXTO FALADO (VERBATIM).
 */
const searchYouTubeContent = async (url: string): Promise<string> => {
  const videoId = extractYouTubeId(url);
  const identifier = videoId ? `ID DO VÍDEO: ${videoId}` : `URL: ${url}`;
  
  // Query otimizada para achar o texto da legenda indexada
  // Incluímos 'transcript' e o ID para tentar pegar a página do vídeo ou sites de legenda
  const searchPrompt = videoId 
    ? `site:youtube.com "${videoId}" (transcript OR subtitles OR "full text" OR legendas)`
    : `${url} transcript`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [{
        text: `IDENTIFICADOR: ${identifier}
        QUERY: ${searchPrompt}

        MISSÃO CRÍTICA: Extrair o ROTEIRO FALADO (Transcrição Literal) deste vídeo.

        INSTRUÇÕES ESTRITAS (MODO ESTENÓGRAFO):
        1. EXTRAIA APENAS O QUE FOI FALADO PELAS PESSOAS NO VÍDEO.
        2. PROIBIDO RESUMIR. PROIBIDO USAR TERCEIRA PESSOA (ex: "O vídeo fala sobre...").
        3. O texto deve estar em PRIMEIRA PESSOA (ex: "Olá pessoal, hoje eu vou mostrar...").
        4. Copie o texto das legendas (CC) ou a transcrição completa disponível na página.
        5. Se o vídeo for em outro idioma, TRADUZA o diálogo LITERALMENTE para Português, mantendo o estilo de fala.

        SE NÃO ENCONTRAR O TEXTO EXATO:
        - Tente reconstruir o diálogo baseado nas citações mais longas encontradas.
        - Se realmente impossível, retorne um erro claro, mas esforce-se para pegar o texto falado.

        SAÍDA DESEJADA:
        Título do Vídeo
        [Bloco de texto contendo todas as falas do vídeo, do início ao fim]`
      }]
    },
    config: {
      tools: [{ googleSearch: {} }],
    }
  });

  if (!response.text) throw new Error("A IA não retornou texto na busca.");
  return response.text;
};

/**
 * PASSO 2: Formatação para JSON.
 * Reforça a regra de não resumir.
 */
const formatContentToJson = async (rawText: string): Promise<any> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [{
        text: `Converta o texto bruto abaixo para JSON estruturado de Transcrição.
        
        TEXTO BRUTO ENCONTRADO:
        ${rawText}
        
        REGRAS ABSOLUTAS DE FORMATAÇÃO:
        1. O campo "text" deve ser a FALA DIRETA (Primeira Pessoa).
        2. SE O TEXTO BRUTO FOR UM RESUMO (ex: "O autor explica..."), TRANSFORME-O EM TÓPICOS DETALHADOS ou tente reescrever como se fosse o apresentador falando, mas PREFIRA SEMPRE AS CITAÇÕES DIRETAS.
        3. NÃO ENCURTE O TEXTO. O usuário quer ler tudo o que foi dito.
        4. O campo "title" deve ser o título do vídeo.
        5. O campo "description" pode ser um resumo curto.
        
        ESTRUTURA JSON:
        {
          "title": "Título do Vídeo",
          "description": "Resumo curto do tema",
          "segments": [
             { "start": 0, "end": 10, "text": "Fala inicial..." },
             ...
          ]
        }
        
        IMPORTANTE: Se o input for muito curto ou parecer erro, retorne json "error": "content_missing".
        `
      }]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          error: { type: Type.STRING },
          segments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { start: { type: Type.NUMBER }, end: { type: Type.NUMBER }, text: { type: Type.STRING } },
              required: ["start", "end", "text"]
            }
          }
        },
        required: ["title", "description", "segments"]
      }
    }
  });

  return JSON.parse(cleanJson(response.text || "{}"));
};

/**
 * Orquestrador principal.
 */
export const transcribeUrl = async (url: string): Promise<TranscriptionResponse> => {
  const maxRetries = 2; // Aumentado para dar mais chance
  let attempts = 0;
  let lastError = null;
  
  while (attempts < maxRetries) {
    try {
      attempts++;
      console.log(`Tentativa ${attempts} de processar URL: ${url}`);

      // 1. Busca
      const rawSearchResult = await searchYouTubeContent(url);
      
      // 2. Formatação
      const data = await formatContentToJson(rawSearchResult);

      // Verificações de falha
      if (data.error === "content_missing" || !data.segments || data.segments.length === 0) {
         throw new Error("Conteúdo insuficiente encontrado.");
      }

      // Sucesso
      const segments: TranscriptionSegment[] = data.segments;
      const fullText = segments.map((s: any) => s.text).join(' ');

      // Verificação extra de "Alucinação de Resumo"
      // Se o texto for muito curto (< 100 chars) para um vídeo, provavelmente falhou.
      if (fullText.length < 50) {
         throw new Error("Texto recuperado muito curto.");
      }

      return {
        text: fullText,
        category: "YouTube",
        metadata: {
          title: data.title || "Vídeo do YouTube",
          description: data.description || "Transcrição importada."
        },
        segments: segments,
        confidence: 0.90
      };

    } catch (error: any) {
      console.warn(`Erro tentativa ${attempts}:`, error);
      lastError = error;
      
      // Backoff simples antes de tentar de novo
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }
  }
  
  // Se falhar todas, lança erro amigável
  throw new Error("Não foi possível extrair a transcrição exata deste vídeo. Verifique se ele possui legendas públicas ou tente outro link.");
};

// --- FUNÇÕES AUXILIARES MANTIDAS IGUAIS AO ORIGINAL ---

export const generateMetadata = async (text: string): Promise<Metadata> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: `Gere título e descrição para: ${text.substring(0, 5000)}...` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { title: { type: Type.STRING }, description: { type: Type.STRING } },
          required: ["title", "description"]
        }
      }
    });
    const json = JSON.parse(response.text || "{}");
    return { title: json.title || "Transcrição", description: json.description || "" };
  } catch {
    return { title: "Áudio Processado", description: "Conteúdo transcrito." };
  }
};

export const refineText = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: `Melhore este texto para torná-lo profissional (apenas corrija gramática e pontuação, mantenha o conteúdo):\n${text}` }] }
    });
    return response.text || text;
  } catch { return text; }
};

export const sendChatMessage = async (history: ChatMessage[], context: string, question: string): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: `Você é um assistente útil. Responda APENAS com base no seguinte texto:\n${context}` }
    });
    const result = await chat.sendMessage({ message: question });
    return result.text || "Erro no chat.";
  } catch { return "Erro no chat."; }
};

export const generateSummary = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: `Resuma em tópicos principais: ${text}` }] }
  });
  return response.text || "";
};

export const translateText = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: `Traduza para Inglês: ${text}` }] }
  });
  return response.text || "";
};
