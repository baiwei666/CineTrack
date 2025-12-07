import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clapperboard, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  Star, 
  TrendingUp, 
  PieChart, 
  Calendar, 
  Filter, 
  X,
  Save,
  BrainCircuit,
  Film,
  BarChart3,
  LayoutGrid,
  List as ListIcon,
  Settings,
  Cpu,
  Globe,
  Download,
  Upload,
  FileJson,
  AlertCircle,
  Users,
  Clock,
  ExternalLink,
  User,
  Tag,
  Hash,
  Sparkles,
  Quote,
  Lightbulb,
  Files,
  AlertTriangle,
  Layers, 
  Tv 
} from 'lucide-react';

/**
 * 类型定义
 */
type MovieType = 'Movie' | 'Series' | 'Anime' | 'Documentary';

interface MovieRecord {
  id: string;
  tmdbId?: number; // 新增：保存 TMDB ID 以便获取季度信息
  title: string;
  originalTitle?: string;
  type: MovieType;
  coverUrl: string;
  rating: number; 
  doubanRating: number; 
  watchDate: string;
  tags: string[]; 
  comment: string;
  actors: string[];
  director?: string; 
  year: number;
  duration?: number; 
  season?: number; 
  episodes?: number; 
}

interface FilterState {
  search: string;
  type: MovieType | 'All';
  tag: string; 
  sort: 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc';
}

interface AppSettings {
  tmdbApiKey: string;
  aiProvider: 'Mock' | 'OpenAI' | 'Gemini' | 'DeepSeek';
  aiApiKey: string;
  aiModel: string;
}

interface AiAnalysisResult {
  keywords: string[];
  analysis: string;
  recommendations: {
    title: string;
    reason: string;
  }[];
}

/**
 * 模拟数据库
 */
const MOCK_DB: Partial<MovieRecord>[] = [
  { title: '星际穿越', originalTitle: 'Interstellar', type: 'Movie', year: 2014, doubanRating: 9.4, actors: ['马修·麦康纳', '安妮·海瑟薇'], director: '克里斯托弗·诺兰', tags: ['科幻', '剧情', '冒险'], duration: 169, episodes: 1, watchDate: '2023-11-15', coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=300' },
  { title: '绝命毒师', originalTitle: 'Breaking Bad', type: 'Series', season: 1, year: 2008, doubanRating: 9.8, actors: ['布莱恩·科兰斯顿', '亚伦·保尔'], director: '文斯·吉里根', tags: ['犯罪', '剧情'], duration: 45, episodes: 7, watchDate: '2023-10-01', coverUrl: 'https://images.unsplash.com/photo-1568819317551-31051b37f69f?auto=format&fit=crop&q=80&w=300' },
  { title: '绝命毒师', originalTitle: 'Breaking Bad', type: 'Series', season: 2, year: 2009, doubanRating: 9.9, actors: ['布莱恩·科兰斯顿', '亚伦·保尔'], director: '文斯·吉里根', tags: ['犯罪', '剧情'], duration: 47, episodes: 13, watchDate: '2023-10-15', coverUrl: 'https://images.unsplash.com/photo-1568819317551-31051b37f69f?auto=format&fit=crop&q=80&w=300' },
  { title: '千与千寻', originalTitle: '千と千尋の神隠し', type: 'Anime', year: 2001, doubanRating: 9.4, actors: ['柊瑠美', '入野自由'], director: '宫崎骏', tags: ['动画', '奇幻'], duration: 125, episodes: 1, watchDate: '2023-09-20', coverUrl: 'https://images.unsplash.com/photo-1560167016-022b78a0258e?auto=format&fit=crop&q=80&w=300' },
  { title: '地球脉动', originalTitle: 'Planet Earth', type: 'Documentary', season: 1, year: 2006, doubanRating: 9.9, actors: ['大卫·爱登堡'], director: '阿拉斯泰尔·福瑟吉尔', tags: ['纪录片', '自然'], duration: 60, episodes: 11, watchDate: '2023-08-15', coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=300' },
];

/**
 * 工具函数
 */
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '未知日期';
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  } catch (e) {
    return dateStr;
  }
};
const generateId = () => Math.random().toString(36).substr(2, 9);
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';

/**
 * 组件: 评分星星
 */
const StarRating = ({ rating, max = 10, size = 16, color = "text-yellow-400" }: { rating: number, max?: number, size?: number, color?: string }) => {
  const stars = [];
  const normalizedRating = (rating / max) * 5; 
  
  for (let i = 1; i <= 5; i++) {
    if (i <= normalizedRating) {
      stars.push(<Star key={i} size={size} className={`${color} fill-current`} />);
    } else if (i - 0.5 <= normalizedRating) {
      stars.push(<div key={i} className="relative"><Star size={size} className="text-gray-600" /><div className="absolute inset-0 overflow-hidden w-1/2"><Star size={size} className={`${color} fill-current`} /></div></div>);
    } else {
      stars.push(<Star key={i} size={size} className="text-gray-600" />);
    }
  }
  return <div className="flex gap-0.5">{stars}</div>;
};

/**
 * 组件: 自定义 SVG 环形图
 */
const DonutChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let currentAngle = 0;

  if (total === 0) return <div className="text-gray-500 text-sm flex justify-center items-center h-40">暂无数据</div>;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
        {data.map((item, index) => {
          const sliceAngle = (item.value / total) * 360;
          const x1 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
          const y1 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);
          const x2 = 50 + 40 * Math.cos((Math.PI * (currentAngle + sliceAngle)) / 180);
          const y2 = 50 + 40 * Math.sin((Math.PI * (currentAngle + sliceAngle)) / 180);
          
          const largeArcFlag = sliceAngle > 180 ? 1 : 0;
          const pathData = total === item.value 
            ? `M 50 10 A 40 40 0 1 1 49.99 10 Z` 
            : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
          
          currentAngle += sliceAngle;
          return <path key={index} d={pathData} fill={item.color} className="hover:opacity-80 transition-opacity cursor-pointer" />;
        })}
        <circle cx="50" cy="50" r="25" fill="#1e293b" /> 
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs text-gray-400 font-bold">{total}部</span>
      </div>
    </div>
  );
};

