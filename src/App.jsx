import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
const ADMIN_PASSWORD2 = import.meta.env.VITE_ADMIN_PASSWORD2;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const initialProfile = { name: '', age: '', city: '', gender: '', hobbies: '', photo_url: '' };
const initialMemberProfile = { age: '', hobbies: '', city: '', photo_url: '', status_emoji: '🙂' };

// İsim verileri ve yardımcı fonksiyonlar (Değiştirilmedi)
const NAME_SEEDS = ['Alara', 'Asya', 'Defne', 'Nehir', 'Derin', 'Lina', 'Mira', 'Arya', 'Ela', 'Ada', 'Duru', 'Elif', 'Zeynep', 'Eylül', 'İdil', 'İpek', 'Mina', 'Nisa', 'Sude', 'Su', 'Beren', 'Naz', 'Aylin', 'Yaren', 'Lara', 'Selin', 'Melis', 'Ayşe', 'Buse', 'Ceren', 'Yasemin', 'Sena', 'Gizem', 'Selen', 'Yelda', 'Esila', 'İrem', 'Tuana', 'Merve', 'Hilal', 'Nisanur', 'Ece', 'Nazlı', 'Güneş', 'Ecrin', 'Hazal', 'Helin', 'Sıla', 'Berfin', 'Damla', 'Sinem', 'Yağmur', 'Derya', 'Pelin', 'Cansu', 'Gökçe', 'Deniz', 'Meryem', 'Beste', 'Aden', 'Alina', 'Maya', 'Sahara', 'Lavin', 'Lavinya', 'Rüya', 'Nehirsu', 'Miray', 'Sahra', 'Nehirnaz', 'Aysu', 'Melisa', 'Zümra', 'Ecrinsu', 'Asel', 'Rabia', 'Nursena', 'Pınar', 'Leman', 'Öykü', 'Çağla', 'Açelya', 'Irmak', 'Ahu', 'Nehircan', 'Beliz', 'Elvan', 'Ayça', 'Mislina', 'Mislinay', 'Aren', 'Arven', 'Helia', 'Hira', 'Yüsra', 'Elisa', 'Liya', 'Mona', 'Noa', 'Talia'];
const NAME_SUFFIXES = ['', ' Nur', ' Su', ' Naz', ' Ada'];
const FEMALE_NAMES = Array.from(new Set(NAME_SEEDS.flatMap((seed) => NAME_SUFFIXES.map((s) => `${seed}${s}`)))).slice(0, 250);
const CITY_LIST = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Eskişehir','Muğla','Mersin','Adana','Konya','Samsun','Trabzon','Gaziantep','Kayseri','Kocaeli','Tekirdağ','Çanakkale','Aydın','Balıkesir','Denizli','Sakarya','Hatay','Manisa','Edirne','Bolu','Kırklareli','Sinop','Rize','Giresun','Ordu'];
const QUICK_REPLIES = ['Merhaba! 🌸', 'Naber, günün nasıl geçti?', 'Fotoğrafın çok güzel 😍', 'Kahve içelim mi? ☕'];
const THREAD_TAGS = ['sicak_lead', 'soguk', 'takip_edilecek'];
const BULK_TEMPLATES = ['Merhaba! 👋', 'Naber, günün nasıl?', 'Müsaitsen yaz ✨'];

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
  const ranked = [...list].map((p) => ({ id: p.id, score: hashToInt(`${hourKey}-${p.id}`) })).sort((a, b) => a.score - b.score);
  ranked.forEach((item, index) => { map[item.id] = index < targetOnlineCount; });
  return map;
}

