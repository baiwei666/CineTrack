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
  MoreHorizontal, 
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
  ExternalLink
} from 'lucide-react';

/**
 * 类型定义
 */
type MovieType = 'Movie' | 'Series' | 'Anime' | 'Documentary';

interface MovieRecord {
  id: string;
  title: string;
  originalTitle?: string;
  type: MovieType;
  coverUrl: string;
  rating: number; // 用户评分 0-10
  doubanRating: number; // 外部评分 (TMDB/豆瓣)
  watchDate: string;
  tags: string[];
  comment: string;
  actors: string[];
  year: number;
  duration?: number; // minutes
}

interface FilterState {
  search: string;
  type: MovieType | 'All';
  sort: 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc';
}

interface AppSettings {
  tmdbApiKey: string; // 替换原 doubanApiKey
  aiProvider: 'Mock' | 'OpenAI' | 'Gemini' | 'DeepSeek';
  aiApiKey: string;
  aiModel: string;
}

/**
 * 模拟数据库 (当未配置 TMDB API 时使用)
 */
const MOCK_DB: Partial<MovieRecord>[] = [
  { title: '星际穿越', originalTitle: 'Interstellar', type: 'Movie', year: 2014, doubanRating: 9.4, actors: ['马修·麦康纳', '安妮·海瑟薇'], coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=300' },
  { title: '千与千寻', originalTitle: '千と千尋の神隠し', type: 'Anime', year: 2001, doubanRating: 9.4, actors: ['柊瑠美', '入野自由'], coverUrl: 'https://images.unsplash.com/photo-1560167016-022b78a0258e?auto=format&fit=crop&q=80&w=300' },
  { title: '绝命毒师', originalTitle: 'Breaking Bad', type: 'Series', year: 2008, doubanRating: 9.8, actors: ['布莱恩·科兰斯顿'], coverUrl: 'https://images.unsplash.com/photo-1568819317551-31051b37f69f?auto=format&fit=crop&q=80&w=300' },
  { title: '黑客帝国', originalTitle: 'The Matrix', type: 'Movie', year: 1999, doubanRating: 9.1, actors: ['基努·里维斯'], coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=300' },
  { title: '地球脉动', originalTitle: 'Planet Earth', type: 'Documentary', year: 2006, doubanRating: 9.9, actors: ['大卫·爱登堡'], coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=300' },
  { title: '肖申克的救赎', originalTitle: 'The Shawshank Redemption', type: 'Movie', year: 1994, doubanRating: 9.7, actors: ['蒂姆·罗宾斯'], coverUrl: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?auto=format&fit=crop&q=80&w=300' },
  { title: '盗梦空间', originalTitle: 'Inception', type: 'Movie', year: 2010, doubanRating: 9.3, actors: ['莱昂纳多·迪卡普里奥'], coverUrl: 'https://images.unsplash.com/photo-1534086687409-913a8264775d?auto=format&fit=crop&q=80&w=300' },
  { title: '进击的巨人', originalTitle: 'Attack on Titan', type: 'Anime', year: 2013, doubanRating: 9.6, actors: ['梶裕贵'], coverUrl: 'https://images.unsplash.com/photo-1620336655052-b5797080614f?auto=format&fit=crop&q=80&w=300' },
];

/**
 * 工具函数
 */
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
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
  const normalizedRating = (rating / max) * 5; // 转换为5星制显示
  
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
 * 组件: 自定义 SVG 环形图 (用于类型分布)
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
          const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
          
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
 * 组件: 添加/编辑模态框
 * 提取到外部以防止父组件渲染时销毁焦点
 */
const AddEditModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingMovie, 
  appSettings 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (movie: MovieRecord) => void; 
  editingMovie: MovieRecord | null;
  appSettings: AppSettings;
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<Partial<MovieRecord>>(
    editingMovie || {
      type: 'Movie',
      rating: 8,
      watchDate: new Date().toISOString().split('T')[0],
      tags: [],
      coverUrl: ''
    }
  );
  const [searchSuggestions, setSearchSuggestions] = useState<Partial<MovieRecord>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<any>(null); // 使用 ref 存储定时器 ID

  const searchTMDB = async (query: string) => {
    setIsSearching(true);
    try {
      if (!appSettings.tmdbApiKey) {
        // Fallback to Mock
        const results = MOCK_DB.filter(m => m.title?.includes(query) || m.originalTitle?.toLowerCase().includes(query.toLowerCase()));
        setSearchSuggestions(results);
        setIsSearching(false);
        return;
      }

      // Real TMDB Search
      const response = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${appSettings.tmdbApiKey}&language=zh-CN&query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.results) {
        const mappedResults: Partial<MovieRecord>[] = data.results
          .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
          .map((item: any) => ({
            title: item.title || item.name,
            originalTitle: item.original_title || item.original_name,
            type: item.media_type === 'movie' ? 'Movie' : 'Series',
            year: new Date(item.release_date || item.first_air_date || Date.now()).getFullYear(),
            doubanRating: item.vote_average,
            coverUrl: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '',
            tags: [], 
            actors: [], 
            comment: item.overview
          }));
        setSearchSuggestions(mappedResults.slice(0, 5));
      }
    } catch (error) {
      console.error("TMDB Search Error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // 清除上一次的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.length > 1) {
      // 设置新的定时器
      searchTimeoutRef.current = setTimeout(() => {
        searchTMDB(val);
      }, 500);
    } else {
      setSearchSuggestions([]);
    }
  };

  const selectMovie = (movie: Partial<MovieRecord>) => {
    setFormData(prev => ({ 
      ...prev, 
      ...movie, 
      tags: [], 
      comment: movie.comment || '',
      rating: prev.rating, 
      watchDate: prev.watchDate
    }));
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
          {/* Search Section (Only for Add) */}
          {!editingMovie && (
            <div className="relative z-20">
              <label className="block text-sm font-medium text-slate-400 mb-1 flex justify-between">
                <span>搜影视资料 {appSettings.tmdbApiKey ? '(TMDB)' : '(模拟)'}</span>
                {isSearching && <span className="text-xs text-blue-400 animate-pulse">搜索中...</span>}
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
                      {m.coverUrl ? (
                        <img src={m.coverUrl} className="w-10 h-14 object-cover rounded" alt="" />
                      ) : (
                        <div className="w-10 h-14 bg-slate-600 rounded flex items-center justify-center"><Film size={16}/></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate flex justify-between">
                          <span>{m.title}</span>
                          <span className="text-yellow-500 text-xs flex items-center gap-0.5"><Star size={10} fill="currentColor"/> {m.doubanRating?.toFixed(1)}</span>
                        </div>
                        <div className="text-slate-500 text-xs flex gap-2">
                            <span>{m.year}</span>
                            <span>{m.type === 'Movie' ? '电影' : '剧集'}</span>
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
                    value={formData.type} 
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
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">观看日期</label>
                <input 
                  type="date"
                  value={formData.watchDate} 
                  onChange={e => setFormData({...formData, watchDate: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" 
                />
              </div>
            </div>

            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-slate-400 mb-1 flex justify-between">
                  <span>个人评分 (0-10)</span>
                  <span className="text-yellow-400 font-bold">{formData.rating}</span>
                </label>
                <input 
                  type="range" min="0" max="10" step="0.5"
                  value={formData.rating} 
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
                    value={formData.coverUrl} 
                    onChange={e => setFormData({...formData, coverUrl: e.target.value})}
                    placeholder="https://..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm" 
                  />
                  {formData.coverUrl && <img src={formData.coverUrl} className="w-10 h-10 object-cover rounded border border-slate-600" alt="preview" />}
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">主演 (逗号分隔)</label>
                  <input 
                    value={formData.actors?.join(', ') || ''} 
                    onChange={e => setFormData({...formData, actors: e.target.value.split(',').map(s=>s.trim())})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm" 
                  />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">观影笔记 / 简介</label>
            <textarea 
              value={formData.comment}
              onChange={e => setFormData({...formData, comment: e.target.value})}
              placeholder="记录你的观影感受或剧情简介..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white h-32 focus:ring-2 focus:ring-blue-500 outline-none text-sm leading-relaxed"
            />
          </div>
          
          <button 
            onClick={() => {
              if(!formData.title) return alert('请输入标题');
              // 调用父组件的 onSave
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
  // --- State Management ---
  const [movies, setMovies] = useState<MovieRecord[]>([]);
  const [view, setView] = useState<'dashboard' | 'list' | 'ai'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<MovieRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // 移除父组件中的 isSearchingTMDB 状态，因为已移动到子组件
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'All',
    sort: 'date_desc'
  });
  
  // Settings State
  const [appSettings, setAppSettings] = useState<AppSettings>({
    tmdbApiKey: '',
    aiProvider: 'Mock',
    aiApiKey: '',
    aiModel: 'gpt-3.5-turbo'
  });

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 初始化加载 (带错误处理)
  useEffect(() => {
    const loadData = () => {
      // 1. Load Movies
      try {
        const savedData = localStorage.getItem('cinetrack_data');
        if (savedData && savedData !== "undefined" && savedData !== "null") {
          const parsed = JSON.parse(savedData);
          if (Array.isArray(parsed)) {
            setMovies(parsed);
          } else {
            throw new Error("Invalid data format");
          }
        } else {
          // 初始演示数据
          throw new Error("No data");
        }
      } catch (e) {
        console.warn("Initializing with default data due to storage miss/error:", e);
        const initialData: MovieRecord[] = [
          {
            id: '1',
            title: '星际穿越',
            originalTitle: 'Interstellar',
            type: 'Movie',
            coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=300',
            rating: 10,
            doubanRating: 9.4,
            watchDate: '2023-11-15',
            tags: ['科幻', '太空', '亲情'],
            comment: '震撼人心的视听盛宴，汉斯季默的配乐太神了。',
            actors: ['马修·麦康纳', '安妮·海瑟薇'],
            year: 2014,
            duration: 169
          },
          {
            id: '2',
            title: '绝命毒师',
            originalTitle: 'Breaking Bad',
            type: 'Series',
            coverUrl: 'https://images.unsplash.com/photo-1568819317551-31051b37f69f?auto=format&fit=crop&q=80&w=300',
            rating: 9.5,
            doubanRating: 9.8,
            watchDate: '2023-10-01',
            tags: ['犯罪', '剧情'],
            comment: '目前看过最完美的剧集，没有之一。',
            actors: ['布莱恩·科兰斯顿', '亚伦·保尔'],
            year: 2008
          }
        ];
        setMovies(initialData);
      }

      // 2. Load Settings
      try {
        const savedSettings = localStorage.getItem('cinetrack_settings');
        if (savedSettings) {
          setAppSettings(JSON.parse(savedSettings));
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    };

    loadData();
  }, []);

  // 持久化存储
  useEffect(() => {
    if (movies.length > 0) {
      localStorage.setItem('cinetrack_data', JSON.stringify(movies));
    }
  }, [movies]);

  const saveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem('cinetrack_settings', JSON.stringify(newSettings));
    setIsSettingsOpen(false);
  };

  // --- Import / Export Handlers ---
  
  const handleExportData = () => {
    const dataStr = JSON.stringify(movies, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cinetrack_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        
        if (Array.isArray(parsedData)) {
          // 简单的校验，检查第一条数据是否有必须字段
          if (parsedData.length > 0 && (!parsedData[0].title || !parsedData[0].id)) {
            alert('文件格式似乎不正确，无法识别为 CineTrack 备份文件。');
            return;
          }

          if (confirm(`准备导入 ${parsedData.length} 条记录。这将合并到现有数据中（自动跳过重复 ID）。是否继续？`)) {
            setMovies(prev => {
              const currentIds = new Set(prev.map(p => p.id));
              // 过滤掉已存在的 ID，防止重复
              const newRecords = parsedData.filter((p: any) => !currentIds.has(p.id));
              
              if (newRecords.length === 0) {
                alert('导入完成：所有记录已存在，无需更新。');
                return prev;
              }
              
              alert(`成功导入 ${newRecords.length} 条新记录！`);
              return [...newRecords, ...prev];
            });
            setIsSettingsOpen(false); // 关闭设置弹窗
          }
        } else {
          alert('文件格式错误：必须是 JSON 数组');
        }
      } catch (err) {
        console.error(err);
        alert('无法解析文件，请确保它是有效的 JSON 格式。');
      }
    };
    reader.readAsText(file);
    // 重置 input 以便允许重复上传同一文件
    event.target.value = '';
  };


  // --- Logic Helpers ---

  const handleSaveMovie = (movie: MovieRecord) => {
    if (editingMovie) {
      setMovies(movies.map(m => m.id === movie.id ? movie : m));
    } else {
      setMovies([movie, ...movies]);
    }
    setIsModalOpen(false);
    setEditingMovie(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条观影记录吗？')) {
      setMovies(movies.filter(m => m.id !== id));
    }
  };

  const filteredMovies = useMemo(() => {
    return movies
      .filter(m => {
        const matchSearch = m.title.toLowerCase().includes(filters.search.toLowerCase()) || 
                          m.tags.some(t => t.toLowerCase().includes(filters.search.toLowerCase()));
        const matchType = filters.type === 'All' || m.type === filters.type;
        return matchSearch && matchType;
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
  }, [movies, filters]);

  const stats = useMemo(() => {
    const total = movies.length;
    const avgRating = total > 0 ? (movies.reduce((acc, cur) => acc + cur.rating, 0) / total).toFixed(1) : '0.0';
    const typeCount: Record<string, number> = {};
    movies.forEach(m => { typeCount[m.type] = (typeCount[m.type] || 0) + 1; });
    
    // 简单的月度趋势 (最近6个月)
    const last6Months = Array.from({length: 6}, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7); // YYYY-MM
    }).reverse();
    
    const trendData = last6Months.map(month => {
      return movies.filter(m => m.watchDate.startsWith(month)).length;
    });

    return { total, avgRating, typeCount, trendData, labels: last6Months };
  }, [movies]);

  // AI Analysis - Real API Implementation
  const runAiAnalysis = async () => {
    if (movies.length === 0) {
        alert("请先添加一些观影记录再进行分析。");
        return;
    }

    setIsAnalyzing(true);
    setAiAnalysis(null);
    
    const isMock = appSettings.aiProvider === 'Mock';
    
    if (!isMock && !appSettings.aiApiKey) {
        alert(`请先在设置中配置 ${appSettings.aiProvider} 的 API Key`);
        setIsAnalyzing(false);
        return;
    }

    try {
        // Data Preparation
        const movieDataStr = movies.map(m => 
            `《${m.title}》(${m.year}) - 评分:${m.rating}/10, 类型:${m.type}, 标签:[${m.tags.join(', ')}], 笔记:${m.comment || '无'}`
        ).join('\n');

        const systemPrompt = `你是一位资深的电影评论家和心理分析师。请根据用户提供的观影记录数据，进行深度分析。
        
请输出包含以下部分的Markdown格式报告：
1. **观影画像**：用几个关键词概括用户的观影品味。
2. **偏好深度解析**：分析用户喜欢的题材、导演风格、演员或叙事节奏。结合评分高低分析用户的审美标准。
3. **观影建议**：推荐3部用户可能喜欢但尚未观看的影片/剧集，并简述推荐理由。

请保持语气专业、风趣且富有洞察力。`;

        const userPrompt = `这是我的观影记录列表：\n${movieDataStr}`;

        let result = '';

        if (isMock) {
            // Mock Simulation
            await new Promise(resolve => setTimeout(resolve, 2000));
            const favoriteType = Object.entries(stats.typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '未知';
            const avg = parseFloat(stats.avgRating as string);
            result = `### 🎬 观影人格分析报告 (模拟)
          
**核心画像**: ${favoriteType} 鉴赏家
**评分风格**: ${avg > 8.5 ? '慷慨激昂 (偏好高分)' : avg > 7 ? '理性客观' : '挑剔严苛'}

**观影偏好深度解析**:
根据您最近的 ${stats.total} 条观影记录，您对 **${favoriteType}** 类型的影片表现出极高的忠诚度。您的平均评分为 ${avg}。

**🤖 Mock AI 推荐**:
基于您观看过《${movies[0]?.title || '...'}》，推荐关注 A24 出品的独立电影。`;
        } else {
            // Real API Call
            let endpoint = '';
            let headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            let body: any = {};

            if (appSettings.aiProvider === 'OpenAI' || appSettings.aiProvider === 'DeepSeek') {
                endpoint = appSettings.aiProvider === 'OpenAI' 
                    ? 'https://api.openai.com/v1/chat/completions'
                    : 'https://api.deepseek.com/chat/completions';
                
                headers['Authorization'] = `Bearer ${appSettings.aiApiKey}`;
                
                const model = appSettings.aiModel || (appSettings.aiProvider === 'OpenAI' ? 'gpt-3.5-turbo' : 'deepseek-chat');
                
                body = {
                    model: model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.7
                };
            } else if (appSettings.aiProvider === 'Gemini') {
                const model = appSettings.aiModel || 'gemini-1.5-flash';
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${appSettings.aiApiKey}`;
                
                body = {
                    contents: [{
                        parts: [{ text: systemPrompt + "\n\n" + userPrompt }]
                    }]
                };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || data.error?.code || 'API Request Failed');
            }

            if (appSettings.aiProvider === 'Gemini') {
                result = data.candidates?.[0]?.content?.parts?.[0]?.text || "未获取到有效内容";
            } else {
                result = data.choices?.[0]?.message?.content || "未获取到有效内容";
            }
        }

        setAiAnalysis(result);

    } catch (error: any) {
        console.error("Analysis Error:", error);
        setAiAnalysis(`### 🚫 分析失败\n\n错误信息：${error.message}\n\n如果您使用的是浏览器直接运行，可能会遇到跨域(CORS)限制。建议检查 API Key 是否正确，或尝试使用支持 CORS 的 API 服务。`);
    } finally {
        setIsAnalyzing(false);
    }
  };

  // --- Sub-Components ---

  const SettingsModal = () => {
    if (!isSettingsOpen) return null;
    
    // Local state for the form inside modal
    const [localSettings, setLocalSettings] = useState<AppSettings>(appSettings);
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="text-slate-400" />
              系统设置
            </h2>
            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white transition">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

            {/* Data Management Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <FileJson size={16} /> 数据管理 (导入/导出)
              </h3>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
                <div className="flex gap-4">
                  <button 
                    onClick={handleExportData}
                    className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition group"
                  >
                    <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition">
                      <Download size={24} className="text-blue-500" />
                    </div>
                    <span className="text-sm text-slate-300">导出备份 (.json)</span>
                  </button>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition group"
                  >
                    <div className="p-3 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition">
                      <Upload size={24} className="text-green-500" />
                    </div>
                    <span className="text-sm text-slate-300">导入备份</span>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImportData}
                      accept=".json" 
                      className="hidden" 
                    />
                  </button>
                </div>
                <div className="flex items-start gap-2 text-[10px] text-slate-500 bg-slate-800/50 p-2 rounded">
                   <AlertCircle size={12} className="mt-0.5" />
                   <p>导入操作将自动合并数据。如果导入文件中的记录 ID 与现有记录重复，系统将保留现有记录，跳过导入。</p>
                </div>
              </div>
            </div>
            
            <div className="h-px bg-slate-700/50 my-2"></div>

            {/* API Section (TMDB) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
                <Globe size={16} /> 影视数据源 (TMDB API)
              </h3>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">TMDB API Read Access Token / Key</label>
                  <input 
                    type="password"
                    value={localSettings.tmdbApiKey}
                    onChange={(e) => setLocalSettings({...localSettings, tmdbApiKey: e.target.value})}
                    placeholder="eyJhbGciOiJIUzI1NiJ..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-green-500 outline-none transition"
                  />
                  <div className="flex justify-between items-start mt-2">
                    <p className="text-[10px] text-slate-500 max-w-[80%]">
                      * 我们使用 TMDB 作为数据源替代豆瓣。请填入 API Key 以启用实时搜索。<br/>
                      若未配置，将使用内置的 Mock 演示数据。
                    </p>
                    <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      获取 Key <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* LLM API Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <Cpu size={16} /> AI 模型服务商
              </h3>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">服务提供商</label>
                  <select 
                    value={localSettings.aiProvider}
                    onChange={(e) => setLocalSettings({...localSettings, aiProvider: e.target.value as any})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none transition"
                  >
                    <option value="Mock">内置模拟 (无需 Key)</option>
                    <option value="OpenAI">OpenAI (GPT)</option>
                    <option value="Gemini">Google Gemini</option>
                    <option value="DeepSeek">DeepSeek (深度求索)</option>
                  </select>
                </div>

                {localSettings.aiProvider !== 'Mock' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">API Key</label>
                      <input 
                        type="password"
                        value={localSettings.aiApiKey}
                        onChange={(e) => setLocalSettings({...localSettings, aiApiKey: e.target.value})}
                        placeholder={`sk-... (${localSettings.aiProvider} Key)`}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">模型名称 (Model Name)</label>
                      <input 
                        type="text"
                        value={localSettings.aiModel}
                        onChange={(e) => setLocalSettings({...localSettings, aiModel: e.target.value})}
                        placeholder="例如: gpt-4, gemini-pro"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none transition"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="p-6 border-t border-slate-700 bg-slate-800 flex justify-end gap-3">
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
            >
              取消
            </button>
            <button 
              onClick={() => saveSettings(localSettings)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-blue-900/20"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Layout ---
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

          <div className="space-y-4 pt-6 border-t border-slate-800">
             <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition text-sm">
              <Settings size={18} /> 设置与 API
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
                  <h1 className="text-3xl font-bold text-white mb-2">欢迎回来, 影迷</h1>
                  <p className="text-slate-400">这是您的观影数据概览。</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg"><Film className="text-blue-500" size={20} /></div>
                    <span className="text-xs text-green-400 font-medium">+2 本月</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-slate-500">总观影数量</div>
                </div>
                
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-yellow-500/10 rounded-lg"><Star className="text-yellow-500" size={20} /></div>
                  </div>
                  <div className="text-3xl font-bold text-white">{stats.avgRating}</div>
                  <div className="text-sm text-slate-500">平均评分</div>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-purple-500/10 rounded-lg"><Calendar className="text-purple-500" size={20} /></div>
                  </div>
                  <div className="text-3xl font-bold text-white">128<span className="text-sm font-normal text-slate-500">h</span></div>
                  <div className="text-sm text-slate-500">估算时长</div>
                </div>
                
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-pink-500/10 rounded-lg"><TrendingUp className="text-pink-500" size={20} /></div>
                  </div>
                  <div className="text-lg font-bold text-white truncate">{Object.entries(stats.typeCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || '暂无'}</div>
                  <div className="text-sm text-slate-500">最爱类型</div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart (Simple SVG implementation) */}
                <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800">
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><BarChart3 size={18} /> 近半年观影趋势</h3>
                  <div className="h-64 flex items-end justify-between gap-2 px-2">
                    {stats.trendData.map((val, idx) => {
                      const max = Math.max(...stats.trendData, 1);
                      const height = (val / max) * 100;
                      return (
                        <div key={idx} className="flex flex-col items-center gap-2 w-full group">
                          <div className="relative w-full flex items-end justify-center h-full">
                            <div 
                              style={{ height: `${height}%` }} 
                              className="w-full max-w-[40px] bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm opacity-80 group-hover:opacity-100 transition-all duration-300 relative"
                            >
                               <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition">{val}部</div>
                            </div>
                          </div>
                          <span className="text-xs text-slate-500">{stats.labels[idx].split('-')[1]}月</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Distribution Chart */}
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                   <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><PieChart size={18} /> 类型分布</h3>
                   <DonutChart 
                      data={[
                        { label: 'Movie', value: stats.typeCount['Movie'] || 0, color: '#3b82f6' },
                        { label: 'Series', value: stats.typeCount['Series'] || 0, color: '#8b5cf6' },
                        { label: 'Anime', value: stats.typeCount['Anime'] || 0, color: '#ec4899' },
                        { label: 'Doc', value: stats.typeCount['Documentary'] || 0, color: '#10b981' },
                      ]} 
                   />
                   <div className="mt-6 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div>电影</span>
                        <span className="text-slate-400">{stats.typeCount['Movie'] || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div>剧集</span>
                        <span className="text-slate-400">{stats.typeCount['Series'] || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-pink-500"></div>动画</span>
                        <span className="text-slate-400">{stats.typeCount['Anime'] || 0}</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* View: List */}
          {view === 'list' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              
              {/* 优化后的顶部筛选栏布局 */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
                     <ListIcon size={20} className="text-white" />
                   </div>
                   <h1 className="text-2xl font-bold text-white">所有记录 <span className="text-slate-500 text-lg font-normal">({filteredMovies.length})</span></h1>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-auto">
                   <div className="relative group">
                    <Search className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-blue-500 transition" size={18} />
                    <input 
                      type="text" 
                      placeholder="搜索影片..." 
                      value={filters.search}
                      onChange={e => setFilters({...filters, search: e.target.value})}
                      className="bg-slate-950 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white w-full focus:border-blue-500 outline-none transition"
                    />
                   </div>
                   
                   <select 
                      value={filters.type}
                      onChange={e => setFilters({...filters, type: e.target.value as any})}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500 transition appearance-none cursor-pointer hover:bg-slate-900"
                    >
                      <option value="All">所有类型</option>
                      <option value="Movie">电影</option>
                      <option value="Series">剧集</option>
                      <option value="Anime">动画</option>
                   </select>

                   <select 
                      value={filters.sort}
                      onChange={e => setFilters({...filters, sort: e.target.value as any})}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500 transition appearance-none cursor-pointer hover:bg-slate-900"
                    >
                      <option value="date_desc">日期 (新→旧)</option>
                      <option value="date_asc">日期 (旧→新)</option>
                      <option value="rating_desc">评分 (高→低)</option>
                      <option value="rating_asc">评分 (低→高)</option>
                   </select>
                </div>
              </div>

              {/* 优化后的网格布局 - 卡片信息增强版 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMovies.map(movie => (
                  <div 
                    key={movie.id} 
                    onClick={() => { setEditingMovie(movie); setIsModalOpen(true); }}
                    className="group bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:shadow-2xl hover:shadow-blue-900/10 hover:border-slate-600 transition duration-300 flex flex-col cursor-pointer h-full"
                  >
                    {/* 图片区域：维持 2:3 适合海报 */}
                    <div className="relative w-full aspect-[2/3] overflow-hidden bg-slate-800 shrink-0">
                      {movie.coverUrl ? (
                         <img src={movie.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={movie.title} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-600 bg-slate-800"><Film size={40} /></div>
                      )}
                      
                      {/* 右上角评分 */}
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 shadow-lg border border-white/10">
                        <Star size={14} className="text-yellow-400 fill-current" />
                        <span className="text-white font-bold text-sm">{movie.rating}</span>
                      </div>

                      {/* 左上角年份 */}
                       {movie.year && (
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs text-white font-medium border border-white/10">
                          {movie.year}
                        </div>
                      )}
                      
                      {/* 底部渐变遮罩 & 标题 */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>
                      <div className="absolute bottom-0 left-0 p-4 w-full">
                         <div className="text-xs text-blue-400 font-medium mb-1 uppercase tracking-wider bg-blue-900/30 w-fit px-2 py-0.5 rounded border border-blue-500/30 backdrop-blur-sm">{movie.type}</div>
                         <h3 className="text-lg font-bold text-white truncate drop-shadow-md">{movie.title}</h3>
                         <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 font-medium opacity-90">
                           <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(movie.watchDate)}</span>
                           {movie.duration && <span className="flex items-center gap-1"><Clock size={12}/> {movie.duration}m</span>}
                         </div>
                      </div>
                    </div>
                    
                    {/* 内容区域：信息增强 */}
                    <div className="p-4 flex-1 flex flex-col justify-between bg-slate-900">
                      <div className="mb-4 space-y-3">
                        {/* 演员信息 (新增) */}
                        {movie.actors && movie.actors.length > 0 && (
                          <div className="flex items-start gap-2 text-xs text-slate-500">
                            <Users size={14} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-1">{movie.actors.join(' / ')}</span>
                          </div>
                        )}
                        
                        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                          {movie.comment || <span className="italic text-slate-600">暂无笔记...</span>}
                        </p>

                        {/* 标签 */}
                        {movie.tags && movie.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {movie.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 border-t border-slate-800 mt-auto">
                         <button 
                           onClick={(e) => { 
                             e.stopPropagation(); 
                             setEditingMovie(movie); 
                             setIsModalOpen(true); 
                           }} 
                           className="text-slate-400 hover:text-blue-400 text-xs flex items-center gap-1.5 transition py-1 px-2 rounded hover:bg-slate-800"
                         >
                           <Edit2 size={14} /> 编辑
                         </button>
                         <button 
                           onClick={(e) => { 
                             e.stopPropagation(); 
                             handleDelete(movie.id); 
                           }} 
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
                    <p className="text-slate-500 mt-2">尝试更换搜索关键词或添加新记录</p>
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
                   <div className="prose prose-invert max-w-none">
                     <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-bold text-purple-400">分析完成</h3>
                        <button onClick={() => setAiAnalysis(null)} className="text-xs text-slate-500 hover:text-white">重新分析</button>
                     </div>
                     <div className="whitespace-pre-line text-slate-300 leading-relaxed bg-slate-950/50 p-6 rounded-xl border border-slate-800/50">
                       {aiAnalysis}
                     </div>
                     <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-sm text-slate-500">
                       <span>数据来源: 本地记录</span>
                       <span>模型服务: {appSettings.aiProvider}</span>
                     </div>
                   </div>
                 )}
               </div>
            </div>
          )}

        </main>
      </div>

      {/* Modals */}
      <AddEditModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMovie}
        editingMovie={editingMovie}
        appSettings={appSettings}
      />
      <SettingsModal />
      
    </div>
  );
}