/**
 * 组件: 设置模态框
 */
const SettingsModal = ({ onClose, onSave, initialSettings, movies, setMovies }: any) => {
    const [localSettings, setLocalSettings] = useState(initialSettings);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalSettings((prev: any) => ({
            tmdbApiKey: '',
            aiProvider: 'Mock',
            aiApiKey: '',
            aiModel: 'gpt-3.5-turbo',
            ...prev
        }));
    }, []);

    const handleExport = () => {
        const dataStr = JSON.stringify(movies, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `cinetrack_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if(Array.isArray(data) && confirm(`导入 ${data.length} 条数据?`)) {
                    setMovies((prev: any[]) => {
                        const ids = new Set(prev.map(p=>p.id));
                        return [...data.filter((p:any)=>!ids.has(p.id)), ...prev];
                    });
                    onClose();
                }
            } catch(err) { alert('无效文件'); }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-lg border border-slate-700">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">设置</h2>
                    <button onClick={onClose}><X className="text-slate-400" /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2"><FileJson size={16}/> 数据备份</h3>
                        <div className="flex gap-2">
                            <button onClick={handleExport} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm text-white flex justify-center items-center gap-2"><Download size={14}/> 导出</button>
                            <button onClick={()=>fileInputRef.current?.click()} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm text-white flex justify-center items-center gap-2"><Upload size={14}/> 导入</button>
                            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
                        </div>
                    </div>
                    <div className="h-px bg-slate-700" />
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-green-400 flex items-center gap-2"><Globe size={16}/> TMDB API</h3>
                        <input type="password" value={localSettings.tmdbApiKey || ''} onChange={e=>setLocalSettings({...localSettings, tmdbApiKey:e.target.value})} placeholder="API Read Access Token" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2"><Cpu size={16}/> AI 配置</h3>
                        <select value={localSettings.aiProvider || 'Mock'} onChange={e=>setLocalSettings({...localSettings, aiProvider:e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-2">
                            <option value="Mock">Mock</option>
                            <option value="OpenAI">OpenAI</option>
                            <option value="Gemini">Gemini</option>
                            <option value="DeepSeek">DeepSeek</option>
                        </select>
                        {localSettings.aiProvider !== 'Mock' && (
                            <>
                                <input type="password" value={localSettings.aiApiKey || ''} onChange={e=>setLocalSettings({...localSettings, aiApiKey:e.target.value})} placeholder="API Key" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-2" />
                                <input type="text" value={localSettings.aiModel || ''} onChange={e=>setLocalSettings({...localSettings, aiModel:e.target.value})} placeholder="Model Name" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
                            </>
                        )}
                    </div>
                </div>
                <div className="p-6 border-t border-slate-700 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">取消</button>
                    <button onClick={()=>onSave(localSettings)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded">保存</button>
                </div>
            </div>
        </div>
    );
};

/**
 * 组件: 删除确认模态框
 */
const DeleteConfirmModal = ({ 
  movie, 
  onClose, 
  onConfirm 
}: { 
  movie: MovieRecord | null, 
  onClose: () => void, 
  onConfirm: () => void 
}) => {
  if (!movie) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm border border-red-500/30 shadow-2xl p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-red-500/10 rounded-full">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">确认删除记录?</h3>
            <p className="text-sm text-slate-400">
              您即将删除影片 <span className="text-white font-medium">《{movie.title}》{movie.season ? `(第${movie.season}季)` : ''}</span>
              <br />此操作无法撤销。
            </p>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition text-sm font-medium"
            >
              取消
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition text-sm font-medium shadow-lg shadow-red-900/20"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 组件: 添加/编辑模态框
 */
const AddEditModal = ({ 
  onClose, 
  onSave, 
  editingMovie, 
  appSettings 
}: { 
  onClose: () => void; 
  onSave: (movie: MovieRecord) => void; 
  editingMovie: MovieRecord | null;
  appSettings: AppSettings;
}) => {
  
  const [formData, setFormData] = useState<Partial<MovieRecord>>(
    editingMovie || {
      type: 'Movie',
      rating: 8,
      watchDate: new Date().toISOString().split('T')[0],
      tags: [],
      coverUrl: '',
      actors: [],
      director: '',
      season: undefined,
      episodes: 1
    }
  );
  
  // 监听编辑对象变化
  useEffect(() => {
    if (editingMovie) {
        setFormData(editingMovie);
    } else {
        // 重置为初始状态
        setFormData({
            type: 'Movie',
            rating: 8,
            watchDate: new Date().toISOString().split('T')[0],
            tags: [],
            coverUrl: '',
            actors: [],
            director: '',
            season: undefined,
            episodes: 1
        });
    }
  }, [editingMovie]);

  // --- 新增：监听季数变化，自动抓取该季度的海报和简介 ---
  useEffect(() => {
    // 仅在有 TMDB API Key、有 TMDB ID、非电影类型、且季数有效时触发
    if (!appSettings.tmdbApiKey || !formData.tmdbId || !formData.season || formData.type === 'Movie') {
        return;
    }

    const fetchSeasonDetails = async () => {
        try {
            // TMDB 获取特定季度的 API
            const res = await fetch(`https://api.themoviedb.org/3/tv/${formData.tmdbId}/season/${formData.season}?api_key=${appSettings.tmdbApiKey}&language=zh-CN`);
            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({
                    ...prev,
                    // 只有当 API 返回有效数据时才更新
                    coverUrl: data.poster_path ? `${TMDB_IMAGE_BASE}${data.poster_path}` : prev.coverUrl,
                    comment: data.overview || prev.comment, // 更新简介为该季度简介
                    year: data.air_date ? new Date(data.air_date).getFullYear() : prev.year
                }));
            }
        } catch (error) {
            console.error("Failed to fetch season details:", error);
        }
    };

    // 使用防抖，避免快速输入数字时频繁请求
    const timer = setTimeout(fetchSeasonDetails, 600);
    return () => clearTimeout(timer);

  }, [formData.season, formData.tmdbId, formData.type, appSettings.tmdbApiKey]);


  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  const searchTMDB = async (query: string) => {
    setIsSearching(true);
    try {
      if (!appSettings.tmdbApiKey) {
        const results = MOCK_DB.filter(m => m.title?.includes(query));
        setSearchSuggestions(results);
        setIsSearching(false);
        return;
      }

      const response = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${appSettings.tmdbApiKey}&language=zh-CN&query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.results) {
        setSearchSuggestions(data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv').slice(0, 5));
      }
    } catch (error) {
      console.error("TMDB Search Error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchTMDBDetails = async (id: number, mediaType: 'movie' | 'tv') => {
    setIsFetchingDetails(true);
    try {
      const response = await fetch(`https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${appSettings.tmdbApiKey}&language=zh-CN&append_to_response=credits`);
      const data = await response.json();
      
      const director = data.credits?.crew?.find((p: any) => p.job === 'Director')?.name || '';
      const actors = data.credits?.cast?.slice(0, 5).map((p: any) => p.name) || [];
      const tags = data.genres?.map((g: any) => g.name) || [];
      const duration = mediaType === 'movie' ? data.runtime : (data.episode_run_time?.[0] || 0);
      const episodes = mediaType === 'movie' ? 1 : (data.number_of_episodes || 1); 

      return { 
        director, actors, tags, duration, episodes,
        overview: data.overview, 
        poster_path: data.poster_path, 
        title: mediaType === 'movie' ? data.title : data.name, 
        original_title: mediaType === 'movie' ? data.original_title : data.original_name, 
        year: new Date(mediaType === 'movie' ? data.release_date : data.first_air_date).getFullYear(), 
        vote_average: data.vote_average 
      };
    } catch (error) {
      console.error("Fetch Details Error:", error);
      return null;
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.length > 1) {
      searchTimeoutRef.current = setTimeout(() => searchTMDB(val), 500);
    } else {
      setSearchSuggestions([]);
    }
  };

  const selectMovie = async (item: any) => {
    if (!appSettings.tmdbApiKey) {
      setFormData(prev => ({ ...prev, ...item, tags: item.tags || [], comment: item.comment || '' }));
      setSearchSuggestions([]);
      return;
    }

    const details = await fetchTMDBDetails(item.id, item.media_type);
    if (details) {
      setFormData(prev => ({
        ...prev,
        tmdbId: item.id, // 保存 TMDB ID
        title: details.title,
        originalTitle: details.original_title,
        type: item.media_type === 'movie' ? 'Movie' : 'Series',
        year: details.year || new Date().getFullYear(),
        doubanRating: details.vote_average,
        coverUrl: details.poster_path ? `${TMDB_IMAGE_BASE}${details.poster_path}` : '',
        tags: details.tags,
        actors: details.actors,
        director: details.director,
        duration: details.duration,
        comment: details.overview || '',
        episodes: details.episodes,
        season: item.media_type === 'movie' ? undefined : 1 // 剧集默认选中第一季，触发 useEffect 获取第一季信息
      }));
    }
    setSearchSuggestions([]);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-700">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800 z-10">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            {editingMovie ? <Edit2 className="text-blue-400" /> : <Plus className="text-green-400" />}
            {editingMovie ? '编辑记录' : '添加新记录'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!editingMovie && (
            <div className="relative z-20">
              <label className="block text-sm font-medium text-slate-400 mb-1 flex justify-between">
                <span>搜影视资料 {appSettings.tmdbApiKey ? '(TMDB)' : '(模拟)'}</span>
                {isSearching && <span className="text-xs text-blue-400 animate-pulse">搜索中...</span>}
                {isFetchingDetails && <span className="text-xs text-green-400 animate-pulse">获取详情中...</span>}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="输入电影/剧集名称..." 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    onChange={handleSearchInput}
                  />
                </div>
              </div>
              {searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg mt-1 shadow-xl max-h-60 overflow-y-auto">
                  {searchSuggestions.map((m, idx) => (
                    <div key={idx} onClick={() => selectMovie(m)} className="p-3 hover:bg-slate-700 cursor-pointer flex gap-3 border-b border-slate-700/50 last:border-0 group">
                      {m.poster_path || m.coverUrl ? (
                        <img src={m.coverUrl || `${TMDB_IMAGE_BASE}${m.poster_path}`} className="w-10 h-14 object-cover rounded" alt="" />
                      ) : (
                        <div className="w-10 h-14 bg-slate-600 rounded flex items-center justify-center"><Film size={16}/></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate flex justify-between">
                          <span>{m.title || m.name}</span>
                          <span className="text-yellow-500 text-xs flex items-center gap-0.5"><Star size={10} fill="currentColor"/> {m.vote_average?.toFixed(1) || m.doubanRating}</span>
                        </div>
                        <div className="text-slate-500 text-xs flex gap-2">
                            <span>{new Date(m.release_date || m.first_air_date || m.year).getFullYear() || '未知'}</span>
                            <span>{m.media_type === 'movie' || m.type === 'Movie' ? '电影' : '剧集'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">影片标题</label>
                <input 
                  value={formData.title || ''} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">年份</label>
                  <input 
                    type="number"
                    value={formData.year || ''} 
                    onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" 
                  />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">类型</label>
                  <select 
                    value={formData.type || 'Movie'} 
                    onChange={e => setFormData({...formData, type: e.target.value as MovieType})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="Movie">电影</option>
                    <option value="Series">剧集</option>
                    <option value="Anime">动画</option>
                    <option value="Documentary">纪录片</option>
                  </select>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">观看日期</label>
                  <input 
                    type="date"
                    value={formData.watchDate || ''} 
                    onChange={e => setFormData({...formData, watchDate: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" 
                  />
                </div>
                {/* 季数输入 (非电影可见) */}
                {(formData.type !== 'Movie') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center justify-between">
                        <span>当前季数</span>
                        {formData.tmdbId && <span className="text-[10px] text-green-400">自动同步封面</span>}
                    </label>
                    <input 
                      type="number"
                      min="1"
                      value={formData.season || ''} 
                      onChange={e => setFormData({...formData, season: e.target.value ? parseInt(e.target.value) : undefined})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" 
                      placeholder="选填"
                    />
                  </div>
                )}
                
                {/* 时长输入 */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    {formData.type === 'Movie' ? '时长 (分钟)' : '单集时长 (分钟)'}
                  </label>
                  <input 
                    type="number"
                    value={formData.duration || ''} 
                    onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" 
                  />
                </div>

                {/* 集数输入 (非电影可见) */}
                {formData.type !== 'Movie' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">观看集数</label>
                    <input 
                      type="number"
                      min="1"
                      value={formData.episodes || ''} 
                      onChange={e => setFormData({...formData, episodes: parseInt(e.target.value)})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" 
                      placeholder="1"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-slate-400 mb-1 flex justify-between">
                  <span>个人评分 (0-10)</span>
                  <span className="text-yellow-400 font-bold">{formData.rating || 0}</span>
                </label>
                <input 
                  type="range" min="0" max="10" step="0.5"
                  value={formData.rating || 0} 
                  onChange={e => setFormData({...formData, rating: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                />
                <div className="mt-2 flex justify-center">
                  <StarRating rating={formData.rating || 0} size={20} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">封面链接</label>
                <div className="flex gap-2">
                  <input 
                    value={formData.coverUrl || ''} 
                    onChange={e => setFormData({...formData, coverUrl: e.target.value})}
                    placeholder="https://..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm" 
                  />
                  {formData.coverUrl && <img src={formData.coverUrl} className="w-10 h-10 object-cover rounded border border-slate-600" alt="preview" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">导演</label>
                    <input 
                      value={formData.director || ''} 
                      onChange={e => setFormData({...formData, director: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Tags (逗号隔开)</label>
                    <input 
                      value={formData.tags?.join(', ') || ''} 
                      onChange={e => setFormData({...formData, tags: e.target.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean)})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm" 
                    />
                </div>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">主演 (逗号分隔)</label>
                  <input 
                    value={formData.actors?.join(', ') || ''} 
                    onChange={e => setFormData({...formData, actors: e.target.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean)})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm" 
                  />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">观影笔记 / 简介</label>
            <textarea 
              value={formData.comment || ''}
              onChange={e => setFormData({...formData, comment: e.target.value})}
              placeholder="记录你的观影感受或剧情简介..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white h-32 focus:ring-2 focus:ring-blue-500 outline-none text-sm leading-relaxed"
            />
          </div>
          
          <button 
            onClick={() => {
              if(!formData.title) return alert('请输入标题');
              onSave({...formData, id: formData.id || generateId()} as MovieRecord);
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <Save size={20} />
            保存记录
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 主应用组件
 */
export default function CineTrackApp() {
  const [movies, setMovies] = useState<MovieRecord[]>([]);
  const [view, setView] = useState<'dashboard' | 'list' | 'ai'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<MovieRecord | null>(null);
  
  // 新增状态
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [movieToDelete, setMovieToDelete] = useState<MovieRecord | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'All',
    tag: 'All',
    sort: 'date_desc'
  });
  
  const [appSettings, setAppSettings] = useState<AppSettings>({
    tmdbApiKey: '',
    aiProvider: 'Mock',
    aiApiKey: '',
    aiModel: 'gpt-3.5-turbo'
  });

  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 初始化加载
  useEffect(() => {
    const loadData = () => {
      try {
        const savedData = localStorage.getItem('cinetrack_data');
        if (savedData && savedData !== "undefined") {
          const parsed = JSON.parse(savedData);
          if (Array.isArray(parsed)) setMovies(parsed);
        } else {
          // Fix: Assign IDs to mock data
          const mockWithIds = MOCK_DB.map(m => ({...m, id: generateId()})) as MovieRecord[];
          setMovies(mockWithIds);
        }
      } catch (e) {
        console.warn("Init error:", e);
        // Fix: Assign IDs to mock data in catch block too
        const mockWithIds = MOCK_DB.map(m => ({...m, id: generateId()})) as MovieRecord[];
        setMovies(mockWithIds);
      }

      try {
        const savedSettings = localStorage.getItem('cinetrack_settings');
        // Merge with defaults to ensure all keys exist
        const defaultSettings = {
            tmdbApiKey: '',
            aiProvider: 'Mock',
            aiApiKey: '',
            aiModel: 'gpt-3.5-turbo'
        };
        if (savedSettings) {
            setAppSettings({...defaultSettings, ...JSON.parse(savedSettings)});
        }
      } catch (e) {}
    };
    loadData();
  }, []);

  useEffect(() => {
    if (movies.length > 0) localStorage.setItem('cinetrack_data', JSON.stringify(movies));
  }, [movies]);

  const saveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem('cinetrack_settings', JSON.stringify(newSettings));
    setIsSettingsOpen(false);
  };

  const handleSaveMovie = (movie: MovieRecord) => {
    if (editingMovie) {
      setMovies(movies.map(m => m.id === movie.id ? movie : m));
    } else {
      setMovies([movie, ...movies]);
    }
    setIsModalOpen(false);
    setEditingMovie(null);
  };

  // 修改：触发删除时，仅设置状态，不直接删除
  const triggerDelete = (movie: MovieRecord) => {
    setMovieToDelete(movie);
  };

  // 确认删除
  const confirmDelete = () => {
    if (movieToDelete) {
      setMovies(movies.filter(m => m.id !== movieToDelete.id));
      setMovieToDelete(null);
    }
  };

  // --- Duplicate Logic ---
  const duplicateIds = useMemo(() => {
    const lookup = new Map<string, string[]>();
    movies.forEach(m => {
        // 标准化标题：转小写，仅保留中文、字母和数字
        const key = m.title.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');
        if (!lookup.has(key)) lookup.set(key, []);
        lookup.get(key)?.push(m.id);
    });
    const result = new Set<string>();
    for (const ids of lookup.values()) {
        if (ids.length > 1) ids.forEach(id => result.add(id));
    }
    return result;
  }, [movies]);

  // --- Filtering Logic (Expanded) ---
  const filteredMovies = useMemo(() => {
    let result = movies;

    // 查重模式优先
    if (showDuplicates) {
        return result.filter(m => duplicateIds.has(m.id)).sort((a, b) => a.title.localeCompare(b.title));
    }

    return result
      .filter(m => {
        const searchLower = filters.search.toLowerCase();
        // 搜索匹配：标题、演员、导演、类型
        const matchSearch = 
          m.title.toLowerCase().includes(searchLower) || 
          m.tags.some(t => t.toLowerCase().includes(searchLower)) ||
          m.actors?.some(a => a.toLowerCase().includes(searchLower)) ||
          (m.director && m.director.toLowerCase().includes(searchLower));
        
        const matchType = filters.type === 'All' || m.type === filters.type;
        const matchTag = filters.tag === 'All' || m.tags.includes(filters.tag);
        
        return matchSearch && matchType && matchTag;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case 'date_desc': return new Date(b.watchDate).getTime() - new Date(a.watchDate).getTime();
          case 'date_asc': return new Date(a.watchDate).getTime() - new Date(b.watchDate).getTime();
          case 'rating_desc': return b.rating - a.rating;
          case 'rating_asc': return a.rating - b.rating;
          default: return 0;
        }
      });
  }, [movies, filters, showDuplicates, duplicateIds]);

  // 获取所有唯一的 Tags 供筛选
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    movies.forEach(m => m.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [movies]);

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    const total = movies.length;
    const avgRating = total > 0 ? (movies.reduce((acc, cur) => acc + cur.rating, 0) / total).toFixed(1) : '0.0';
    const typeCount: Record<string, number> = {};
    const tagCount: Record<string, number> = {}; // Tag frequency
    
    // Calculate total duration: for movies it's duration, for series it's duration * episodes
    const totalDuration = movies.reduce((acc, m) => {
      const episodes = m.episodes || 1;
      const duration = m.duration || 0;
      // If it's a Movie, usually episodes is 1, but let's be strict
      const itemTotal = m.type === 'Movie' ? duration : duration * episodes;
      return acc + itemTotal;
    }, 0);

    movies.forEach(m => { 
      typeCount[m.type] = (typeCount[m.type] || 0) + 1; 
      m.tags?.forEach(t => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    });
    
    // Recent 6 months trend
    const last6Months = Array.from({length: 6}, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7); 
    }).reverse();
    
    const trendData = last6Months.map(month => {
      // 修复：添加 ?. 安全访问
      return movies.filter(m => m.watchDate?.startsWith(month)).length;
    });

    // Top 5 Tags
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { total, avgRating, typeCount, trendData, labels: last6Months, topTags, totalDuration };
  }, [movies]);

  // AI Analysis Logic
  const runAiAnalysis = async () => {
    if (movies.length === 0) { alert("无数据"); return; }
    setIsAnalyzing(true);
    setAiAnalysis(null);
    const isMock = appSettings.aiProvider === 'Mock';
    
    if (!isMock && !appSettings.aiApiKey) {
        alert(`请配置 ${appSettings.aiProvider} API Key`);
        setIsAnalyzing(false);
        return;
    }

    try {
        const movieDataStr = movies.slice(0, 30).map(m => 
            `《${m.title}》- ${m.rating}分, 类型:${m.tags.join('/')}, 导演:${m.director}`
        ).join('\n');

        // 更新 System Prompt 以请求 JSON 格式
        const systemPrompt = `你是一位资深电影评论家。请根据用户的观影记录，生成一份 JSON 格式的分析报告。
不要包含 markdown 代码块标记，直接返回纯 JSON 字符串。
JSON 结构如下：
{
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4"],
  "analysis": "这里是深度分析文本，请保持段落清晰，语言风趣幽默且富有洞察力。",
  "recommendations": [
    { "title": "推荐影片1", "reason": "推荐理由1" },
    { "title": "推荐影片2", "reason": "推荐理由2" },
    { "title": "推荐影片3", "reason": "推荐理由3" }
  ]
}`;

        let resultStr = '';

        if (isMock) {
            await new Promise(r => setTimeout(r, 2000));
            const mockResult: AiAnalysisResult = {
                keywords: ["硬核科幻", "诺兰信徒", "高智商叙事", "视觉控"],
                analysis: "您的观影品味非常独特，明显偏好宏大的叙事结构和复杂的哲学探讨。从《星际穿越》到《黑客帝国》，您对探索人类存在意义的科幻题材情有独钟。同时，给出的高分评价显示您非常看重影片的视听语言和导演的个人风格。",
                recommendations: [
                    { title: "降临 (Arrival)", reason: "同样的硬核科幻内核，探讨语言与时间的哲学，绝对符合您的口味。" },
                    { title: "银翼杀手 2049", reason: "极致的视觉美学，赛博朋克风格的巅峰之作，沉浸感极强。" },
                    { title: "奥本海默", reason: "诺兰导演的最新力作，虽然是传记片，但叙事手法依然令人着迷。" }
                ]
            };
            setAiAnalysis(mockResult);
            setIsAnalyzing(false);
            return;
        } else {
            const endpoint = appSettings.aiProvider === 'OpenAI' ? 'https://api.openai.com/v1/chat/completions' : 
                             appSettings.aiProvider === 'DeepSeek' ? 'https://api.deepseek.com/chat/completions' :
                             `https://generativelanguage.googleapis.com/v1beta/models/${appSettings.aiModel}:generateContent?key=${appSettings.aiApiKey}`;
            
            const body = appSettings.aiProvider === 'Gemini' ? 
              { contents: [{ parts: [{ text: systemPrompt + "\n\n用户数据:\n" + movieDataStr }] }] } :
              { model: appSettings.aiModel, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: movieDataStr }] };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(appSettings.aiProvider !== 'Gemini' && { 'Authorization': `Bearer ${appSettings.aiApiKey}` }) },
                body: JSON.stringify(body)
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error?.message || "API 请求失败");
            }

            resultStr = appSettings.aiProvider === 'Gemini' 
                ? data.candidates?.[0]?.content?.parts?.[0]?.text 
                : data.choices?.[0]?.message?.content;
        }

        // 清洗和解析 JSON
        if (resultStr) {
            // 去除可能存在的 markdown 代码块标记
            const cleanStr = resultStr.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanStr);
            setAiAnalysis(parsed);
        } else {
            throw new Error("未获取到有效返回内容");
        }

    } catch (e: any) {
        console.error(e);
        setAiAnalysis(`分析失败: ${e.message}. 请检查 API Key 或网络连接。`);
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2 font-bold text-xl text-white">
          <Clapperboard className="text-blue-500" /> CineTrack
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-400 hover:text-white"><Settings size={20} /></button>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 rounded-lg"><Plus size={20} /></button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row min-h-screen">
        
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-6 sticky top-0 h-screen">
          <div className="flex items-center gap-3 font-bold text-2xl text-white mb-10">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Clapperboard className="text-white" size={24} />
            </div>
            CineTrack
          </div>
          
          <nav className="space-y-2 flex-1">
            <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${view === 'dashboard' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}>
              <LayoutGrid size={20} /> 仪表盘
            </button>
            <button onClick={() => setView('list')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${view === 'list' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}>
              <ListIcon size={20} /> 全部记录
            </button>
            <button onClick={() => setView('ai')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${view === 'ai' ? 'bg-purple-600/10 text-purple-400' : 'hover:bg-slate-800 text-slate-400'}`}>
              <BrainCircuit size={20} /> AI 分析
            </button>
          </nav>

          <div className="pt-6 border-t border-slate-800 space-y-4">
             <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition text-sm">
              <Settings size={18} /> 设置与数据
            </button>
            <button onClick={() => { setEditingMovie(null); setIsModalOpen(true); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
              <Plus size={20} /> 添加观影
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          
          {/* View: Dashboard */}
          {view === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">观影数据概览</h1>
                  <p className="text-slate-400">统计分析与趋势展示</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                  <div className="p-2 bg-blue-500/10 rounded-lg w-fit mb-3"><Film className="text-blue-500" size={20} /></div>
                  <div className="text-3xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-slate-500">总观影数量</div>
                </div>
                
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                  <div className="p-2 bg-yellow-500/10 rounded-lg w-fit mb-3"><Star className="text-yellow-500" size={20} /></div>
                  <div className="text-3xl font-bold text-white">{stats.avgRating}</div>
                  <div className="text-sm text-slate-500">平均评分</div>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                  <div className="p-2 bg-purple-500/10 rounded-lg w-fit mb-3"><Clock className="text-purple-500" size={20} /></div>
                  <div className="text-3xl font-bold text-white">
                    {Math.round(stats.totalDuration / 60)}
                    <span className="text-sm font-normal text-slate-500 ml-1">小时</span>
                  </div>
                  <div className="text-sm text-slate-500">总时长 (估算)</div>
                </div>
                
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                  <div className="p-2 bg-pink-500/10 rounded-lg w-fit mb-3"><Tag className="text-pink-500" size={20} /></div>
                  <div className="text-lg font-bold text-white truncate">{stats.topTags[0]?.[0] || '暂无'}</div>
                  <div className="text-sm text-slate-500">最爱标签</div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart (FIXED) */}
                <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800">
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><BarChart3 size={18} /> 近半年观影趋势</h3>
                  <div className="h-64 flex items-end justify-between gap-4 px-4 pb-2 border-b border-slate-800/50">
                    {stats.trendData.map((val, idx) => {
                      const max = Math.max(...stats.trendData, 1); 
                      const height = Math.max((val / max) * 100, 2); // Min height 2%
                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 gap-2 group h-full justify-end">
                          <div className="relative w-full max-w-[40px] h-full flex items-end">
                             <div 
                              style={{ height: `${height}%` }} 
                              className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm opacity-80 group-hover:opacity-100 transition-all duration-300"
                            >
                               {/* Value Label */}
                               <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 border border-slate-600">
                                 {val} 部
                               </div>
                            </div>
                          </div>
                          <span className="text-xs text-slate-500">{stats.labels[idx].split('-')[1]}月</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tag Distribution (NEW) */}
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col">
                   <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Hash size={18} /> 观影口味 (Top 5)</h3>
                   <div className="flex-1 space-y-4">
                      {stats.topTags.map(([tag, count], idx) => (
                        <div key={tag} className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>{tag}</span>
                            <span>{count}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-yellow-500'][idx % 5]}`} 
                              style={{ width: `${(count / Math.max(stats.topTags[0][1], 1)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                      {stats.topTags.length === 0 && <div className="text-center text-slate-600 py-10">暂无标签数据</div>}
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* View: List */}
          {view === 'list' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              
              {/* Filter Bar (Updated) */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
                     <ListIcon size={20} className="text-white" />
                   </div>
                   <h1 className="text-2xl font-bold text-white">所有记录 <span className="text-slate-500 text-lg font-normal">({filteredMovies.length})</span></h1>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
                   <div className="relative group lg:col-span-1">
                    <Search className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-blue-500 transition" size={18} />
                    <input 
                      type="text" 
                      placeholder="搜名/人/类..." 
                      value={filters.search}
                      onChange={e => setFilters({...filters, search: e.target.value})}
                      className="bg-slate-950 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white w-full text-sm focus:border-blue-500 outline-none transition"
                    />
                   </div>
                   
                   {/* Duplicate Check Button */}
                   <button 
                     onClick={() => setShowDuplicates(!showDuplicates)}
                     className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border transition ${showDuplicates ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'}`}
                     title="筛选重复或相似的影片"
                   >
                     <Files size={16} /> 查重
                   </button>

                   {/* Genre Filter (NEW) */}
                   <select 
                      value={filters.tag}
                      onChange={e => setFilters({...filters, tag: e.target.value})}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition"
                    >
                      <option value="All">所有标签</option>
                      {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                   </select>

                   <select 
                      value={filters.type}
                      onChange={e => setFilters({...filters, type: e.target.value as any})}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition"
                    >
                      <option value="All">所有格式</option>
                      <option value="Movie">电影</option>
                      <option value="Series">剧集</option>
                      <option value="Anime">动画</option>
                   </select>

                   <select 
                      value={filters.sort}
                      onChange={e => setFilters({...filters, sort: e.target.value as any})}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition"
                    >
                      <option value="date_desc">日期 (新→旧)</option>
                      <option value="date_asc">日期 (旧→新)</option>
                      <option value="rating_desc">评分 (高→低)</option>
                    </select>
                </div>
              </div>

              {/* Movie Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMovies.map(movie => (
                  <div 
                    key={movie.id} 
                    onClick={() => { setEditingMovie(movie); setIsModalOpen(true); }}
                    className="group bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:shadow-2xl hover:shadow-blue-900/10 hover:border-slate-600 transition duration-300 flex flex-col cursor-pointer h-full"
                  >
                    {/* Poster */}
                    <div className="relative w-full aspect-[2/3] overflow-hidden bg-slate-800 shrink-0">
                      {movie.coverUrl ? (
                         <img src={movie.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={movie.title} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-600 bg-slate-800"><Film size={40} /></div>
                      )}
                      
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 shadow-lg border border-white/10 z-10">
                        <Star size={14} className="text-yellow-400 fill-current" />
                        <span className="text-white font-bold text-sm">{movie.rating}</span>
                      </div>

                       {/* Season Badge (Top Left) */}
                       <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                         {movie.year && (
                          <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs text-white font-medium border border-white/10 w-fit">
                            {movie.year}
                          </div>
                         )}
                         {movie.season && (
                           <div className="bg-orange-600/90 backdrop-blur-md px-2 py-1 rounded-md text-xs text-white font-bold border border-orange-500/50 w-fit flex items-center gap-1 shadow-lg shadow-orange-900/20">
                             <Layers size={10} /> S{movie.season}
                           </div>
                         )}
                       </div>
                      
                      {/* === NEW HOVER OVERLAY START === */}
                      <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm p-5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out z-20 flex flex-col translate-y-4 group-hover:translate-y-0">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/50">
                          <Quote size={14} className="text-blue-400" />
                          <span className="text-xs font-bold text-slate-200">简介与笔记</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto scrollbar-none">
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {movie.comment || <span className="italic opacity-50">暂无内容...</span>}
                          </p>
                        </div>

                        {movie.tags && movie.tags.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-700/50 flex flex-wrap gap-1.5">
                            {movie.tags.slice(0, 6).map(t => (
                              <span key={t} className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* === NEW HOVER OVERLAY END === */}

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80 group-hover:opacity-0 transition-opacity duration-300"></div>
                      <div className="absolute bottom-0 left-0 p-4 w-full group-hover:opacity-0 transition-opacity duration-300">
                         <div className="flex gap-2 mb-1">
                            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded shadow">{movie.type}</span>
                            {movie.duration && (
                              <span className="text-[10px] bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                                <Clock size={10}/> 
                                {movie.duration}m
                                {(movie.episodes && movie.episodes > 1) && ` × ${movie.episodes}集`}
                              </span>
                            )}
                         </div>
                         <h3 className="text-lg font-bold text-white truncate drop-shadow-md">{movie.title}</h3>
                         <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 font-medium opacity-90">
                           <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(movie.watchDate)}</span>
                         </div>
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between bg-slate-900">
                      <div className="mb-4 space-y-2">
                        
                        {/* Title with Season info */}
                        <div className="flex items-center justify-between">
                           <h4 className="font-bold text-white truncate text-sm" title={movie.title}>{movie.title}</h4>
                           {movie.season && <span className="text-[10px] text-orange-400 font-mono bg-orange-900/30 px-1 rounded">第{movie.season}季</span>}
                        </div>

                        {/* Director & Cast */}
                        <div className="space-y-1">
                            {movie.director && (
                                <div className="flex items-center gap-2 text-xs text-slate-400" title="导演">
                                    <User size={12} className="text-blue-500" />
                                    <span className="truncate">{movie.director}</span>
                                </div>
                            )}
                            {movie.actors && movie.actors.length > 0 && (
                                <div className="flex items-start gap-2 text-xs text-slate-500" title="主演">
                                    <Users size={12} className="mt-0.5 shrink-0" />
                                    <span className="line-clamp-1">{movie.actors.join(' / ')}</span>
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        {movie.tags && movie.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {movie.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{tag}</span>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed italic">
                          {movie.comment || '暂无笔记...'}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 border-t border-slate-800 mt-auto">
                         <button 
                           onClick={(e) => { e.stopPropagation(); setEditingMovie(movie); setIsModalOpen(true); }} 
                           className="text-slate-400 hover:text-blue-400 text-xs flex items-center gap-1.5 transition py-1 px-2 rounded hover:bg-slate-800"
                         >
                           <Edit2 size={14} /> 编辑
                         </button>
                         <button 
                           onClick={(e) => { e.stopPropagation(); triggerDelete(movie); }} 
                           className="text-slate-400 hover:text-red-400 text-xs flex items-center gap-1.5 transition py-1 px-2 rounded hover:bg-slate-800"
                         >
                           <Trash2 size={14} /> 删除
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredMovies.length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <div className="bg-slate-900/50 inline-block p-6 rounded-full mb-4 border border-slate-800">
                      <Search size={40} className="text-slate-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white">没有找到相关影片</h3>
                    <p className="text-slate-500 mt-2">尝试调整筛选条件或搜索关键词</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View: AI Analysis */}
          {view === 'ai' && (
            <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
               <div className="text-center mb-10">
                 <div className="inline-flex items-center justify-center p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-900/30 mb-6">
                   <BrainCircuit size={32} className="text-white" />
                 </div>
                 <h1 className="text-3xl font-bold text-white mb-4">AI 观影助手</h1>
                 <p className="text-slate-400 max-w-lg mx-auto">
                   当前模型: <span className="text-purple-400 font-mono">{appSettings.aiProvider === 'Mock' ? 'Mock (内置)' : appSettings.aiModel}</span>
                 </p>
               </div>

               <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl">
                 {!aiAnalysis ? (
                   <div className="text-center py-10">
                     <p className="text-slate-400 mb-8">点击下方按钮开始分析您的 {movies.length} 条观影数据</p>
                     <button 
                      onClick={runAiAnalysis}
                      disabled={isAnalyzing}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20"
                     >
                       {isAnalyzing ? (
                         <><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> 正在分析...</>
                       ) : (
                         <><BrainCircuit size={20} /> 生成分析报告</>
                       )}
                     </button>
                     {appSettings.aiProvider === 'Mock' && (
                       <p className="text-xs text-slate-500 mt-4">提示: 在设置中配置 API Key 可开启真实 AI 模型分析</p>
                     )}
                   </div>
                 ) : (
                   <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                     {typeof aiAnalysis === 'string' ? (
                        <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg text-red-200">
                            {aiAnalysis}
                        </div>
                     ) : (
                        <>
                            {/* Keywords Section */}
                            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Sparkles size={16} /> 您的观影画像
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {aiAnalysis.keywords.map((keyword, i) => (
                                        <span key={i} className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-purple-200 font-medium shadow-sm">
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Deep Analysis Section */}
                            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-10">
                                    <Quote size={80} className="text-white" />
                                </div>
                                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <BrainCircuit size={16} /> 深度解读
                                </h3>
                                <p className="text-slate-300 leading-loose text-lg font-light relative z-10">
                                    {aiAnalysis.analysis}
                                </p>
                            </div>

                            {/* Recommendations Section */}
                            <div>
                                <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Lightbulb size={16} /> 专属推荐
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {aiAnalysis.recommendations.map((rec, i) => (
                                        <div key={i} className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-green-500/30 transition group h-full flex flex-col">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 group-hover:bg-green-900/30 group-hover:text-green-400 transition">
                                                    <Film size={18} />
                                                </div>
                                                <h4 className="font-bold text-white group-hover:text-green-400 transition">{rec.title}</h4>
                                            </div>
                                            <p className="text-sm text-slate-400 leading-relaxed flex-1">
                                                {rec.reason}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex justify-center pt-8">
                                <button onClick={() => setAiAnalysis(null)} className="text-sm text-slate-500 hover:text-white transition flex items-center gap-2">
                                    <X size={14} /> 清除分析结果
                                </button>
                            </div>
                        </>
                     )}
                   </div>
                 )}
               </div>
            </div>
          )}

        </main>
      </div>

      {/* Modals: Render conditionally to allow hooks to reset correctly on open */}
      {isModalOpen && (
        <AddEditModal 
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveMovie}
          editingMovie={editingMovie}
          appSettings={appSettings}
        />
      )}
      
      {isSettingsOpen && (
        <SettingsModal 
          onClose={() => setIsSettingsOpen(false)} 
          onSave={saveSettings} 
          initialSettings={appSettings} 
          movies={movies}
          setMovies={setMovies}
        />
      )}

      {/* Delete Confirmation Modal */}
      {movieToDelete && (
        <DeleteConfirmModal 
          movie={movieToDelete}
          onClose={() => setMovieToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
      
    </div>
  );
}