import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, FileText, RefreshCw, PenLine, Sparkles, Languages, ListChecks, Loader2, PlayCircle, Gauge, Play, Pause } from 'lucide-react';
import { generateSummary, translateText } from '../services/transcriptionService';
import { TranscriptionSegment } from '../types';

interface TranscriptionDisplayProps {
  transcription: string;
  segments: TranscriptionSegment[];
  audioFile: File;
  onReset: () => void;
}

type TabType = 'transcription' | 'summary' | 'translation' | 'synced';

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ 
  transcription: initialTranscription, 
  segments,
  audioFile,
  onReset 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('transcription');
  
  // Data States
  const [transcriptionText, setTranscriptionText] = useState(initialTranscription);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [translationText, setTranslationText] = useState<string | null>(null);
  
  // UI States
  const [copied, setCopied] = useState(false);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);

  // Audio Player States
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1); // Explicitly number 1
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Initialize Audio URL
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  // Handle Playback Rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);

    if (tab === 'synced') {
        // Just ensures audio is ready if switching to synced tab
        if(audioRef.current && isPlaying) {
            // keep playing
        }
    } else {
        // Optional: Pause audio when leaving synced tab? 
        // For now, let's keep it playing as a user might want to read summary while listening.
    }

    // Lazy load summary
    if (tab === 'summary' && !summaryText) {
      setIsLoadingExtra(true);
      try {
        const result = await generateSummary(transcriptionText);
        setSummaryText(result);
      } catch (error) {
        setSummaryText("Erro ao gerar resumo. Tente novamente.");
      } finally {
        setIsLoadingExtra(false);
      }
    }

    // Lazy load translation
    if (tab === 'translation' && !translationText) {
      setIsLoadingExtra(true);
      try {
        const result = await translateText(transcriptionText);
        setTranslationText(result);
      } catch (error) {
        setTranslationText("Erro ao traduzir texto.");
      } finally {
        setIsLoadingExtra(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
          audioRef.current.play();
          setIsPlaying(true);
      }
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getCurrentText = () => {
    switch (activeTab) {
      case 'summary': return summaryText || '';
      case 'translation': return translationText || '';
      case 'synced': return ''; // Synced view has its own renderer
      default: return transcriptionText;
    }
  };

  const handleCopy = async () => {
    try {
      // If synced tab is active, copy the original text
      const textToCopy = activeTab === 'synced' ? transcriptionText : getCurrentText();
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeTab === 'transcription') {
      setTranscriptionText(e.target.value);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-[700px]">
        
        {/* Header & Tabs */}
        <div className="border-b border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-4">
             {/* Tab Navigation */}
             <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl">
               <button
                 onClick={() => handleTabChange('transcription')}
                 className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all
                   ${activeTab === 'transcription' 
                     ? 'bg-white text-blue-600 shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                   }`}
               >
                 <FileText size={16} />
                 Transcrição
               </button>
               <button
                 onClick={() => handleTabChange('summary')}
                 className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all
                   ${activeTab === 'summary' 
                     ? 'bg-white text-blue-600 shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                   }`}
               >
                 <ListChecks size={16} />
                 Resumo
               </button>
               <button
                 onClick={() => handleTabChange('translation')}
                 className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all
                   ${activeTab === 'translation' 
                     ? 'bg-white text-blue-600 shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                   }`}
               >
                 <Languages size={16} />
                 Inglês (EN)
               </button>
               <button
                 onClick={() => handleTabChange('synced')}
                 className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all
                   ${activeTab === 'synced' 
                     ? 'bg-white text-blue-600 shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                   }`}
               >
                 <PlayCircle size={16} />
                 Acompanhar
               </button>
             </div>

             {/* Copy Button */}
             <button
              onClick={handleCopy}
              disabled={isLoadingExtra}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all border shrink-0
                ${copied 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-blue-600 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
                }
              `}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado!' : 'Copiar Texto'}
            </button>
          </div>
        </div>

        {/* Synced Audio Player Controls (Only visible in synced tab) */}
        {activeTab === 'synced' && (
           <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                <button 
                  onClick={togglePlayPause}
                  className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </button>
                <div className="text-sm font-medium text-slate-600 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
             </div>

             <div className="flex items-center gap-2">
               <Gauge size={16} className="text-slate-400" />
               <select 
                 value={playbackRate.toString()} 
                 onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                 className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
               >
                 <option value="0.5">0.5x</option>
                 <option value="0.75">0.75x</option>
                 {/* FIXED: Value changed from "1.0" to "1" to match Number(1).toString() */}
                 <option value="1">1.0x (Normal)</option>
                 <option value="1.5">1.5x</option>
                 <option value="2.0">2.0x</option>
               </select>
             </div>
           </div>
        )}

        {/* Hidden Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />
        )}

        {/* Content Area */}
        <div className="relative flex-grow group bg-white overflow-y-auto">
          {isLoadingExtra ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 h-full">
               <Loader2 size={32} className="text-blue-600 animate-spin mb-3" />
               <p className="text-slate-500 font-medium">
                 {activeTab === 'summary' ? 'Gerando resumo inteligente...' : 'Traduzindo conteúdo...'}
               </p>
            </div>
          ) : (
             <>
               {activeTab === 'synced' ? (
                 <div className="p-8 space-y-4">
                   {segments.length > 0 ? (
                     segments.map((segment, index) => {
                       // Determine if this segment is currently active based on timestamp
                       const isActive = currentTime >= segment.start && currentTime <= segment.end;
                       return (
                         <div 
                           key={index}
                           onClick={() => handleSeek(segment.start)}
                           className={`p-3 rounded-lg transition-all cursor-pointer border border-transparent
                             ${isActive 
                               ? 'bg-blue-50 border-blue-100 shadow-sm scale-[1.01]' 
                               : 'hover:bg-slate-50 hover:border-slate-100'
                             }
                           `}
                         >
                           <p className={`text-lg leading-relaxed transition-colors
                             ${isActive ? 'text-blue-900 font-semibold' : 'text-slate-600'}
                           `}>
                             {segment.text}
                           </p>
                           {isActive && (
                             <span className="text-xs text-blue-400 font-mono mt-1 block">
                               {formatTime(segment.start)}
                             </span>
                           )}
                         </div>
                       );
                     })
                   ) : (
                     <div className="text-center text-slate-400 py-10">
                       A sincronização não está disponível para este áudio.
                     </div>
                   )}
                   {/* Spacer for bottom scrolling */}
                   <div className="h-20"></div> 
                 </div>
               ) : (
                 <textarea
                  value={getCurrentText()}
                  onChange={handleTextChange}
                  readOnly={activeTab !== 'transcription'} 
                  className="w-full h-full p-8 text-slate-800 bg-white leading-loose text-lg resize-none focus:outline-none focus:bg-blue-50/10 transition-colors font-medium"
                  placeholder={activeTab === 'transcription' ? "A transcrição aparecerá aqui..." : "Gerando..."}
                  spellCheck={false}
                />
               )}
             </>
          )}
          
          {activeTab === 'transcription' && !isLoadingExtra && (
            <div className="absolute bottom-6 right-6 pointer-events-none opacity-10 group-hover:opacity-100 transition-opacity text-blue-600">
               <PenLine size={24} />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm shrink-0">
           <div className="flex items-center gap-4 text-slate-500 font-medium">
             <span className="flex items-center gap-1.5">
               <FileText size={14} />
               {activeTab === 'synced' ? transcriptionText.length : getCurrentText().length} caracteres
             </span>
             {activeTab === 'transcription' && (
               <>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>
                  {getCurrentText().split(/\s+/).filter(w => w.length > 0).length} palavras
                </span>
               </>
             )}
           </div>
           
           <button
             onClick={onReset}
             className="text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
           >
             <RefreshCw size={16} />
             Nova Transcrição
           </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to format seconds into MM:SS
const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default TranscriptionDisplay;