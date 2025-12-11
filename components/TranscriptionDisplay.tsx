import React, { useState } from 'react';
import { Copy, Check, FileText, RefreshCw, PenLine, Sparkles } from 'lucide-react';

interface TranscriptionDisplayProps {
  transcription: string;
  onReset: () => void;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ transcription: initialTranscription, onReset }) => {
  const [text, setText] = useState(initialTranscription);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Sparkles size={18} />
            </div>
            <h2 className="font-bold text-slate-900 text-lg">Resultado da Transcrição</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all border
                ${copied 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-blue-600 hover:shadow-sm'
                }
              `}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado!' : 'Copiar Texto'}
            </button>
          </div>
        </div>

        {/* Content Area - FIXED: Added explicit bg-white and text colors */}
        <div className="relative group">
          <textarea
            value={text}
            onChange={handleTextChange}
            className="w-full h-[400px] p-8 text-slate-800 bg-white leading-loose text-lg resize-y focus:outline-none focus:bg-blue-50/10 transition-colors font-medium"
            placeholder="A transcrição aparecerá aqui..."
            spellCheck={false}
          />
          <div className="absolute bottom-6 right-6 pointer-events-none opacity-10 group-hover:opacity-100 transition-opacity text-blue-600">
             <PenLine size={24} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
           <div className="flex items-center gap-4 text-slate-500 font-medium">
             <span className="flex items-center gap-1.5">
               <FileText size={14} />
               {text.length} caracteres
             </span>
             <span className="w-1 h-1 rounded-full bg-slate-300"></span>
             <span>
               {text.split(/\s+/).filter(w => w.length > 0).length} palavras
             </span>
           </div>
           
           <button
             onClick={onReset}
             className="text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
           >
             <RefreshCw size={16} />
             Transcrever Outro Arquivo
           </button>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionDisplay;