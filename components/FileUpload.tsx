import React, { useCallback, useState } from 'react';
import { UploadCloud, Music, AlertCircle, FileAudio } from 'lucide-react';
import { TranscriptionStatus } from '../types';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  status: TranscriptionStatus;
}

const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4'];
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a'];

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, status }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidExt = ALLOWED_EXTENSIONS.includes(extension);
    const isValidType = ALLOWED_TYPES.includes(file.type) || isValidExt;

    if (!isValidType && !isValidExt) {
      setError(`Formato de arquivo não suportado. Por favor, envie MP3, WAV ou M4A.`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const isProcessing = status === TranscriptionStatus.UPLOADING || status === TranscriptionStatus.PROCESSING;

  return (
    <div className="w-full max-w-xl mx-auto">
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
          aria-label="Enviar arquivo de áudio"
        />

        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className={`p-5 rounded-full mb-6 transition-all duration-300 shadow-sm
            ${dragActive 
              ? 'bg-blue-600 text-white scale-110' 
              : 'bg-white text-blue-600 shadow-md group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white'
            }`}>
            <UploadCloud size={32} strokeWidth={2.5} />
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {dragActive ? 'Solte seu arquivo aqui' : 'Clique ou arraste e solte'}
          </h3>
          
          <p className="text-slate-500 mb-8 max-w-[260px] mx-auto leading-relaxed">
            Formatos suportados: <span className="font-semibold text-slate-700">MP3, WAV, M4A</span>
          </p>

          <div className="flex items-center gap-3 text-xs font-semibold text-red-600 bg-red-50 px-4 py-2 rounded-full border border-red-100">
            <AlertCircle size={14} />
            <span>Limite de 25MB (IA)</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-3 text-sm font-medium text-white bg-red-500 p-4 rounded-xl shadow-lg shadow-red-500/20 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={18} className="text-white/90" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;