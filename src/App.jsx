import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';
import { 
  Search, MessageSquare, User, LogOut, Heart, Hand, 
  Settings, BarChart3, ShieldCheck, Zap, Coffee, 
  Music, Moon, Sparkles, Send, CheckCheck, MapPin,
  Calendar, Info, ChevronRight, Filter, Star, X, 
  Flame, Camera, Bell
} from 'lucide-react';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
const ADMIN_PASSWORD2 = import.meta.env.VITE_ADMIN_PASSWORD2;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const initialProfile = { name: '', age: '', city: '', gender: '', hobbies: '', photo_url: '' };
const initialMemberProfile = { age: '', hobbies: '', city: '', photo_url: '', status_emoji: '🙂' };

const CITY_LIST = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Eskişehir','Muğla','Mersin','Adana','Konya','Samsun','Trabzon','Gaziantep','Kayseri','Kocaeli','Tekirdağ','Çanakkale','Aydın','Balıkesir','Denizli','Sakarya','Hatay','Manisa','Edirne','Bolu','Kırklareli','Sinop','Rize','Giresun','Ordu'];
const QUICK_REPLIES = ['Merhaba! 🌸', 'Naber, günün nasıl geçti?', 'Fotoğrafın çok güzel 😍', 'Kahve içelim mi? ☕'];
const BULK_TEMPLATES = ['Merhaba! 👋', 'Naber, günün nasıl?', 'Müsaitsen yaz ✨'];

// --- Yardımcı Fonksiyonlar ---
function hashToInt(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash);
}

function buildHourlyOnlineMap(profiles, hourKey) {
  const map = {};
  const list = profiles || [];
  if (!list.length) return map;
  const targetOnlineCount = Math.min(list.length, Math.floor(list.length / 2) + 3);
  const ranked = [...list]
    .map((profile) => ({
      id: profile.id,
      score: hashToInt(`${hourKey}-${profile.id}`),
    }))
    .sort((a, b) => a.score - b.score);
  ranked.forEach((item, index) => {
    map[item.id] = index < targetOnlineCount;
  });
  return map;
}

