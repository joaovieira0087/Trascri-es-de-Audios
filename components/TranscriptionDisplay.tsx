import React, { useState, useRef, useEffect } from 'react';
import { 
  Copy, Check, FileText, RefreshCw, PenLine, Sparkles, Languages, ListChecks, Loader2, 
  PlayCircle, Gauge, Play, Pause, Search, Download, ChevronDown, ChevronUp, Flag, Tag, X,
  MessageSquare, Send, Bot, User, Info
} from 'lucide-react';
import { generateSummary, translateText, refineText, sendChatMessage } from '../services/transcriptionService';
import { TranscriptionSegment, ChatMessage, Metadata } from '../types';

interface TranscriptionDisplayProps {
  transcription: string;
  segments: TranscriptionSegment[];
  audioFile: File | null;
  onReset: () => void;
  category?: string;
  metadata?: Metadata;
}

type TabType = 'transcription' | 'summary' | 'translation' | 'synced' | 'chat';
type ExportFormat = 'txt' | 'json' | 'srt';

interface Note {
  timestamp: number;
  text: string;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ 
  transcription: initialTranscription, 
  segments,
  audioFile,
  onReset,
  category = "Geral",
  metadata
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('synced');
  
  // Data States
  const [transcriptionText, setTranscriptionText] = useState(initialTranscription);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [translationText, setTranslationText] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  
  // UI States
  const [copied, setCopied] = useState(false);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  // Chat States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Refine States
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refinedText, setRefinedText] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);

  // Audio Player States
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Search Logic
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }
    const results = segments
      .map((seg, index) => seg.text.toLowerCase().includes(searchTerm.toLowerCase()) ? index : -1)
      .filter(index => index !== -1);
    setSearchResults(results);
    setCurrentResultIndex(0);
  }, [searchTerm, segments]);

  useEffect(() => {
    if (searchResults.length > 0 && activeTab === 'synced') {
      const targetIndex = searchResults[currentResultIndex];
      const element = document.getElementById(`segment-${targetIndex}`);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchResults, currentResultIndex, activeTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
  };

  const handlePrevResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(prevIndex);
  };

  const handleSearchFocus = () => {
    if (activeTab === 'summary' || activeTab === 'translation' || activeTab === 'transcription' || activeTab === 'chat') {
      setActiveTab('synced');
    }
  };

  // Chat Logic
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const responseText = await sendChatMessage(chatHistory, transcriptionText, userMsg.text);
      setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Erro ao processar mensagem." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Refine Logic
  const handleRefine = async () => {
    setShowRefineModal(true);
    if (!refinedText) {
      setIsRefining(true);
      try {
        const text = await refineText(transcriptionText);
        setRefinedText(text);
      } catch (error) { setRefinedText("Erro ao refinar texto."); }
      finally { setIsRefining(false); }
    }
  };

  const addNote = () => {
    setNotes(prev => [...prev, { timestamp: currentTime, text: '' }]);
  };

  const updateNote = (index: number, text: string) => {
    const newNotes = [...notes];
    newNotes[index].text = text;
    setNotes(newNotes);
  };

  const removeNote = (index: number) => {
    setNotes(prev => prev.filter((_, i) => i !== index));
  };

  const handleTabChange = async (tab: TabType) => {
    if (isLoadingExtra || isChatLoading) return;
    setActiveTab(tab);
    if (tab === 'summary' && !summaryText) {
      setIsLoadingExtra(true);
      try {
        const result = await generateSummary(transcriptionText);
        setSummaryText(result);
      } catch (error) { setSummaryText("Erro resumo."); } 
      finally { setIsLoadingExtra(false); }
    }
    if (tab === 'translation' && !translationText) {
      setIsLoadingExtra(true);
      try {
        const result = await translateText(transcriptionText);
        setTranslationText(result);
      } catch (error) { setTranslationText("Erro tradução."); } 
      finally { setIsLoadingExtra(false); }
    }
  };

  const handleTimeUpdate = () => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); };
  const handleLoadedMetadata = () => { if (audioRef.current) setDuration(audioRef.current.duration); };
  
  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) { audioRef.current.play(); setIsPlaying(true); }
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const getCurrentText = () => {
    switch (activeTab) {
      case 'summary': return summaryText || '';
      case 'translation': return translationText || '';
      case 'synced': return transcriptionText;
      case 'chat': return '';
      default: return transcriptionText;
    }
  };

  const handleCopy = async (textToCopy?: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy || getCurrentText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error(err); }
  };

  const handleExport = (format: ExportFormat | 'pdf') => {
    setShowExportMenu(false);
    if (format === 'pdf') { window.print(); return; }

    let content = '', mime = 'text/plain', ext = 'txt';
    if (format === 'json') {
      content = JSON.stringify({ metadata, category, segments, text: transcriptionText, notes }, null, 2);
      mime = 'application/json'; ext = 'json';
    } else if (format === 'srt') {
      ext = 'srt';
      content = segments.map((s, i) => `${i+1}\n${formatSRTTime(s.start)} --> ${formatSRTTime(s.end)}\n${s.text}\n`).join('\n');
    } else { content = transcriptionText; }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `claria_ai_${ext}.${ext}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const getBadgeColor = () => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('reunião')) return 'bg-blue-100 text-blue-700';
    if (cat.includes('entrevista')) return 'bg-purple-100 text-purple-700';
    if (cat.includes('ideias')) return 'bg-yellow-100 text-yellow-700';
    return 'bg-slate-100 text-slate-700';
  };

  const renderHighlightedText = (text: string) => {
    if (!searchTerm) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark> 
        : part
    );
  };

  const getTabButtonClass = (tabName: TabType) => {
    const base = "flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all";
    const active = "bg-white text-blue-600 shadow-sm";
    const inactive = "text-slate-500 hover:text-slate-700 hover:bg-slate-100";
    const disabled = "opacity-50 cursor-not-allowed";
    return `${base} ${activeTab === tabName ? active : inactive} ${isLoadingExtra || isChatLoading ? disabled : ''}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Refine Modal */}
      {showRefineModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Sparkles className="text-purple-500" /> Refinamento Profissional
              </h3>
              <button onClick={() => setShowRefineModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20}/></button>
            </div>
            <div className="flex-grow p-6 overflow-y-auto bg-slate-50/50">
              {isRefining ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Loader2 size={32} className="animate-spin mb-2 text-purple-500"/>
                  <p>A IA está analisando e polindo o texto...</p>
                </div>
              ) : (
                <div className="prose max-w-none text-lg leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {refinedText}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowRefineModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Fechar</button>
              <button onClick={() => handleCopy(refinedText || "")} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2">
                <Copy size={16}/> Copiar Roteiro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT COLUMN */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-[750px] relative">
          
          <div className="border-b border-slate-100 bg-white no-print">
            <div className="flex flex-col gap-4 px-6 py-4">
               {/* Metadata & Search Row */}
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div className="flex items-center gap-3 overflow-hidden">
                       <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide ${getBadgeColor()}`}>
                          <Tag size={12} /> {category}
                       </span>
                       <h2 className="text-lg font-bold text-slate-800 truncate" title={metadata?.title}>{metadata?.title}</h2>
                   </div>
                   
                   <div className="relative group w-full sm:w-64">
                       <input 
                          type="text" 
                          placeholder="Pesquisar..." 
                          value={searchTerm} 
                          onChange={(e) => setSearchTerm(e.target.value)} 
                          onFocus={handleSearchFocus}
                          className="w-full pl-9 pr-4 py-1.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 placeholder:text-slate-400" 
                       />
                       <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                   </div>
               </div>

               {/* Tabs Row */}
               <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                 <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl w-full sm:w-auto">
                   <button onClick={() => handleTabChange('synced')} disabled={isLoadingExtra} className={getTabButtonClass('synced')}><PlayCircle size={16} /> Acompanhar</button>
                   <button onClick={() => handleTabChange('transcription')} disabled={isLoadingExtra} className={getTabButtonClass('transcription')}><FileText size={16} /> Texto</button>
                   <button onClick={() => handleTabChange('summary')} disabled={isLoadingExtra} className={getTabButtonClass('summary')}><ListChecks size={16} /> Resumo</button>
                   <button onClick={() => handleTabChange('chat')} disabled={isLoadingExtra} className={getTabButtonClass('chat')}><MessageSquare size={16} /> Chat IA</button>
                 </div>

                 <div className="flex items-center gap-2">
                   <div className="relative">
                      <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-blue-200 hover:text-blue-600 transition-all">
                        <Download size={16} /> Exportar
                      </button>
                      {showExportMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                          <button onClick={() => handleExport('txt')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Texto (.txt)</button>
                          <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">JSON (.json)</button>
                          <button onClick={() => handleExport('srt')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Legendas (.srt)</button>
                          <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 font-medium">Imprimir / PDF</button>
                        </div>
                      )}
                      {showExportMenu && <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>}
                   </div>
                   <button onClick={() => handleCopy()} disabled={isLoadingExtra} className="p-2 rounded-lg border bg-white hover:border-blue-200 hover:text-blue-600 transition-all">
                     {copied ? <Check size={16} /> : <Copy size={16} />}
                   </button>
                 </div>
               </div>
            </div>
          </div>

          {/* Player (Synced Only) */}
          {activeTab === 'synced' && audioFile && (
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 no-print">
               <div className="flex items-center gap-3">
                  <button onClick={togglePlayPause} className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm">
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <div className="text-sm font-medium text-slate-600 font-mono">{formatTime(currentTime)} / {formatTime(duration)}</div>
               </div>
               <div className="flex items-center gap-2">
                 <Gauge size={16} className="text-slate-400" />
                 <select value={playbackRate} onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} className="bg-white border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1.5">
                   <option value="0.5">0.5x</option><option value="1">1.0x</option><option value="1.5">1.5x</option><option value="2.0">2.0x</option>
                 </select>
               </div>
             </div>
          )}
          {audioUrl && <audio ref={audioRef} src={audioUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} className="hidden" />}

          {/* Main Content Area */}
          <div id="printable-content" className="relative flex-grow group bg-white overflow-y-auto">
            {isLoadingExtra ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10"><Loader2 size={32} className="text-blue-600 animate-spin mb-3" /><p>Processando...</p></div>
            ) : (
               <>
                 {activeTab === 'synced' ? (
                   <div className="p-8 space-y-4">
                     <div className="hidden print:block mb-8"><h1 className="text-2xl font-bold">{metadata?.title}</h1><p>{metadata?.description}</p></div>
                     {segments.map((seg, i) => {
                       const isActive = currentTime >= seg.start && currentTime <= seg.end;
                       const isMatch = searchResults[currentResultIndex] === i;
                       return (
                         <div key={i} id={`segment-${i}`} onClick={() => handleSeek(seg.start)} 
                           className={`p-3 rounded-lg transition-all cursor-pointer border border-transparent ${isActive ? 'bg-blue-50 border-blue-100 scale-[1.01]' : 'hover:bg-slate-50'} ${isMatch ? 'ring-2 ring-yellow-400' : ''}`}>
                           <p className={`text-lg leading-relaxed ${isActive ? 'text-blue-900 font-semibold' : 'text-slate-600'}`}>{renderHighlightedText(seg.text)}</p>
                           {isActive && <span className="text-xs text-blue-400 font-mono mt-1 block no-print">{formatTime(seg.start)}</span>}
                         </div>
                       );
                     })}
                     <div className="h-20 no-print"></div>
                   </div>
                 ) : activeTab === 'chat' ? (
                   <div className="flex flex-col h-full">
                     <div className="flex-grow p-6 space-y-4 overflow-y-auto bg-slate-50">
                       {chatHistory.length === 0 && (
                         <div className="text-center py-12 text-slate-400">
                           <Bot size={48} className="mx-auto mb-4 opacity-20"/>
                           <p className="font-medium">Pergunte qualquer coisa sobre o áudio!</p>
                           <p className="text-sm">Ex: "Qual foi a conclusão principal?"</p>
                         </div>
                       )}
                       {chatHistory.map((msg, i) => (
                         <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                             {msg.text}
                           </div>
                         </div>
                       ))}
                       {isChatLoading && <div className="flex justify-start"><div className="bg-white border p-3 rounded-2xl rounded-bl-none"><Loader2 size={16} className="animate-spin text-slate-400"/></div></div>}
                       <div ref={chatEndRef}></div>
                     </div>
                     <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                       <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Faça uma pergunta sobre o conteúdo..." 
                         className="flex-grow px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400" disabled={isChatLoading}/>
                       <button type="submit" disabled={!chatInput.trim() || isChatLoading} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"><Send size={20}/></button>
                     </form>
                   </div>
                 ) : (
                   <div className="p-8 h-full flex flex-col">
                     <textarea value={getCurrentText()} readOnly={activeTab !== 'transcription'} className="w-full flex-grow text-slate-800 bg-white leading-loose text-lg resize-none focus:outline-none mb-4" />
                     {activeTab === 'transcription' && (
                       <div className="flex justify-end pt-4 border-t border-slate-100">
                         <button onClick={handleRefine} className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg font-semibold hover:bg-purple-100 transition-colors">
                           <Sparkles size={16}/> Refinar para Leitura Profissional
                         </button>
                       </div>
                     )}
                   </div>
                 )}
               </>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Sidebar (Overview + Notes) */}
      <div className="w-full lg:w-80 flex flex-col gap-6 no-print">
         {/* Overview Card */}
         <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                 <Info size={16}/> Visão Geral
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{metadata?.description || "Sem descrição disponível."}</p>
         </div>

         {/* Notes Card */}
         <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex flex-col h-[400px]">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
               <h3 className="font-semibold text-slate-700 flex items-center gap-2"><Flag size={16} /> Minhas Anotações</h3>
               <span className="text-[10px] text-slate-400 font-mono bg-white px-2 py-1 rounded border">Ctrl+M</span>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
               {notes.map((note, idx) => (
                 <div key={idx} className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-3 group">
                    <div className="flex justify-between items-start mb-2">
                       <button onClick={() => handleSeek(note.timestamp)} className="text-xs font-mono font-bold text-blue-600 hover:underline flex items-center gap-1"><PlayCircle size={10} />{formatTime(note.timestamp)}</button>
                       <button onClick={() => removeNote(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={12} /></button>
                    </div>
                    <textarea value={note.text} onChange={(e) => updateNote(idx, e.target.value)} placeholder="Nota..." className="w-full bg-transparent text-sm resize-none focus:outline-none focus:border-yellow-300 border-b border-transparent" rows={2}/>
                 </div>
               ))}
               {notes.length === 0 && <p className="text-center text-slate-400 text-sm py-10">Pressione Ctrl+M para anotar.</p>}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
               <button onClick={addNote} className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:text-blue-600 shadow-sm">+ Inserir Marcador</button>
            </div>
         </div>
         <button onClick={onReset} className="w-full text-red-600 hover:bg-red-50 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all border border-transparent hover:border-red-100"><RefreshCw size={16} /> Começar Novo Arquivo</button>
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatSRTTime = (seconds: number) => {
  const date = new Date(0);
  date.setMilliseconds(seconds * 1000);
  return date.toISOString().substr(11, 12).replace('.', ',');
};

export default TranscriptionDisplay;