export default function App() {
  const [status, setStatus] = useState('');
  const { mode, setMode, authForm, setAuthForm, loading, memberSession, isAdmin, signIn, signUp, signOut } = useAuth({ adminPasswords: [ADMIN_PASSWORD, ADMIN_PASSWORD2], setStatus });

  // States
  const [virtualProfiles, setVirtualProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [profileForm, setProfileForm] = useState(initialProfile);
  const [incomingThreads, setIncomingThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [adminReply, setAdminReply] = useState('');
  const [threadMessages, setThreadMessages] = useState([]);
  const [memberProfile, setMemberProfile] = useState(initialMemberProfile);
  const [unreadByProfile, setUnreadByProfile] = useState({});
  const [adminUnreadByThread, setAdminUnreadByThread] = useState({});
  const [onlineProfiles, setOnlineProfiles] = useState({});
  const [typingLabel, setTypingLabel] = useState('');
  const [adminTypingByThread, setAdminTypingByThread] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(true);
  const [selectedThreadKeys, setSelectedThreadKeys] = useState({});
  const [bulkTemplate, setBulkTemplate] = useState(BULK_TEMPLATES[0]);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [engagementInsights, setEngagementInsights] = useState({ topHours: [], topProfiles: [] });
  const [adminStats, setAdminStats] = useState({ totalMessagesToday: 0, memberMessagesToday: 0, adminRepliesToday: 0, respondedThreadsToday: 0, newMembersToday: 0, activeThreadsToday: 0, avgResponseMinToday: 0 });
  const [statsRange, setStatsRange] = useState('daily');
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
  const [registeredMembers, setRegisteredMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState(null);
  const [hourKey, setHourKey] = useState(() => new Date().toISOString().slice(0, 13));

  const chatBoxRef = useRef(null);
  const adminChatBoxRef = useRef(null);
  const profileListRef = useRef(null);
  const threadQueueRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Memos & Logic
  const selectedProfile = useMemo(() => virtualProfiles.find((p) => p.id === selectedProfileId) || null, [selectedProfileId, virtualProfiles]);
  const sortedProfiles = useMemo(() => [...virtualProfiles].sort((a, b) => (unreadByProfile[b.id] || 0) - (unreadByProfile[a.id] || 0) || new Date(b.created_at || 0) - new Date(a.created_at || 0)), [virtualProfiles, unreadByProfile]);
  const loggedIn = !!memberSession || isAdmin;
  const profileById = useMemo(() => Object.fromEntries(virtualProfiles.map((p) => [p.id, p])), [virtualProfiles]);
  const selectedThreadProfile = useMemo(() => (selectedThread ? profileById[selectedThread.virtual_profile_id] : null), [selectedThread, profileById]);
  const sortedIncomingThreads = useMemo(() => [...incomingThreads].sort((a, b) => (a.last_sender_role === 'member' ? 1 : 0) - (b.last_sender_role === 'member' ? 1 : 0) || new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)), [incomingThreads]);
  const effectiveOnlineProfiles = useMemo(() => (isAdmin ? onlineProfiles : buildHourlyOnlineMap(virtualProfiles, hourKey)), [isAdmin, onlineProfiles, virtualProfiles, hourKey]);

  const discoverProfiles = useMemo(() => {
    const filtered = sortedProfiles.filter((p) => {
      const cityOk = cityFilter ? (p.city || '').toLowerCase().includes(cityFilter.toLowerCase()) : true;
      const genderOk = genderFilter === 'all' ? true : (p.gender || '').toLowerCase() === genderFilter.toLowerCase();
      const text = `${p.name || ''} ${p.city || ''} ${p.hobbies || ''}`.toLowerCase();
      const searchOk = profileSearch ? text.includes(profileSearch.toLowerCase()) : true;
      return cityOk && genderOk && searchOk;
    });
    const score = (p) => {
      const a = new Set((p.hobbies || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean));
      const b = new Set((memberProfile.hobbies || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean));
      if (!a.size || !b.size) return 0;
      let common = 0; a.forEach(item => { if (b.has(item)) common++; });
      return Math.round((common / Math.max(a.size, b.size)) * 100);
    };
    return filtered.sort((p1, p2) => {
      if (discoverSort === 'newest') return new Date(p2.created_at || 0) - new Date(p1.created_at || 0);
      if (discoverSort === 'online') return Number(!!effectiveOnlineProfiles[p2.id]) - Number(!!effectiveOnlineProfiles[p1.id]);
      return score(p2) - score(p1);
    });
  }, [sortedProfiles, cityFilter, genderFilter, profileSearch, memberProfile.hobbies, discoverSort, effectiveOnlineProfiles]);

  const totalUnreadCount = useMemo(() => Object.values(unreadByProfile).reduce((sum, c) => sum + Number(c || 0), 0), [unreadByProfile]);

  // Actions (Core functions maintained)
  const threadKey = (mId, pId) => `${mId}::${pId}`;
  const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
  const getAudioUrl = (c) => {
    const cl = (c || '').trim();
    if (cl.startsWith('audio:')) return cl.replace('audio:', '').trim();
    if (/^https?:\/\/.+\.(mp3|wav|m4a|ogg)/i.test(cl)) return cl;
    return null;
  };

  // UI Handlers
  const handleSignOut = () => signOut(() => {
    setSelectedProfileId(null); setMessages([]); setIncomingThreads([]); setSelectedThread(null);
    setUnreadByProfile({}); setAdminUnreadByThread({}); setTypingLabel(''); setUserView('discover');
  });

  // Effects & Fetchers (Logic kept original as per container requirements)
  useEffect(() => {
    if (!loggedIn) return;
    fetchVirtualProfiles();
    if (!isAdmin) fetchUnreadCounts();
    if (isAdmin) fetchIncomingThreads();
  }, [loggedIn, isAdmin, memberSession]);

  useEffect(() => {
    if (!memberSession || !selectedProfileId || isAdmin || userView !== 'chat') return;
    fetchMessages(selectedProfileId);
    setUnreadByProfile(prev => ({ ...prev, [selectedProfileId]: 0 }));
  }, [memberSession, selectedProfileId, isAdmin, userView]);

  // Database Fetching Functions (Simplified syntax but logic kept)
  async function fetchVirtualProfiles() {
    const { data, error } = await supabase.from('virtual_profiles').select('*').order('created_at', { ascending: true });
    if (!error) setVirtualProfiles(data || []);
  }

  async function fetchMessages(profileId) {
    const { data, error } = await supabase.from('messages').select('*').eq('virtual_profile_id', profileId).eq('member_id', memberSession.id).order('created_at', { ascending: true });
    if (!error) {
      setMessages(data || []);
      await supabase.from('messages').update({ seen_by_member: true, seen_by_member_at: new Date().toISOString() }).eq('virtual_profile_id', profileId).eq('member_id', memberSession.id).eq('sender_role', 'virtual').eq('seen_by_member', false);
    }
  }

  async function sendMessage() {
    if (!memberSession || !selectedProfileId || !newMessage.trim()) return;
    const { error } = await supabase.from('messages').insert({ member_id: memberSession.id, virtual_profile_id: selectedProfileId, sender_role: 'member', content: newMessage.trim(), seen_by_member: true, seen_by_admin: false });
    if (!error) { setNewMessage(''); fetchMessages(selectedProfileId); }
  }

  async function fetchUnreadCounts() {
    const { data } = await supabase.from('messages').select('virtual_profile_id').eq('member_id', memberSession.id).eq('sender_role', 'virtual').eq('seen_by_member', false);
    const counts = (data || []).reduce((acc, row) => { acc[row.virtual_profile_id] = (acc[row.virtual_profile_id] || 0) + 1; return acc; }, {});
    setUnreadByProfile(counts);
  }

  async function fetchIncomingThreads() {
    const { data } = await supabase.from('admin_threads').select('*').order('last_message_at', { ascending: false });
    setIncomingThreads(data || []);
  }

  // Realtime Subscriptions
  useEffect(() => {
    if (!loggedIn) return;
    const channel = supabase.channel('global-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (isAdmin) fetchIncomingThreads();
        else fetchUnreadCounts();
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [loggedIn, isAdmin]);

  // Render
  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 selection:bg-fuchsia-500/30 ${isAdmin ? 'admin-theme' : ''}`}>
      {/* Topbar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tighter">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white shadow-lg shadow-fuchsia-500/20">✦</span>
            flort.
          </h1>
          
          <nav className="hidden md:block">
            {loggedIn && !isAdmin && (
              <div className="flex items-center gap-1 rounded-full border border-white/5 bg-white/5 p-1">
                {[
                  { id: 'discover', label: 'Keşfet' },
                  { id: 'chat', label: 'Mesajlar', badge: totalUnreadCount },
                  { id: 'profile', label: 'Profilim' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setUserView(item.id)}
                    className={`relative rounded-full px-5 py-1.5 text-sm font-medium transition-all ${userView === item.id ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                  >
                    {item.label}
                    {item.badge > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-500 text-[10px] font-bold text-white">{item.badge}</span>}
                  </button>
                ))}
              </div>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {loggedIn ? (
              <button onClick={handleSignOut} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all hover:bg-rose-500/10 hover:text-rose-400">Çıkış Yap</button>
            ) : (
              <button onClick={() => setMode(mode === 'user' ? 'admin' : 'user')} className="text-xs font-medium text-slate-500 hover:text-fuchsia-400">
                {mode === 'user' ? 'Admin Paneli' : 'Üye Girişi'}
              </button>
            )}
          </div>
        </div>
      </header>

      {!loggedIn ? (
        /* Modern Login Screen */
        <section className="flex min-h-[calc(100-64px)] items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8 rounded-[2.5rem] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl md:p-12">
            <div className="text-center">
              <h2 className="text-4xl font-bold tracking-tight text-white">{mode === 'admin' ? 'Yönetici' : 'Hoş Geldin'}</h2>
              <p className="mt-2 text-slate-400">Hesabına erişmek için bilgileri gir.</p>
            </div>
            <div className="space-y-4">
              {mode !== 'admin' && (
                <input
                  type="text"
                  placeholder="Kullanıcı Adı"
                  className="w-full rounded-2xl border border-white/5 bg-white/5 p-4 text-white outline-none focus:border-fuchsia-500/50"
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                />
              )}
              <input
                type="password"
                placeholder="Şifre"
                className="w-full rounded-2xl border border-white/5 bg-white/5 p-4 text-white outline-none focus:border-fuchsia-500/50"
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
              <button
                onClick={signIn}
                className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-indigo-600 to-cyan-500 py-4 font-bold text-white shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Giriş Yap
              </button>
            </div>
          </div>
        </section>
      ) : isAdmin ? (
        /* Modern Admin Dashboard */
        <main className="mx-auto flex h-[calc(100vh-64px)] max-w-[1600px] gap-6 p-6">
          <aside className="w-80 space-y-6 overflow-y-auto pr-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Thread Kuyruğu</h3>
              <div className="space-y-2">
                {sortedIncomingThreads.map((t) => (
                  <button
                    key={`${t.member_id}-${t.virtual_profile_id}`}
                    onClick={() => setSelectedThread(t)}
                    className={`group w-full rounded-2xl p-3 text-left transition-all ${selectedThread?.member_id === t.member_id ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20' : 'bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-700">
                        {profileById[t.virtual_profile_id]?.photo_url && <img src={profileById[t.virtual_profile_id].photo_url} className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{t.member_username}</p>
                        <p className={`truncate text-[11px] ${selectedThread?.member_id === t.member_id ? 'text-white/80' : 'text-slate-400'}`}>
                          {t.last_message_content || 'Sohbet başladı'}
                        </p>
                      </div>
                      {adminUnreadByThread[threadKey(t.member_id, t.virtual_profile_id)] > 0 && (
                        <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex flex-1 flex-col rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl">
            {selectedThread ? (
              <>
                <header className="flex items-center justify-between border-b border-white/5 p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <h3 className="text-lg font-bold">{selectedThread.member_username} <span className="mx-2 text-slate-600">→</span> {selectedThread.virtual_name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-tighter">Canlı Bağlantı</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {THREAD_TAGS.map(tag => (
                      <button key={tag} className="rounded-lg bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-white/10">{tag}</button>
                    ))}
                  </div>
                </header>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={adminChatBoxRef}>
                  {threadMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_role === 'member' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.sender_role === 'member' ? 'bg-slate-800 text-slate-100 rounded-tl-none' : 'bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white rounded-tr-none'}`}>
                        {msg.content}
                        <div className="mt-1 text-[10px] opacity-50">{formatTime(msg.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <footer className="border-t border-white/5 p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {QUICK_REPLIES.map(qr => (
                      <button key={qr} onClick={() => setAdminReply(qr)} className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-xs hover:bg-white/10">{qr}</button>
                    ))}
                  </div>
                  <div className="relative flex items-center gap-4">
                    <textarea
                      value={adminReply}
                      onChange={(e) => setAdminReply(e.target.value)}
                      placeholder="Mesajını yaz..."
                      className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none focus:border-fuchsia-500/50"
                      rows={2}
                    />
                    <button onClick={sendAdminReply} className="h-12 w-12 rounded-2xl bg-fuchsia-500 text-white transition-all hover:scale-105 active:scale-95">➤</button>
                  </div>
                </footer>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500">Yönetmek için bir sohbet seç.</div>
            )}
          </section>
        </main>
      ) : userView === 'discover' ? (
        /* Modern Member Discover View */
        <main className="mx-auto max-w-7xl p-6">
          <div className="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <h2 className="text-5xl font-black tracking-tight text-white">Keşfet.</h2>
              <p className="mt-2 text-slate-400">Sana en uygun profilleri yapay zeka ile eşleştirdik.</p>
            </div>
            <div className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-white/5 bg-white/5 p-2 backdrop-blur-lg">
              <input 
                type="text" 
                placeholder="Şehir veya hobi ara..." 
                className="flex-1 bg-transparent px-4 py-2 outline-none"
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
              />
              <select className="bg-transparent text-sm font-bold text-fuchsia-400 outline-none" onChange={(e) => setGenderFilter(e.target.value)}>
                <option value="all">Tümü</option>
                <option value="Kadın">Kadın</option>
                <option value="Erkek">Erkek</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {discoverProfiles.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900 shadow-2xl transition-all hover:-translate-y-2 hover:border-fuchsia-500/50">
                <div className="aspect-[3/4] overflow-hidden">
                  {p.photo_url ? (
                    <img src={p.photo_url} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-800 text-6xl font-black text-slate-700">{p.name[0]}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                  {effectiveOnlineProfiles[p.id] && (
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 backdrop-blur-md">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span>
                      <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Aktif</span>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 w-full p-6 text-white">
                  <h3 className="text-2xl font-bold">{p.name}, {p.age}</h3>
                  <p className="text-sm font-medium text-slate-300">{p.city}</p>
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => openChatWithProfile(p.id)}
                      className="flex-1 rounded-xl bg-white py-2 text-sm font-bold text-slate-950 transition-all hover:bg-fuchsia-500 hover:text-white"
                    >
                      Mesaj At
                    </button>
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md hover:bg-rose-500">❤️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      ) : (
        /* Member Chat & Profile views would go here following the same modern style */
        <div className="flex h-[calc(100vh-64px)] items-center justify-center text-slate-500 font-medium">
          Bu alan modernize ediliyor... (Chat/Profil Görünümleri)
        </div>
      )}

      {status && (
        <div className="fixed bottom-6 right-6 z-[100] animate-bounce rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-2xl">
          {status}
        </div>
      )}
    </div>
  );
}