export default function App() {
  const [status, setStatus] = useState('');
  const {
    mode, setMode, authForm, setAuthForm, loading,
    memberSession, isAdmin, signIn, signUp, signOut,
  } = useAuth({ adminPasswords: [ADMIN_PASSWORD, ADMIN_PASSWORD2], setStatus });

  const [virtualProfiles, setVirtualProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [profileForm, setProfileForm] = useState(initialProfile);
  const [incomingThreads, setIncomingThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [adminReply, setAdminReply] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [unreadByProfile, setUnreadByProfile] = useState({});
  const [adminUnreadByThread, setAdminUnreadByThread] = useState({});
  const [typingLabel, setTypingLabel] = useState('');
  const [onlineProfiles, setOnlineProfiles] = useState({});
  const [memberProfile, setMemberProfile] = useState(initialMemberProfile);
  const [bulkTemplate, setBulkTemplate] = useState(BULK_TEMPLATES[0]);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [adminTab, setAdminTab] = useState('chat');
  const [quickFactsText, setQuickFactsText] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [profileSearch, setProfileSearch] = useState('');
  const [discoverSort, setDiscoverSort] = useState('match');
  const [likedProfiles, setLikedProfiles] = useState({});
  const [heartedProfiles, setHeartedProfiles] = useState({});
  const [wavedProfiles, setWavedProfiles] = useState({});
  const [userView, setUserView] = useState('discover');
  const [hourKey, setHourKey] = useState(() => new Date().toISOString().slice(0, 13));

  const chatBoxRef = useRef(null);
  const adminChatBoxRef = useRef(null);

  // --- Hesaplamalı Değerler ---
  const selectedProfile = useMemo(() => virtualProfiles.find((p) => p.id === selectedProfileId) || null, [selectedProfileId, virtualProfiles]);
  const profileById = useMemo(() => Object.fromEntries(virtualProfiles.map((p) => [p.id, p])), [virtualProfiles]);
  const selectedThreadProfile = useMemo(() => (selectedThread ? profileById[selectedThread.virtual_profile_id] : null), [selectedThread, profileById]);

  const loggedIn = !!memberSession || isAdmin;

  const effectiveOnlineProfiles = useMemo(
    () => (isAdmin ? onlineProfiles : buildHourlyOnlineMap(virtualProfiles, hourKey)),
    [isAdmin, onlineProfiles, virtualProfiles, hourKey]
  );

  const discoverProfiles = useMemo(() => {
    const filtered = virtualProfiles.filter((profile) => {
      const cityOk = cityFilter ? (profile.city || '').toLowerCase().includes(cityFilter.toLowerCase()) : true;
      const genderOk = genderFilter === 'all' ? true : (profile.gender || '').toLowerCase() === genderFilter.toLowerCase();
      const text = `${profile.name || ''} ${profile.city || ''} ${profile.hobbies || ''}`.toLowerCase();
      const searchOk = profileSearch ? text.includes(profileSearch.toLowerCase()) : true;
      return cityOk && genderOk && searchOk;
    });

    const score = (p) => {
      if (!memberProfile?.hobbies) return 0;
      const a = new Set((p.hobbies || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean));
      const b = new Set((memberProfile.hobbies || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean));
      if (!a.size || !b.size) return 0;
      let common = 0;
      a.forEach((item) => { if (b.has(item)) common += 1; });
      return Math.round((common / Math.max(a.size, b.size)) * 100);
    };

    return filtered.sort((p1, p2) => {
      if (discoverSort === 'newest') return new Date(p2.created_at || 0) - new Date(p1.created_at || 0);
      if (discoverSort === 'age_asc') return Number(p1.age || 0) - Number(p2.age || 0);
      if (discoverSort === 'online') return Number(!!effectiveOnlineProfiles[p2.id]) - Number(!!effectiveOnlineProfiles[p1.id]);
      return score(p2) - score(p1);
    });
  }, [virtualProfiles, cityFilter, genderFilter, profileSearch, memberProfile.hobbies, discoverSort, effectiveOnlineProfiles]);

  const interestScore = useMemo(() => {
    if (!selectedProfileId) return 0;
    const weekKey = new Date().toISOString().slice(0, 10);
    const seed = `${weekKey}-${memberSession?.id || 'guest'}-${selectedProfileId}`;
    return 70 + (hashToInt(seed) % 31);
  }, [selectedProfileId, memberSession?.id]);

  const totalUnreadCount = useMemo(() => Object.values(unreadByProfile).reduce((sum, count) => sum + Number(count || 0), 0), [unreadByProfile]);

  // --- Yan Etkiler ---
  useEffect(() => {
    if (!loggedIn || isAdmin) return;
    const tick = () => {
      const nowHour = new Date().toISOString().slice(0, 13);
      setHourKey((prev) => (prev === nowHour ? prev : nowHour));
    };
    const interval = window.setInterval(tick, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [loggedIn, isAdmin]);

  useEffect(() => {
    if (!loggedIn) return;
    fetchVirtualProfiles();
    if (!isAdmin) fetchUnreadCounts();
    if (isAdmin) fetchIncomingThreads();
  }, [loggedIn, isAdmin, memberSession]);

  useEffect(() => {
    if (!memberSession || !selectedProfileId || isAdmin || userView !== 'chat') return;
    fetchMessages(selectedProfileId);
    setUnreadByProfile((prev) => ({ ...prev, [selectedProfileId]: 0 }));
  }, [memberSession, selectedProfileId, isAdmin, userView]);

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [messages]);

  // --- Veri Fonksiyonları ---
  async function fetchVirtualProfiles() {
    const { data, error } = await supabase.from('virtual_profiles').select('*').order('created_at', { ascending: true });
    if (!error && data) setVirtualProfiles(data);
    if (data?.length && !selectedProfileId) setSelectedProfileId(data[0].id);
  }

  async function fetchUnreadCounts() {
    if (!memberSession || isAdmin) return;
    const { data, error } = await supabase.from('messages').select('virtual_profile_id').eq('member_id', memberSession.id).eq('sender_role', 'virtual').eq('seen_by_member', false);
    if (!error && data) {
      const counts = data.reduce((acc, row) => {
        acc[row.virtual_profile_id] = (acc[row.virtual_profile_id] || 0) + 1;
        return acc;
      }, {});
      setUnreadByProfile(counts);
    }
  }

  async function fetchMessages(profileId) {
    const { data, error } = await supabase.from('messages').select('*').eq('virtual_profile_id', profileId).eq('member_id', memberSession.id).order('created_at', { ascending: true });
    if (!error) {
      setMessages(data || []);
      await supabase.from('messages').update({ seen_by_member: true, seen_by_member_at: new Date().toISOString() }).eq('virtual_profile_id', profileId).eq('member_id', memberSession.id).eq('sender_role', 'virtual').eq('seen_by_member', false);
    }
  }

  async function fetchIncomingThreads() {
    // Admin tarafı veritabanı mantığı burada yer alır...
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedProfileId || !memberSession) return;
    const { error } = await supabase.from('messages').insert({
      member_id: memberSession.id,
      virtual_profile_id: selectedProfileId,
      sender_role: 'member',
      content: newMessage.trim()
    });
    if (!error) {
      setNewMessage('');
      fetchMessages(selectedProfileId);
    }
  }

  const openChatWithProfile = (id) => {
    setSelectedProfileId(id);
    setUserView('chat');
  };

  const handleSignOut = () => signOut(() => {
    setUserView('discover');
    setMessages([]);
    setSelectedProfileId(null);
  });

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  // --- Navigasyon Bileşeni ---
  const NavItem = ({ active, onClick, icon: Icon, label, badge }) => (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-300 transform ${
        active 
          ? 'bg-gradient-to-r from-rose-500 via-rose-600 to-orange-500 text-white shadow-lg shadow-rose-500/30 scale-105 ring-1 ring-white/20' 
          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white ring-1 ring-white/5'
      }`}
    >
      <Icon size={18} strokeWidth={2.5} />
      <span className="hidden lg:inline">{label}</span>
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white shadow-lg ring-2 ring-[#05060f]">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#05060f] font-sans text-slate-200 selection:bg-rose-500/30 selection:text-white overflow-x-hidden">
      {/* Premium Arka Plan Katmanları */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-rose-600/10 blur-[120px] animate-pulse" />
        <div className="absolute -right-[10%] bottom-0 h-[700px] w-[700px] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.2)_0%,transparent_70%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#05060f]/60 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/20">
              <Flame className="text-white" size={22} fill="white" />
            </div>
            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-2xl font-black tracking-tight text-transparent">
              Flort<span className="text-rose-500">.</span>
            </h1>
          </div>

          <nav className="flex items-center gap-2 md:gap-4">
            {loggedIn && !isAdmin ? (
              <>
                <div className="flex gap-2">
                  <NavItem icon={Zap} label="Keşfet" active={userView === 'discover'} onClick={() => setUserView('discover')} />
                  <NavItem icon={MessageSquare} label="Mesajlar" active={userView === 'chat'} onClick={() => setUserView('chat')} badge={totalUnreadCount} />
                  <NavItem icon={User} label="Profilim" active={userView === 'profile'} onClick={() => setUserView('profile')} />
                </div>
                <div className="h-8 w-[1px] bg-white/10 mx-1 hidden md:block" />
                <button 
                  onClick={handleSignOut} 
                  className="group rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-400 transition-all hover:bg-rose-500 hover:text-white hover:border-rose-500"
                  title="Çıkış Yap"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : !loggedIn && (
              <button 
                onClick={() => setMode(mode === 'user' ? 'admin' : 'user')}
                className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 ring-1 ring-white/5 transition hover:text-rose-400"
              >
                {mode === 'user' ? <ShieldCheck size={16} /> : <User size={16} />}
                {mode === 'user' ? 'Yönetici' : 'Üye Girişi'}
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 md:px-8">
        {!loggedIn ? (
          /* MODER GİRİŞ EKRANI */
          <section className="mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-3xl lg:flex animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col justify-center space-y-10 p-8 lg:w-1/2 md:p-12">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-rose-400 ring-1 ring-rose-500/20">
                  <Sparkles size={14} fill="currentColor" /> Premium Social Deneyimi
                </div>
                <h2 className="text-4xl font-black leading-tight text-white md:text-5xl">
                  Ruh Eşini <br /> 
                  <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">Burada Keşfet.</span>
                </h2>
                <p className="text-lg text-slate-400 font-medium">
                  Hayatına yeni bir heyecan katmak için en doğru yerdesin. Hemen giriş yap ve sohbete başla.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-rose-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="Kullanıcı Adı"
                      disabled={mode === 'admin'}
                      value={mode === 'admin' ? '' : authForm.username}
                      onChange={(e) => setAuthForm(prev => ({...prev, username: e.target.value}))}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-4 text-white outline-none transition focus:border-rose-500/50 focus:bg-white/10 placeholder:text-slate-600"
                    />
                  </div>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-rose-500" size={18} />
                    <input 
                      type="password" 
                      placeholder="Şifre"
                      value={authForm.password}
                      onChange={(e) => setAuthForm(prev => ({...prev, password: e.target.value}))}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-4 text-white outline-none transition focus:border-rose-500/50 focus:bg-white/10 placeholder:text-slate-600"
                    />
                  </div>
                </div>
                <div className="grid gap-4 pt-4 sm:grid-cols-2">
                  <button onClick={signIn} disabled={loading} className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 px-8 py-4 font-black text-white shadow-xl shadow-rose-600/20 transition-all hover:scale-[1.02] active:scale-95">
                    <div className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />
                    {loading ? 'Yükleniyor...' : 'Giriş Yap'}
                    <ChevronRight size={18} strokeWidth={3} />
                  </button>
                  {mode !== 'admin' && (
                    <button onClick={signUp} disabled={loading} className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-black text-white transition-all hover:bg-white/10 active:scale-95">
                      Kayıt Ol
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:w-1/2 p-4">
              <div className="relative h-full overflow-hidden rounded-[2rem]">
                <img 
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80" 
                  className="h-full w-full object-cover" 
                  alt="Dating Premium"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05060f] via-transparent to-transparent" />
                <div className="absolute bottom-10 left-10 right-10 space-y-4">
                   <div className="flex gap-2">
                     <span className="rounded-full bg-rose-500/20 px-3 py-1 text-[10px] font-black text-rose-400 ring-1 ring-rose-500/50 backdrop-blur-md">LIVE 2.4K</span>
                     <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black text-white ring-1 ring-white/10 backdrop-blur-md">YAKINDA</span>
                   </div>
                   <h3 className="text-3xl font-black text-white italic leading-tight">"Flort sayesinde hayatımın aşkını buldum!"</h3>
                   <div className="flex items-center gap-3">
                      <div className="h-1 w-12 bg-rose-500 rounded-full" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Elif, 24 — İstanbul</p>
                   </div>
                </div>
              </div>
            </div>
          </section>
        ) : userView === 'discover' ? (
          /* KEŞFET EKRANI */
          <section className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-tight text-white">Yeni <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">Yüzler</span></h2>
                <p className="text-slate-400 font-medium italic">Seninle tanışmak isteyen popüler profiller.</p>
              </div>
              <div className="flex w-full flex-wrap gap-3 md:w-auto">
                <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-5 py-3 text-slate-300 md:w-72 ring-1 ring-white/5 focus-within:ring-rose-500/40 transition-all">
                  <Search size={18} className="text-slate-500" />
                  <input 
                    placeholder="Şehir veya hobi..." 
                    value={profileSearch}
                    onChange={(e) => setProfileSearch(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-2 py-2 ring-1 ring-white/5">
                   <select 
                    value={discoverSort} 
                    onChange={(e) => setDiscoverSort(e.target.value)}
                    className="bg-transparent px-3 py-1 text-[10px] font-black text-slate-400 outline-none uppercase tracking-widest cursor-pointer"
                  >
                    <option value="match">Uyum</option>
                    <option value="online">Aktif</option>
                    <option value="newest">Yeni</option>
                  </select>
                  <div className="h-4 w-[1px] bg-white/10" />
                  <button className="p-1.5 text-slate-500 hover:text-white transition"><Filter size={16} /></button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {discoverProfiles.map((profile) => (
                <article 
                  key={profile.id} 
                  className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-3 transition-all duration-500 hover:-translate-y-2 hover:border-rose-500/40 hover:bg-white/10 hover:shadow-[0_20px_50px_-20px_rgba(244,63,94,0.3)]"
                >
                  <div className="relative h-80 overflow-hidden rounded-[2rem] ring-1 ring-white/10">
                    {profile.photo_url ? (
                      <img src={profile.photo_url} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" alt={profile.name} />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-slate-800 text-5xl font-black text-slate-700">{profile.name?.[0]}</div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                    
                    <div className="absolute left-4 top-4 flex gap-2">
                      <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest backdrop-blur-xl ring-1 ${effectiveOnlineProfiles[profile.id] ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/50' : 'bg-slate-500/20 text-slate-400 ring-slate-500/50'}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${effectiveOnlineProfiles[profile.id] ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-500'}`} />
                        {effectiveOnlineProfiles[profile.id] ? 'Online' : 'Offline'}
                      </div>
                    </div>

                    <div className="absolute right-4 top-4">
                      <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[9px] font-black text-white ring-1 ring-white/20 backdrop-blur-md">
                        <Star size={10} fill="white" className="text-rose-400" /> %{interestScore} Uyum
                      </div>
                    </div>

                    <div className="absolute bottom-5 left-5 right-5 space-y-1">
                       <h3 className="text-2xl font-black tracking-tight text-white">{profile.name}, {profile.age}</h3>
                       <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                         <MapPin size={12} className="text-rose-500" /> {profile.city || 'Türkiye'}
                       </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4 px-2">
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {(profile.hobbies || '').split(',').slice(0, 2).map(h => h.trim() && (
                        <span key={h} className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-400 border border-white/5 transition hover:text-rose-300">#{h}</span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openChatWithProfile(profile.id)}
                        className="flex-1 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 py-3.5 text-sm font-black text-white shadow-lg transition-all duration-300 hover:brightness-110 active:scale-95"
                      >
                        Mesaj Gönder
                      </button>
                      <button 
                        onClick={() => setHeartedProfiles(s => ({...s, [profile.id]: !s[profile.id]}))}
                        className={`rounded-2xl border p-3.5 transition-all duration-300 ${heartedProfiles[profile.id] ? 'border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'border-white/10 bg-white/5 text-slate-400 hover:border-rose-500/50 hover:text-rose-500'}`}
                      >
                        <Heart size={20} fill={heartedProfiles[profile.id] ? "currentColor" : "none"} strokeWidth={heartedProfiles[profile.id] ? 0 : 2} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : userView === 'chat' ? (
          /* MESAJLAŞMA EKRANI */
          <section className="grid h-[78vh] gap-6 lg:grid-cols-[320px_1fr] animate-in fade-in slide-in-from-bottom-10 duration-700">
            {/* Yan Bar (Konuşmalar) */}
            <aside className="hidden flex-col rounded-[2.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur-3xl lg:flex ring-1 ring-white/5">
               <div className="flex items-center justify-between mb-6 px-4">
                 <h3 className="text-xl font-black text-white">Sohbetler</h3>
                 <button className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-white transition"><Bell size={18} /></button>
               </div>
               <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                  {virtualProfiles.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => setSelectedProfileId(p.id)}
                      className={`group flex w-full items-center gap-4 rounded-3xl p-3 transition-all duration-300 ${selectedProfileId === p.id ? 'bg-rose-600 text-white shadow-xl shadow-rose-600/20 ring-1 ring-white/20' : 'hover:bg-white/5 ring-1 ring-transparent hover:ring-white/10'}`}
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl shadow-lg">
                        {p.photo_url ? <img src={p.photo_url} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-slate-800 text-base font-black">{p.name?.[0]}</div>}
                        {effectiveOnlineProfiles[p.id] && <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[3px] border-[#05060f] bg-emerald-500" />}
                      </div>
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className={`text-sm font-black truncate ${selectedProfileId === p.id ? 'text-white' : 'text-slate-200'}`}>{p.name}</span>
                        <span className={`text-[10px] font-bold truncate ${selectedProfileId === p.id ? 'text-rose-100' : 'text-slate-500'}`}>{effectiveOnlineProfiles[p.id] ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
                      </div>
                      {unreadByProfile[p.id] > 0 && (
                        <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white shadow-lg ring-2 ring-white/20">{unreadByProfile[p.id]}</div>
                      )}
                    </button>
                  ))}
               </div>
            </aside>

            {/* Mesajlaşma Alanı */}
            <div className="flex flex-col rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl overflow-hidden ring-1 ring-white/5 relative">
              {selectedProfile ? (
                <>
                  <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-8 py-5">
                    <div className="flex items-center gap-4">
                       <div className="h-11 w-11 overflow-hidden rounded-2xl bg-slate-800 ring-2 ring-white/10 shadow-lg">
                         {selectedProfile.photo_url ? <img src={selectedProfile.photo_url} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-black">{selectedProfile.name?.[0]}</div>}
                       </div>
                       <div>
                         <h4 className="text-base font-black text-white">{selectedProfile.name}</h4>
                         <p className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                           <MapPin size={10} /> {selectedProfile.city || 'Türkiye'}
                         </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">Profil Uyumu</span>
                        <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-lg font-black text-transparent">%{interestScore}</span>
                      </div>
                      <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />
                      <button className="rounded-xl bg-white/5 p-2.5 text-slate-400 hover:text-white transition-all"><Info size={20} /></button>
                    </div>
                  </div>

                  <div ref={chatBoxRef} className="flex-1 space-y-6 overflow-y-auto p-8 custom-scrollbar">
                    {messages.length === 0 && (
                      <div className="flex h-full flex-col items-center justify-center space-y-6 text-center opacity-40">
                         <div className="rounded-full bg-white/5 p-10 ring-1 ring-white/10">
                            <MessageSquare size={48} strokeWidth={1.5} />
                         </div>
                         <p className="max-w-[240px] text-sm font-bold text-slate-400">İlk mesajı sen atarak aranızdaki buzları erit!</p>
                      </div>
                    )}
                    {messages.map((msg, i) => {
                      const isMe = msg.sender_role === 'member';
                      return (
                        <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                          <div className={`max-w-[70%] space-y-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`rounded-3xl px-5 py-3.5 text-sm font-medium leading-relaxed shadow-xl ${isMe ? 'rounded-tr-none bg-gradient-to-br from-rose-600 via-rose-700 to-rose-800 text-white shadow-rose-600/10' : 'rounded-tl-none bg-white/10 text-slate-200 border border-white/5 backdrop-blur-md'}`}>
                              {msg.content}
                            </div>
                            <div className={`flex items-center gap-2 px-2 text-[10px] font-bold text-slate-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              {formatTime(msg.created_at)}
                              {isMe && <CheckCheck size={14} className={msg.seen_by_admin ? 'text-rose-400' : 'text-slate-700'} strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-white/5 p-6 bg-black/40">
                    <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-2 transition-all focus-within:border-rose-500/50 focus-within:bg-white/10">
                      <div className="px-3 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"><Camera size={20} /></div>
                      <input 
                        placeholder="Bir şeyler yaz..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        className="flex-1 bg-transparent py-3 text-sm font-medium text-white outline-none"
                      />
                      <button 
                        onClick={sendMessage} 
                        className="flex h-11 w-11 items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30 transition duration-300 hover:scale-105 active:scale-95"
                      >
                        <Send size={20} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
                   <div className="relative">
                      <div className="absolute -inset-10 rounded-full bg-rose-500/10 blur-3xl animate-pulse" />
                      <div className="relative flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white/5 shadow-2xl ring-1 ring-white/10">
                        <MessageSquare size={42} className="text-rose-500" strokeWidth={1.5} />
                      </div>
                   </div>
                   <div className="space-y-3">
                     <h3 className="text-3xl font-black text-white tracking-tight">Mesajlaşmaya Başla</h3>
                     <p className="max-w-[300px] text-sm font-medium text-slate-500 leading-relaxed">Yeni bağlantılar kurmak için sol menüden birini seç ve hikayeni paylaşmaya başla.</p>
                   </div>
                   <button onClick={() => setUserView('discover')} className="rounded-2xl border border-white/10 bg-white/5 px-10 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition shadow-lg ring-1 ring-white/5">Hemen Keşfet</button>
                </div>
              )}
            </div>
          </section>
        ) : userView === 'profile' ? (
          /* PROFİL DÜZENLEME */
          <section className="mx-auto max-w-4xl space-y-8 animate-in zoom-in-95 duration-700">
             <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
               <aside className="space-y-6">
                 <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-8 text-center backdrop-blur-3xl shadow-2xl ring-1 ring-white/5">
                    <div className="relative mx-auto mb-6 h-44 w-44 p-1 rounded-[2.5rem] bg-gradient-to-br from-rose-500 via-rose-600 to-orange-500">
                      <div className="h-full w-full overflow-hidden rounded-[2.2rem] bg-[#05060f]">
                        {memberProfile.photo_url ? <img src={memberProfile.photo_url} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-slate-800 text-5xl font-black text-slate-700">{memberSession?.username?.[0]}</div>}
                      </div>
                      <label className="absolute -bottom-2 -right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl ring-4 ring-[#05060f] transition hover:scale-110 active:scale-95">
                        <Camera size={18} />
                        <input type="file" className="hidden" accept="image/*" />
                      </label>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">{memberSession?.username}</h3>
                    <div className="mt-2 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-500">
                       <Zap size={14} fill="currentColor" /> Premium Üye
                    </div>
                 </div>

                 <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8 backdrop-blur-3xl ring-1 ring-white/5">
                    <h4 className="mb-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Aktivite</h4>
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-slate-400 font-bold text-xs"><Flame size={14} className="text-orange-400" /> Puanım</div>
                         <span className="text-sm font-black text-white">1,240</span>
                       </div>
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-slate-400 font-bold text-xs"><Heart size={14} className="text-rose-400" /> Beğeniler</div>
                         <span className="text-sm font-black text-white">42</span>
                       </div>
                    </div>
                 </div>
               </aside>

               <div className="rounded-[3rem] border border-white/10 bg-white/5 p-10 backdrop-blur-3xl shadow-2xl ring-1 ring-white/5">
                  <h3 className="mb-10 text-3xl font-black text-white tracking-tight">Karakterini <span className="text-rose-500">Yansıt</span></h3>
                  <div className="grid gap-8 sm:grid-cols-2">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Yaşın</label>
                      <input 
                        type="number" 
                        value={memberProfile.age}
                        onChange={(e) => setMemberProfile(s => ({...s, age: e.target.value}))}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white outline-none focus:border-rose-500 transition focus:bg-white/10 placeholder:text-slate-700"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Şehrin</label>
                      <input 
                        type="text" 
                        value={memberProfile.city}
                        onChange={(e) => setMemberProfile(s => ({...s, city: e.target.value}))}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white outline-none focus:border-rose-500 transition focus:bg-white/10 placeholder:text-slate-700"
                      />
                    </div>
                    <div className="space-y-3 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">İlgi Alanların & Bio</label>
                      <textarea 
                        value={memberProfile.hobbies}
                        onChange={(e) => setMemberProfile(s => ({...s, hobbies: e.target.value}))}
                        placeholder="Nelerden hoşlanırsın?"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white outline-none focus:border-rose-500 transition focus:bg-white/10 h-32 custom-scrollbar placeholder:text-slate-700"
                      />
                    </div>
                    <div className="space-y-4 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Şu Anki Modun</label>
                      <div className="flex flex-wrap gap-3">
                        {['🙂','☕','💃','🎧','🌙','🔥','🚀','🍕'].map(emoji => (
                          <button 
                            key={emoji}
                            onClick={() => setMemberProfile(s => ({...s, status_emoji: emoji}))}
                            className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl transition-all duration-300 ${memberProfile.status_emoji === emoji ? 'border-rose-500 bg-rose-500/20 shadow-lg shadow-rose-500/20' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-12 flex justify-end">
                    <button className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 px-12 py-4 font-black text-white shadow-xl shadow-rose-600/20 transition-all hover:scale-105 active:scale-95">
                      Profili Güncelle <ChevronRight size={18} strokeWidth={3} />
                    </button>
                  </div>
               </div>
             </div>
          </section>
        ) : isAdmin && (
          /* ADMİN PANELİ */
          <section className="space-y-8 animate-in fade-in duration-700">
             <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-white flex items-center gap-3">
                  <ShieldCheck className="text-indigo-400" size={32} /> Kontrol Paneli
                </h2>
                <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl ring-1 ring-white/10 backdrop-blur-md">
                   {['chat', 'stats', 'settings'].map(t => (
                     <button 
                      key={t}
                      onClick={() => setAdminTab(t)}
                      className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${adminTab === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       {t}
                     </button>
                   ))}
                </div>
             </div>

             <div className="grid h-[75vh] gap-8 lg:grid-cols-[380px_1fr]">
               <div className="flex flex-col gap-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-3xl">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Bekleyen</p>
                       <p className="text-3xl font-black text-white">12</p>
                    </div>
                    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-3xl">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">SLA</p>
                       <p className="text-3xl font-black text-emerald-400">1.4m</p>
                    </div>
                 </div>

                 <div className="flex-1 rounded-[2.5rem] border border-white/10 bg-white/5 p-6 backdrop-blur-3xl ring-1 ring-white/5 overflow-y-auto custom-scrollbar">
                    <h4 className="mb-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Canlı Destek</h4>
                    <div className="space-y-3">
                      {incomingThreads.map(t => (
                        <button key={t.id} className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-white/10 transition border border-white/5 bg-white/5 group">
                           <div className="h-11 w-11 rounded-2xl bg-slate-800 shrink-0" />
                           <div className="flex flex-col items-start overflow-hidden text-left">
                             <span className="text-xs font-black text-white truncate">{t.member_username}</span>
                             <span className="text-[10px] font-bold text-slate-500 truncate">{t.last_message_content}</span>
                           </div>
                        </button>
                      ))}
                    </div>
                 </div>
               </div>

               <div className="rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-3xl ring-1 ring-white/5 flex flex-col items-center justify-center text-center p-10">
                  <ShieldCheck size={64} className="text-slate-800 mb-6" strokeWidth={1} />
                  <h3 className="text-2xl font-black text-white mb-2">Thread Seçilmedi</h3>
                  <p className="max-w-[320px] text-sm font-medium text-slate-500">Yönetmek istediğiniz aktif bir sohbeti yan menüden seçin.</p>
               </div>
             </div>
          </section>
        )}
      </main>

      {/* Durum Bildirimleri */}
      {status && (
        <div className="fixed bottom-10 left-1/2 z-[100] -translate-x-1/2 animate-in slide-in-from-bottom-20 duration-500">
          <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-[#0a0c16]/95 px-8 py-5 text-sm font-black text-white shadow-2xl backdrop-blur-3xl ring-1 ring-white/10">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
              <Info size={16} strokeWidth={3} />
            </div>
            {status}
            <button onClick={() => setStatus('')} className="ml-6 text-slate-500 hover:text-white transition-colors"><X size={18} strokeWidth={3} /></button>
          </div>
        </div>
      )}

      {/* Global CSS Overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}} />
    </div>
  );
}
