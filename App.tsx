import React, { useState, useCallback } from 'react';
import { Mic, Loader2, Sparkles, Github } from 'lucide-react';
import FileUpload from './components/FileUpload';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import { transcribeAudio } from './services/transcriptionService';
import { TranscriptionStatus } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<TranscriptionStatus>(TranscriptionStatus.IDLE);
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>('');

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    // Use PROCESSING state directly to represent the whole operation (read + transcribe)
    setStatus(TranscriptionStatus.PROCESSING);

    try {
      const response = await transcribeAudio(selectedFile);
      setTranscription(response.text);
      setStatus(TranscriptionStatus.COMPLETED);
    } catch (error) {
      console.error(error);
      setStatus(TranscriptionStatus.ERROR);
    }
  }, []);

  const handleReset = () => {
    setFile(null);
    setTranscription('');
    setStatus(TranscriptionStatus.IDLE);
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
              AudioScribe
            </span>
          </div>
          <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors">
            <Github size={20} />
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start pt-16 pb-12 px-4 sm:px-6">
        
        {/* Header Text */}
        <div className="text-center max-w-2xl mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            Áudio para Texto, <br/>
            <span className="text-blue-600 relative inline-block">
              Simplificado
              <span className="absolute bottom-0 left-0 w-full h-2 bg-red-500/20 -rotate-1 rounded-full"></span>
            </span>.
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            Envie suas gravações e deixe nossa IA cuidar do resto. <br className="hidden sm:block"/>
            Transcrição rápida, precisa e segura.
          </p>
        </div>

        {/* Dynamic Content Area */}
        <div className="w-full">
          {status === TranscriptionStatus.IDLE && (
             <div className="animate-in fade-in zoom-in-95 duration-500">
                <FileUpload onFileSelect={handleFileSelect} status={status} />
             </div>
          )}

          {(status === TranscriptionStatus.UPLOADING || status === TranscriptionStatus.PROCESSING) && (
            <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-white p-6 rounded-full shadow-xl shadow-blue-100 border border-blue-50">
                  <Loader2 size={40} className="text-blue-600 animate-spin" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900">
                Transcrevendo...
              </h3>
              
              <p className="mt-2 text-slate-500 text-center">
                Nossa IA está analisando cada detalhe do seu áudio.
              </p>

              <div className="mt-8 flex items-center gap-2 text-red-600 bg-red-50 px-5 py-2 rounded-full text-sm font-semibold animate-pulse border border-red-100">
                <Sparkles size={16} />
                <span>Processando Inteligente</span>
              </div>
            </div>
          )}

          {status === TranscriptionStatus.COMPLETED && (
            <TranscriptionDisplay 
              transcription={transcription} 
              onReset={handleReset} 
            />
          )}

          {status === TranscriptionStatus.ERROR && (
             <div className="text-center py-12">
               <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-xl inline-block mb-6 font-medium">
                 Ocorreu um erro ao processar seu arquivo.
               </div>
               <button 
                onClick={handleReset}
                className="block mx-auto text-blue-600 font-semibold hover:text-blue-800 hover:underline transition-colors"
               >
                 Tentar Novamente
               </button>
             </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} AudioScribe. Desenvolvido com React & Tailwind.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;