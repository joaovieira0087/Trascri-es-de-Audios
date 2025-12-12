import React, { useState, useCallback, useEffect } from 'react';
import { Mic, Loader2, Sparkles, Github, Clock, AlertTriangle } from 'lucide-react';
import FileUpload from './components/FileUpload';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import { transcribeAudio, transcribeUrl } from './services/transcriptionService';
import { TranscriptionStatus, TranscriptionResponse } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<TranscriptionStatus>(TranscriptionStatus.IDLE);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TranscriptionResponse | null>(null);
  
  // Progress & Time Estimation States
  const [progress, setProgress] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Error Message State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Progress Bar Logic
  useEffect(() => {
    if (status !== TranscriptionStatus.PROCESSING) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds(prev => Math.max(0, prev - 1));
      setProgress(prev => {
        if (prev >= 95) return prev; // Stall at 95% until done
        const increment = 100 / estimatedSeconds;
        return Math.min(95, prev + increment);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, estimatedSeconds]);

  // Handle standard File Upload
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setStatus(TranscriptionStatus.PROCESSING);
    setErrorMessage(null);
    
    // Estimate Time: 3s per MB, min 15s
    const sizeMB = selectedFile.size / (1024 * 1024);
    const est = Math.max(15, Math.ceil(sizeMB * 3));
    setEstimatedSeconds(est);
    setRemainingSeconds(est);

    try {
      const response = await transcribeAudio(selectedFile);
      setResult(response);
      setStatus(TranscriptionStatus.COMPLETED);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Ocorreu um erro inesperado ao processar o arquivo.");
      setStatus(TranscriptionStatus.ERROR);
    }
  }, []);

  // Handle URL Link
  const handleUrlSelect = useCallback(async (url: string) => {
    setFile(null); // No physical file
    setStatus(TranscriptionStatus.PROCESSING);
    setErrorMessage(null);
    
    // Fixed estimation for URL (simulated)
    const est = 20; 
    setEstimatedSeconds(est);
    setRemainingSeconds(est);

    try {
      const response = await transcribeUrl(url);
      setResult(response);
      setStatus(TranscriptionStatus.COMPLETED);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Falha ao buscar o vídeo. Verifique o link ou tente novamente.");
      setStatus(TranscriptionStatus.ERROR);
    }
  }, []);

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setStatus(TranscriptionStatus.IDLE);
    setErrorMessage(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Mic size={20} />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-red-600">
              ClariaAI
            </span>
          </div>
          <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors">
            <Github size={20} />
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start pt-10 pb-12 px-4 sm:px-6">
        
        {/* Header Text (Show only if no result yet) */}
        {!result && status !== TranscriptionStatus.PROCESSING && (
          <div className="text-center max-w-3xl mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
              ClariaAI: <br className="sm:hidden" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                Transcrição, Resumo
              </span> 
              <br />
              <span className="relative inline-block text-slate-900 mt-2">
                e Análise de Áudio.
                <span className="absolute bottom-1 left-0 w-full h-3 bg-red-500/10 -rotate-1 rounded-full -z-10"></span>
              </span>
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
              Transforme suas gravações em insights claros com nossa IA avançada. <br className="hidden sm:block"/>
              Rápido, preciso e seguro diretamente no seu navegador.
            </p>
          </div>
        )}

        {/* Dynamic Content Area */}
        <div className="w-full">
          {status === TranscriptionStatus.IDLE && (
             <div className="animate-in fade-in zoom-in-95 duration-500">
                <FileUpload onFileSelect={handleFileSelect} onUrlSelect={handleUrlSelect} status={status} />
             </div>
          )}

          {(status === TranscriptionStatus.UPLOADING || status === TranscriptionStatus.PROCESSING) && (
            <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500 max-w-lg mx-auto">
              <div className="w-full bg-slate-100 rounded-full h-4 mb-6 overflow-hidden relative">
                 <div 
                   className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-linear rounded-full"
                   style={{ width: `${progress}%` }}
                 ></div>
                 <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
              </div>
              
              <div className="text-center space-y-3">
                 <div className="flex items-center justify-center gap-2 text-blue-700 font-semibold text-lg">
                    <Loader2 size={24} className="animate-spin" />
                    <span>Processando Áudio...</span>
                 </div>
                 
                 <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-medium bg-slate-50 py-1.5 px-4 rounded-full border border-slate-200">
                    <Clock size={14} />
                    <span>Conclusão estimada em ~{remainingSeconds} segundos</span>
                 </div>

                 <p className="text-slate-400 text-xs mt-4">
                   Estamos transcrevendo, resumindo e gerando metadados inteligentes.
                 </p>
              </div>
            </div>
          )}

          {status === TranscriptionStatus.COMPLETED && result && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <TranscriptionDisplay 
                transcription={result.text}
                segments={result.segments}
                audioFile={file} // Can be null if URL was used
                onReset={handleReset}
                category={result.category}
                metadata={result.metadata}
              />
            </div>
          )}

          {status === TranscriptionStatus.ERROR && (
             <div className="text-center py-12 animate-in fade-in">
               <div className="bg-red-50 border border-red-100 text-red-700 px-8 py-6 rounded-2xl inline-flex flex-col items-center mb-6 shadow-sm max-w-md">
                 <AlertTriangle size={32} className="mb-3 text-red-500" />
                 <h3 className="font-bold text-lg mb-1">Erro no Processamento</h3>
                 <p className="text-sm text-center opacity-90">{errorMessage || "Ocorreu um erro desconhecido."}</p>
               </div>
               <button onClick={handleReset} className="block mx-auto text-blue-600 font-semibold hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-6 py-2 rounded-full">
                 Tentar Novamente
               </button>
             </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} ClariaAI. Desenvolvido com React & Tailwind.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;