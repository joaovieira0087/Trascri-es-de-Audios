import React, { useCallback, useState } from 'react';
import { UploadCloud, AlertCircle, Link as LinkIcon, ArrowRight, Youtube } from 'lucide-react';
import { TranscriptionStatus } from '../types';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onUrlSelect: (url: string) => void;
  status: TranscriptionStatus;
}

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a'];

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onUrlSelect, status }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');

  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidExt = ALLOWED_EXTENSIONS.includes(extension);

    if (!isValidExt && file.type.indexOf('audio/') !== 0) {
      setError(`Formato não suportado. Use MP3, WAV ou M4A.`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) onFileSelect(file);
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    // Regex robusta para capturar ID de vários formatos (padrão, short, embed, youtu.be)
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^#\&\?\/]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^#\&\?\/]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^#\&\?\/]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^#\&\?\/]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^#\&\?\/]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlInput.trim();
    
    const videoId = extractYouTubeId(url);
    
    if (!videoId) {
      setError("Link Inválido. Por favor, cole um URL válido do YouTube (ex: youtube.com/watch?v=ID ou youtu.be/ID).");
      return;
    }

    setError(null);
    // Envia a URL limpa ou o ID, dependendo da preferência. Aqui enviamos a URL original para o serviço processar se necessário,
    // mas o serviço de transcrição usará o contexto de busca.
    onUrlSelect(url);
  };

  const isProcessing = status === TranscriptionStatus.UPLOADING || status === TranscriptionStatus.PROCESSING;

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Drag & Drop Area */}
      <div
        className={`relative group rounded-2xl border-2 transition-all duration-300 ease-in-out overflow-hidden
          ${dragActive 
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01] shadow-lg shadow-blue-500/10' 
            : 'border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-white'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
          onChange={handleChange}
          accept=".mp3,.wav,.m4a"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
          <div className={`p-4 rounded-full mb-4 transition-all duration-300 shadow-sm
            ${dragActive 
              ? 'bg-blue-600 text-white scale-110' 
              : 'bg-white text-blue-600 shadow-md group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white'
            }`}>
            <UploadCloud size={28} strokeWidth={2.5} />
          </div>
          
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {dragActive ? 'Solte o arquivo' : 'Upload de Arquivo'}
          </h3>
          <p className="text-sm text-slate-500 mb-4">MP3, WAV, M4A (Max 25MB)</p>
        </div>
      </div>

      {/* URL Input Area */}
      <div className={`bg-white p-1 rounded-xl border border-slate-200 shadow-sm ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
        <form onSubmit={handleUrlSubmit} className="flex items-center gap-2">
           <div className="pl-3 text-red-500">
             <Youtube size={20} />
           </div>
           <input 
             type="url"
             placeholder="Cole o link do YouTube..."
             className="flex-grow py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none bg-transparent"
             value={urlInput}
             onChange={(e) => setUrlInput(e.target.value)}
             disabled={isProcessing}
           />
           <button 
             type="submit"
             disabled={!urlInput || isProcessing}
             className="bg-slate-900 text-white p-2.5 rounded-lg hover:bg-blue-600 disabled:bg-slate-200 disabled:cursor-not-allowed transition-colors"
           >
             <ArrowRight size={18} />
           </button>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-3 text-sm font-medium text-white bg-red-500 p-4 rounded-xl shadow-lg animate-in fade-in">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;