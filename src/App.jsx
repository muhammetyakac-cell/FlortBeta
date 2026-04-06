import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
const ADMIN_PASSWORD2 = import.meta.env.VITE_ADMIN_PASSWORD2;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const initialProfile = { name: '', age: '', city: '', gender: '', hobbies: '', photo_url: '' };
const initialMemberProfile = { age: '', hobbies: '', city: '', photo_url: '', status_emoji: '🙂' };

const NAME_SEEDS = [
  'Alara', 'Asya', 'Defne', 'Nehir', 'Derin', 'Lina', 'Mira', 'Arya', 'Ela', 'Ada', 'Duru', 'Elif', 'Zeynep', 'Eylül', 'İdil', 'İpek', 'Mina', 'Nisa', 'Sude', 'Su', 'Beren', 'Naz', 'Aylin', 'Yaren', 'Lara', 'Selin', 'Melis', 'Ayşe', 'Buse', 'Ceren', 'Yasemin', 'Sena', 'Gizem', 'Selen', 'Yelda', 'Esila', 'İrem', 'Tuana', 'Merve', 'Hilal', 'Nisanur', 'Ece', 'Nazlı', 'Güneş', 'Ecrin', 'Hazal', 'Helin', 'Sıla', 'Berfin', 'Damla', 'Sinem', 'Yağmur', 'Derya', 'Pelin', 'Cansu', 'Gökçe', 'Deniz', 'Meryem', 'Beste', 'Aden', 'Alina', 'Maya', 'Sahara', 'Lavin', 'Lavinya', 'Rüya', 'Nehirsu', 'Miray', 'Sahra', 'Nehirnaz', 'Aysu', 'Melisa', 'Zümra', 'Ecrinsu', 'Asel', 'Rabia', 'Nursena', 'Pınar', 'Leman', 'Öykü', 'Çağla', 'Açelya', 'Irmak', 'Ahu', 'Nehircan', 'Beliz', 'Elvan', 'Ayça', 'Mislina', 'Mislinay', 'Aren', 'Arven', 'Helia', 'Hira', 'Yüsra', 'Elisa', 'Liya', 'Mona', 'Noa', 'Talia',
  'Alya', 'Azra', 'Bade', 'Beren', 'Ceylin', 'Doğa', 'Efsun', 'Eslem', 'Gece', 'İlknur', 'Kumsal', 'Lavin', 'Masal', 'Nefes', 'Öykü', 'Peri', 'Sare', 'Simge', 'Talia', 'Umay', 'Vera', 'Yaz', 'Zeren', 'Almina', 'Bahar', 'Cemre', 'Dilek', 'Ebru', 'Feride', 'Gamze', 'Hande', 'Işıl', 'Jale', 'Kader', 'Lale', 'Meltem', 'Nalan', 'Oya', 'Özlem', 'Papatya', 'Reyhan', 'Seda', 'Şebnem', 'Tülay', 'Ufuk', 'Vildan', 'Yonca', 'Zuhal', 'Alev', 'Belgin', 'Canan', 'Demet', 'Emel', 'Fulya', 'Gül', 'Hale', 'Itrı', 'Jülide', 'Kamuran', 'Leyla', 'Müjde', 'Nevin', 'Oylum', 'Ömür', 'Parla', 'Rana', 'Suna', 'Şule', 'Tansu', 'Ulviye', 'Vuslat', 'Yeliz', 'Zerrin', 'Arzu', 'Binnaz', 'Cavidan', 'Dürriye', 'Esma', 'Feriha', 'Güzin', 'Huriye', 'Itır', 'Janset', 'Kıvılcım', 'Lamia', 'Münevver', 'Nigar', 'Olga', 'Özen', 'Perran', 'Rezzan', 'Semiramis', 'Şermin', 'Tezer', 'Uğur', 'Vahide', 'Yıldız', 'Zekiye',
  'Açangül', 'Afet', 'Ahsen', 'Akasya', 'Alçin', 'Anka', 'Arın', 'Asu', 'Avis', 'Ayana', 'Aybüke', 'Ayçıl', 'Aydan', 'Ayfer', 'Aygün', 'Ayhan', 'Ayla', 'Aylu', 'Aysel', 'Ayşen', 'Aytan', 'Ayten', 'Azize', 'Bahar', 'Balkan', 'Banis', 'Banu', 'Başak', 'Bedriye', 'Begüm', 'Behiye', 'Belemir', 'Belma', 'Benan', 'Bengü', 'Bensu', 'Beren', 'Beril', 'Berna', 'Berra', 'Berrin', 'Busem', 'Büşra', 'Canay', 'Cansel', 'Cavidan', 'Ceyda', 'Ceylan', 'Çağıl', 'Çiçek', 'Çiğdem', 'Çiler', 'Çisil', 'Dalya', 'Defnesu', 'Değer', 'Deren', 'Destina', 'Devrim', 'Dicle', 'Didemsu', 'Dilara', 'Dilay', 'Diler', 'Dilhan', 'Duru', 'Duygu', 'Dünya', 'Ecem', 'Edanur', 'Efil', 'Ekin', 'Elanur', 'Elçin', 'Elen', 'Elifsu', 'Elis', 'Eliz', 'Elmas', 'Elmira', 'Emanet', 'Emet', 'Emine', 'Emsal', 'Ender', 'Enise', 'Erda', 'Erem', 'Eren', 'Erna', 'Esin', 'Esma', 'Esmeray', 'Esra', 'Evren', 'Ezel', 'Ezgi', 'Faden', 'Fahriye', 'Fatma', 'Fatoş', 'Faye', 'Fazilet', 'Felek', 'Feri', 'Ferrah', 'Feyza', 'Fidan', 'Figen', 'Fisun', 'Flora', 'Funda', 'Füruzan', 'Gülay', 'Gülben', 'Gülcan', 'Gülçin', 'Gülen', 'Güler', 'Gülfem', 'Güliz', 'Güllü', 'Gülriz', 'Gülsüm', 'Gülşen', 'Günay', 'Güneş', 'Güney', 'Güniz', 'Günseli', 'Güz', 'Güzide', 'Habibe', 'Hacer', 'Hafize', 'Harika', 'Hasret', 'Hatice', 'Havva', 'Hayal', 'Hayat', 'Hayriye', 'Hazan', 'Hazar', 'Hediye', 'Heves', 'Hevin', 'Hicran', 'Hicret', 'Hilal', 'Huri', 'Hülya', 'Hüner', 'Hürrem', 'Hülya', 'Hümeyra', 'Hüsna', 'Ilgım', 'Ilgın', 'Iraz', 'Irmak', 'Işık', 'İclal', 'İffet', 'İkbal', 'İlay', 'İlayda', 'İlgi', 'İlkay', 'İlke', 'İlkim', 'İmge', 'İmren', 'İnci', 'İpek', 'İrem', 'İris', 'İzel', 'İzgi', 'Kardelen', 'Kayra', 'Kezban', 'Kübra', 'Ladin', 'Lalezar', 'Lara', 'Lavin', 'Leman', 'Lemis', 'Lerzan', 'Lina', 'Linet', 'Loya', 'Mahperi', 'Makbule', 'Manolya', 'Maral', 'Mehtap', 'Melda', 'Melek', 'Melike', 'Melis', 'Melisa', 'Melsa', 'Meral', 'Mercan', 'Merih', 'Merva', 'Meryem', 'Merve', 'Mevsim', 'Mısra', 'Mihriban', 'Mihrimah', 'Mina', 'Mine', 'Mira', 'Miran', 'Miray', 'Mislina', 'Mualla', 'Mukaddes', 'Mutlu', 'Müfide', 'Müge', 'Mükerrem', 'Münire', 'Müesser', 'Müşerref', 'Nalan', 'Narin', 'Nazan', 'Nazife', 'Nazlı', 'Nebahat', 'Necla', 'Nehir', 'Nergis', 'Neriman', 'Neslihan', 'Nesrin', 'Neşe', 'Neval', 'Nevra', 'Nezahat', 'Nida', 'Nihal', 'Nihan', 'Nil', 'Nilay', 'Nilgün', 'Nilsu', 'Niran', 'Nisa', 'Nisan', 'Nisra', 'Nurbanu', 'Nurcan', 'Nurdan', 'Nurefşan', 'Nurgül', 'Nurşen', 'Nurten', 'Nükhet', 'Okşan', 'Olca', 'Olgun', 'Oya', 'Ömür', 'Önay', 'Özden', 'Özge', 'Özgül', 'Özgür', 'Özlem', 'Öznur', 'Özsu', 'Pakiye', 'Pamira', 'Papatya', 'Parla', 'Pelin', 'Pelinsu', 'Pembe', 'Peri', 'Perihan', 'Perran', 'Pervin', 'Petek', 'Pınar', 'Piraye', 'Pürçek', 'Rabia', 'Rahime', 'Rahşan', 'Rana', 'Ravza', 'Refika', 'Remziye', 'Rengin', 'Resmiye', 'Reyhan', 'Rezzan', 'Ruhsar', 'Rümeysa', 'Rüya', 'Saba', 'Sabahat', 'Sabiha', 'Sabite', 'Sabriye', 'Safiye', 'Saadet', 'Sahra', 'Saliha', 'Salime', 'Salkım', 'Saniye', 'Sargül', 'Seda', 'Sedef', 'Seden', 'Seher', 'Selcan', 'Selda', 'Selen', 'Selime', 'Selin', 'Selma', 'Selvi', 'Sema', 'Semra', 'Sena', 'Senay', 'Seniha', 'Serap', 'Seray', 'Seren', 'Serra', 'Sertap', 'Servet', 'Seva', 'Sevcan', 'Sevda', 'Sevecen', 'Sevgi', 'Sevil', 'Sevilay', 'Sevinç', 'Seyyal', 'Sezen', 'Sezer', 'Sıla', 'Sibel', 'Simge', 'Sinem', 'Solmaz', 'Sonay', 'Songül', 'Suna', 'Suat', 'Sude', 'Sultan', 'Sumru', 'Süheyla', 'Süreyya', 'Şadiye', 'Şafak', 'Şahika', 'Şayeste', 'Şebnem', 'Şefika', 'Şehnaz', 'Şelale', 'Şenay', 'Şengül', 'Şennur', 'Şerife', 'Şermin', 'Şevval', 'Şeyda', 'Şeyma', 'Şiir', 'Şükran', 'Şükriye', 'Talia', 'Tardu', 'Tijen', 'Tuba', 'Tuğba', 'Tuğçe', 'Turna', 'Tutku', 'Tülay', 'Tülin', 'Türkan', 'Umay', 'Ufuk', 'Uğur', 'Ulviye', 'Ulya', 'Uzay', 'Ülker', 'Ümit', 'Ümran', 'Ünseli', 'Vahide', 'Vebia', 'Veledan', 'Vera', 'Verda', 'Vesile', 'Vicdan', 'Vildan', 'Vuslat', 'Yağmur', 'Yakamoz', 'Yalın', 'Yaprak', 'Yaren', 'Yasemin', 'Yaz', 'Yelda', 'Yeliz', 'Yeşim', 'Yıldız', 'Yonca', 'Yosun', 'Yurdagül', 'Yurdanur', 'Yüksel', 'Yüsra', 'Zahide', 'Zehra', 'Zekiye', 'Zeliha', 'Zerrin', 'Zeynep', 'Ziba', 'Zinnur', 'Zübeyde', 'Zühal', 'Zülal', 'Züleyha', 'Zülfiye'
];
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
    mode,
    setMode,
    authForm,
    setAuthForm,
    loading,
    memberSession,
    isAdmin,
    signIn,
    signUp,
    signOut,
  } = useAuth({ adminPasswords: [ADMIN_PASSWORD, ADMIN_PASSWORD2], setStatus });

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
  const [adminStats, setAdminStats] = useState({
    totalMessagesToday: 0,
    memberMessagesToday: 0,
    adminRepliesToday: 0,
    respondedThreadsToday: 0,
    newMembersToday: 0,
    activeThreadsToday: 0,
    avgResponseMinToday: 0,
  });
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

  const selectedProfile = useMemo(
    () => virtualProfiles.find((p) => p.id === selectedProfileId) || null,
    [selectedProfileId, virtualProfiles]
  );

  const sortedProfiles = useMemo(() => {
    return [...virtualProfiles].sort((a, b) => {
      const unreadA = unreadByProfile[a.id] || 0;
      const unreadB = unreadByProfile[b.id] || 0;
      if (unreadA !== unreadB) return unreadB - unreadA;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [virtualProfiles, unreadByProfile]);

  const loggedIn = !!memberSession || isAdmin;

  const profileById = useMemo(() => Object.fromEntries(virtualProfiles.map((p) => [p.id, p])), [virtualProfiles]);
  const selectedThreadProfile = useMemo(() => (selectedThread ? profileById[selectedThread.virtual_profile_id] : null), [selectedThread, profileById]);
  const sortedIncomingThreads = useMemo(() => {
    return [...incomingThreads].sort((a, b) => {
      const waitA = a.last_sender_role === 'member' ? 1 : 0;
      const waitB = b.last_sender_role === 'member' ? 1 : 0;
      if (waitA !== waitB) return waitB - waitA;
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
    });
  }, [incomingThreads]);

  const slaStats = useMemo(() => {
    const waiting = incomingThreads.filter((t) => t.last_sender_role === 'member' || (adminUnreadByThread[threadKey(t.member_id, t.virtual_profile_id)] || 0) > 0);
    const now = Date.now();
    const avgWaitMin = waiting.length
      ? waiting.reduce((acc, t) => {
        const ts = t.last_message_at || t.created_at;
        const diff = ts ? (now - new Date(ts).getTime()) / 60000 : 0;
        return acc + Math.max(diff, 0);
      }, 0) / waiting.length
      : 0;
    return {
      waitingCount: waiting.length,
      avgWaitMin,
      lastReplyMin: selectedThread?.last_message_at ? (now - new Date(selectedThread.last_message_at).getTime()) / 60000 : 0,
    };
  }, [incomingThreads, selectedThread, adminUnreadByThread]);

  const interestScore = useMemo(() => {
    if (!selectedProfileId) return 0;
    const weekKey = (() => {
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const dayOfYear = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start.getTime()) / 86400000) + 1;
      return `${now.getUTCFullYear()}-W${Math.ceil(dayOfYear / 7)}`;
    })();
    const seed = `${weekKey}-${memberSession?.id || 'guest'}-${selectedProfileId}`;
    const score = 70 + (hashToInt(seed) % 31); // 70-100
    return Math.min(100, Math.max(70, score));
  }, [selectedProfileId, memberSession?.id]);

  useEffect(() => {
    if (!loggedIn || isAdmin) return;
    const tick = () => {
      const nowHour = new Date().toISOString().slice(0, 13);
      setHourKey((prev) => (prev === nowHour ? prev : nowHour));
    };
    const interval = window.setInterval(tick, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [loggedIn, isAdmin]);

  const effectiveOnlineProfiles = useMemo(
    () => (isAdmin ? onlineProfiles : buildHourlyOnlineMap(virtualProfiles, hourKey)),
    [isAdmin, onlineProfiles, virtualProfiles, hourKey]
  );

  const discoverProfiles = useMemo(() => {
    const filtered = sortedProfiles.filter((profile) => {
      const cityOk = cityFilter ? (profile.city || '').toLowerCase().includes(cityFilter.toLowerCase()) : true;
      const genderOk = genderFilter === 'all' ? true : (profile.gender || '').toLowerCase() === genderFilter.toLowerCase();
      const text = `${profile.name || ''} ${profile.city || ''} ${profile.hobbies || ''}`.toLowerCase();
      const searchOk = profileSearch ? text.includes(profileSearch.toLowerCase()) : true;
      return cityOk && genderOk && searchOk;
    });
    const score = (profile) => {
      const a = new Set((profile.hobbies || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean));
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
  }, [sortedProfiles, cityFilter, genderFilter, profileSearch, memberProfile.hobbies, discoverSort, effectiveOnlineProfiles]);

  const totalUnreadCount = useMemo(
    () => Object.values(unreadByProfile).reduce((sum, count) => sum + Number(count || 0), 0),
    [unreadByProfile]
  );

  const activeProfileCount = useMemo(
    () => virtualProfiles.filter((profile) => effectiveOnlineProfiles[profile.id]).length,
    [virtualProfiles, effectiveOnlineProfiles]
  );

  const spotlightProfiles = useMemo(() => discoverProfiles.slice(0, 5), [discoverProfiles]);

  function threadKey(memberId, profileId) {
    return `${memberId}::${profileId}`;
  }

  async function selectRows(table, buildQuery) {
    const query = buildQuery(supabase.from(table).select('*'));
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function insertRows(table, payload) {
    const { data, error } = await supabase.from(table).insert(payload).select();
    if (error) throw error;
    return data || [];
  }

  async function updateRows(table, payload, buildQuery) {
    const query = buildQuery(supabase.from(table).update(payload));
    const { data, error } = await query.select();
    if (error) throw error;
    return data || [];
  }

  function formatTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function buildRandomVirtualProfile() {
    return {
      name: getRandomItem(FEMALE_NAMES),
      age: String(Math.floor(Math.random() * 14) + 20),
      city: getRandomItem(CITY_LIST),
      gender: 'Kadın',
      hobbies: getRandomItem(['Kahve, seyahat, müzik','Yoga, kitap, yürüyüş','Sinema, fotoğraf, dans','Pilates, moda, sanat','Doğa, kamp, paten']),
    };
  }

  function fillRandomVirtualProfile() {
    setProfileForm((prev) => ({ ...prev, ...buildRandomVirtualProfile() }));
  }

  function playNotificationSound() {
    if (!notificationSoundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
    } catch {
      // Sessizce geç
    }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem('admin_notification_sound_enabled');
    if (saved === null) return;
    setNotificationSoundEnabled(saved === 'true');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('admin_notification_sound_enabled', String(notificationSoundEnabled));
  }, [notificationSoundEnabled]);

  function getAudioUrl(content) {
    const clean = (content || '').trim();
    if (!clean) return null;
    if (clean.startsWith('audio:')) return clean.replace('audio:', '').trim();
    if (/^https?:\/\/.+\.(mp3|wav|m4a|ogg)(\?.*)?$/i.test(clean)) return clean;
    return null;
  }

  function autoResizeTextarea(el, maxHeight = 220) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }

  useEffect(() => {
    if (!loggedIn) return;
    fetchVirtualProfiles();
    if (!isAdmin) fetchUnreadCounts();
    if (isAdmin) fetchIncomingThreads();
  }, [loggedIn, isAdmin, memberSession]);

  useEffect(() => {
    if (!memberSession || !selectedProfileId || isAdmin || userView !== 'chat') return;
    fetchMessages(selectedProfileId);
  }, [memberSession, selectedProfileId, isAdmin, userView]);

  useEffect(() => {
    if (!selectedProfileId || isAdmin || userView !== 'chat') return;
    setUnreadByProfile((prev) => ({ ...prev, [selectedProfileId]: 0 }));
  }, [selectedProfileId, isAdmin, userView]);

  useEffect(() => {
    if (!isAdmin || !selectedThread) return;
    const key = threadKey(selectedThread.member_id, selectedThread.virtual_profile_id);
    setAdminUnreadByThread((prev) => ({ ...prev, [key]: 0 }));
  }, [isAdmin, selectedThread]);

  useEffect(() => {
    if (!memberSession || isAdmin) return;
    if (!chatBoxRef.current) return;
    chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [messages, memberSession, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !adminChatBoxRef.current) return;
    adminChatBoxRef.current.scrollTop = adminChatBoxRef.current.scrollHeight;
  }, [threadMessages, isAdmin]);

  useEffect(() => {
    if (!profileListRef.current) return;
    profileListRef.current.scrollTop = 0;
  }, [unreadByProfile]);

  useEffect(() => {
    if (!threadQueueRef.current || !isAdmin) return;
    threadQueueRef.current.scrollTop = 0;
  }, [incomingThreads, isAdmin]);

  useEffect(() => {
    if (!isAdmin || selectedThread || !sortedIncomingThreads.length) return;
    setSelectedThread(sortedIncomingThreads[0]);
  }, [isAdmin, selectedThread, sortedIncomingThreads]);

  useEffect(() => {
    if (!isAdmin || !selectedThread) return;
    fetchThreadMessages(selectedThread.member_id, selectedThread.virtual_profile_id);
    fetchQuickFacts(selectedThread.member_id, selectedThread.virtual_profile_id);
    fetchMemberProfile(selectedThread.member_id);
  }, [isAdmin, selectedThread]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchEngagementInsights();
  }, [isAdmin, incomingThreads, virtualProfiles]);

  useEffect(() => {
    if (!isAdmin || adminTab !== 'stats') return;
    fetchAdminStats();
  }, [isAdmin, adminTab, incomingThreads, threadMessages, statsRange]);

  useEffect(() => {
    if (!isAdmin || adminTab !== 'settings') return;
    fetchRegisteredMembers();
  }, [isAdmin, adminTab]);

  useEffect(() => {
    if (!memberSession || isAdmin) return;
    fetchOwnProfile();
  }, [memberSession, isAdmin]);

  useEffect(() => {
    if (!memberSession || isAdmin) return;
    setUserView('discover');
  }, [memberSession, isAdmin]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!isAdmin) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAdmin]);

  useEffect(() => {
    if (!loggedIn) return;

    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (isAdmin) {
          fetchIncomingThreads();
          const changed = payload.new || payload.old;
          if (!changed) return;

          const key = threadKey(changed.member_id, changed.virtual_profile_id);
          const selectedKey = selectedThread
            ? threadKey(selectedThread.member_id, selectedThread.virtual_profile_id)
            : null;

          if (selectedKey && key === selectedKey) {
            fetchThreadMessages(changed.member_id, changed.virtual_profile_id);
            setAdminUnreadByThread((prev) => ({ ...prev, [key]: 0 }));
          } else if (changed.sender_role === 'member') {
            setAdminUnreadByThread((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
            playNotificationSound();
          }
          return;
        }

        if (!memberSession) return;
        const changed = payload.new || payload.old;
        if (!changed) return;

        if (changed.member_id !== memberSession.id) return;

        if (changed.sender_role === 'virtual') {
          playNotificationSound();
        }

        const viewingSelectedChat = userView === 'chat' && selectedProfileId && changed.virtual_profile_id === selectedProfileId;

        if (viewingSelectedChat) {
          fetchMessages(selectedProfileId);
          if (changed.sender_role === 'virtual') {
            setUnreadByProfile((prev) => ({ ...prev, [selectedProfileId]: 0 }));
          }
        } else if (changed.sender_role === 'virtual') {
          setUnreadByProfile((prev) => ({
            ...prev,
            [changed.virtual_profile_id]: (prev[changed.virtual_profile_id] || 0) + 1,
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loggedIn, isAdmin, memberSession, selectedProfileId, selectedThread, userView]);

  useEffect(() => {
    if (!loggedIn) return;

    const presenceChannel = supabase.channel('virtual-profiles-presence', {
      config: { presence: { key: isAdmin ? `admin-${Date.now()}` : `member-${memberSession?.id || Date.now()}` } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const online = {};
        Object.values(state).forEach((entries) => {
          entries.forEach((entry) => {
            (entry.online_profiles || []).forEach((profileId) => {
              online[profileId] = true;
            });
          });
        });
        setOnlineProfiles(online);
      })
      .subscribe(async (state) => {
        if (state === 'SUBSCRIBED' && isAdmin) {
          await presenceChannel.track({
            role: 'admin',
            online_profiles: virtualProfiles.map((p) => p.id),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [loggedIn, isAdmin, memberSession?.id, virtualProfiles]);

  useEffect(() => {
    if (!loggedIn) return;

    const typingChannel = supabase.channel('typing-indicators', {
      config: { presence: { key: isAdmin ? `typing-admin-${Date.now()}` : `typing-member-${memberSession?.id || Date.now()}` } },
    });

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        let memberTyping = '';
        const adminTypingMap = {};

        Object.values(state).forEach((entries) => {
          entries.forEach((entry) => {
            if (entry.role === 'admin' && entry.typing && memberSession?.id === entry.member_id && selectedProfileId === entry.virtual_profile_id) {
              memberTyping = `${entry.display_name || 'Admin'} yazıyor...`;
            }

            if (entry.role === 'member' && entry.typing) {
              const key = threadKey(entry.member_id, entry.virtual_profile_id);
              adminTypingMap[key] = true;
            }
          });
        });

        setTypingLabel(memberTyping);
        setAdminTypingByThread(adminTypingMap);
      })
      .subscribe(async (state) => {
        if (state === 'SUBSCRIBED') {
          await typingChannel.track({ role: isAdmin ? 'admin' : 'member', typing: false });
        }
      });

    const stopTyping = () => {
      typingChannel.track({
        role: isAdmin ? 'admin' : 'member',
        typing: false,
        member_id: isAdmin ? selectedThread?.member_id : memberSession?.id,
        virtual_profile_id: isAdmin ? selectedThread?.virtual_profile_id : selectedProfileId,
        display_name: isAdmin ? (selectedThread?.virtual_name || 'Admin') : (memberSession?.username || 'Üye'),
      });
    };

    const typingText = isAdmin ? adminReply : newMessage;
    const memberId = isAdmin ? selectedThread?.member_id : memberSession?.id;
    const profileId = isAdmin ? selectedThread?.virtual_profile_id : selectedProfileId;

    if (memberId && profileId && typingText.trim()) {
      typingChannel.track({
        role: isAdmin ? 'admin' : 'member',
        typing: true,
        member_id: memberId,
        virtual_profile_id: profileId,
        display_name: isAdmin ? (selectedThread?.virtual_name || 'Admin') : (memberSession?.username || 'Üye'),
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(stopTyping, 1300);
    } else {
      stopTyping();
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(typingChannel);
    };
  }, [loggedIn, isAdmin, newMessage, adminReply, selectedProfileId, selectedThread, memberSession]);

  async function uploadImage(file, folder) {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('profile-images').upload(path, file, { upsert: true });
    if (uploadError) {
      setStatus(`Görsel yükleme hatası: ${uploadError.message}`);
      return null;
    }

    const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function fetchOwnProfile() {
    const { data, error } = await supabase
      .from('member_profiles')
      .select('*')
      .eq('member_id', memberSession.id)
      .maybeSingle();

    if (error) return setStatus(error.message);
    if (!data) return setMemberProfile(initialMemberProfile);

    setMemberProfile({
      age: data.age || '',
      hobbies: data.hobbies || '',
      city: data.city || '',
      photo_url: data.photo_url || '',
      status_emoji: data.status_emoji || '🙂',
    });
  }

  async function saveOwnProfile() {
    if (!memberSession) return;

    const payload = {
      member_id: memberSession.id,
      age: memberProfile.age ? Number(memberProfile.age) : null,
      hobbies: memberProfile.hobbies,
      city: memberProfile.city,
      photo_url: memberProfile.photo_url,
      status_emoji: memberProfile.status_emoji,
    };

    const { error } = await supabase
      .from('member_profiles')
      .upsert(payload, { onConflict: 'member_id' });

    if (error) return setStatus(error.message);
    setStatus('Profil bilgilerin kaydedildi.');
  }

  function handleSignOut() {
    signOut(() => {
      setSelectedProfileId(null);
      setMessages([]);
      setIncomingThreads([]);
      setSelectedThread(null);
      setUnreadByProfile({});
      setAdminUnreadByThread({});
      setTypingLabel('');
      setUserView('discover');
    });
  }

  async function fetchVirtualProfiles() {
    try {
      const data = await selectRows('virtual_profiles', (q) => q.order('created_at', { ascending: true }));
      setVirtualProfiles(data || []);
      if (!selectedProfileId && data?.length) setSelectedProfileId(data[0].id);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function fetchUnreadCounts() {
    if (!memberSession || isAdmin) return;
    const { data, error } = await supabase
      .from('messages')
      .select('virtual_profile_id')
      .eq('member_id', memberSession.id)
      .eq('sender_role', 'virtual')
      .eq('seen_by_member', false);

    if (error) return setStatus(error.message);

    const counts = (data || []).reduce((acc, row) => {
      const key = row.virtual_profile_id;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    setUnreadByProfile(counts);
  }

  async function fetchMessages(profileId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('virtual_profile_id', profileId)
      .eq('member_id', memberSession.id)
      .order('created_at', { ascending: true });

    if (error) return setStatus(error.message);
    setMessages(data || []);

    await supabase
      .from('messages')
      .update({ seen_by_member: true, seen_by_member_at: new Date().toISOString() })
      .eq('virtual_profile_id', profileId)
      .eq('member_id', memberSession.id)
      .eq('sender_role', 'virtual')
      .eq('seen_by_member', false);

    setUnreadByProfile((prev) => ({ ...prev, [profileId]: 0 }));
  }

  async function sendMessage() {
    if (!memberSession || !selectedProfileId || !newMessage.trim()) return;

    const { data: memberExists } = await supabase
      .from('members')
      .select('id')
      .eq('id', memberSession.id)
      .maybeSingle();

    if (!memberExists) {
      return setStatus('Oturum üyeliği veritabanında bulunamadı. Lütfen çıkış yapıp tekrar giriş yap.');
    }

    const slashCommands = {
      '/selam': 'Selam 👋',
      '/kahve': 'Kahve içelim mi? ☕',
    };
    const normalizedMessage = slashCommands[newMessage.trim().toLowerCase()] || newMessage.trim();

    const { error } = await supabase.from('messages').insert({
      member_id: memberSession.id,
      virtual_profile_id: selectedProfileId,
      sender_role: 'member',
      content: normalizedMessage,
      seen_by_member: true,
      seen_by_admin: false,
    });
    if (error) return setStatus(error.message);
    recordEngagement('member_message', memberSession.id, selectedProfileId, { source: 'chat_input' });
    setNewMessage('');
    fetchMessages(selectedProfileId);
  }

  async function sendReaction(profileId, reactionType) {
    if (!memberSession || !profileId) return;
    const templates = {
      heart: '💘 Kalp gönderdim.',
      wave: '👋 Selam, sana el salladım.',
      like: '👍 Profilini beğendim.',
    };
    const content = templates[reactionType];
    if (!content) return;

    const { error } = await supabase.from('messages').insert({
      member_id: memberSession.id,
      virtual_profile_id: profileId,
      sender_role: 'member',
      content,
      seen_by_member: true,
      seen_by_admin: false,
    });
    if (error) return setStatus(error.message);
    recordEngagement('member_message', memberSession.id, profileId, { source: `reaction_${reactionType}` });
    setStatus('Etkileşim mesajı gönderildi.');
  }

  async function createVirtualProfile() {
    const auto = buildRandomVirtualProfile();
    const payload = {
      name: profileForm.name || auto.name,
      age: Number(profileForm.age || auto.age),
      city: profileForm.city || auto.city,
      gender: profileForm.gender || 'Kadın',
      hobbies: profileForm.hobbies || auto.hobbies,
      photo_url: profileForm.photo_url,
    };

    if (!payload.photo_url) return setStatus('Fotoğraf yükleyip Kaydet tuşuna bas. İsim/şehir/yaş otomatik üretilecek.');

    let { error } = await supabase.from('virtual_profiles').insert(payload);

    if (error?.message?.includes("Could not find the 'photo_url' column")) {
      const retry = await supabase.from('virtual_profiles').insert({
        name: payload.name,
        age: payload.age,
        city: payload.city,
        gender: payload.gender,
        hobbies: payload.hobbies,
      });
      error = retry.error;
      if (!error) {
        setStatus("Profil kaydedildi. Fotoğraf kolonu henüz migration almadığı için görsel eklenmedi. SQL migration'ı tekrar çalıştır.");
      }
    }

    if (error) return setStatus(error.message);
    setProfileForm(initialProfile);
    fetchVirtualProfiles();
    fetchIncomingThreads();
    setStatus(`Sanal profil oluşturuldu: ${payload.name}, ${payload.city}`);
  }

  async function fetchIncomingThreads() {
    try {
      const data = await selectRows('admin_threads', (q) => q.order('last_message_at', { ascending: false }));
      setIncomingThreads(data || []);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function recordEngagement(eventType, memberId, virtualProfileId, meta = {}) {
    try {
      await supabase.from('engagement_events').insert({
        event_type: eventType,
        member_id: memberId,
        virtual_profile_id: virtualProfileId,
        meta,
      });
    } catch {
      // tablo kurulmamışsa akışı bozma
    }
  }

  async function fetchEngagementInsights() {
    if (!isAdmin) return;
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
    let rows = [];

    const events = await supabase
      .from('engagement_events')
      .select('created_at, virtual_profile_id, event_type')
      .eq('event_type', 'member_message')
      .gte('created_at', since);

    if (!events.error && events.data?.length) {
      rows = events.data;
    } else {
      const fallback = await supabase
        .from('messages')
        .select('created_at, virtual_profile_id, sender_role')
        .eq('sender_role', 'member')
        .gte('created_at', since);
      rows = (fallback.data || []).map((r) => ({ ...r, event_type: 'member_message' }));
    }

    const hourMap = new Map();
    const profileMap = new Map();
    rows.forEach((row) => {
      const d = new Date(row.created_at);
      const h = Number.isNaN(d.getTime()) ? 0 : d.getHours();
      hourMap.set(h, (hourMap.get(h) || 0) + 1);
      profileMap.set(row.virtual_profile_id, (profileMap.get(row.virtual_profile_id) || 0) + 1);
    });

    const topHours = [...hourMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ label: `${String(hour).padStart(2, '0')}:00`, count }));

    const topProfiles = [...profileMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([profileId, count]) => ({
        name: profileById[profileId]?.name || 'Bilinmeyen Profil',
        count,
      }));

    setEngagementInsights({ topHours, topProfiles });
  }

  async function fetchAdminStats() {
    if (!isAdmin) return;
    const start = new Date();
    if (statsRange === 'daily') {
      start.setHours(0, 0, 0, 0);
    } else if (statsRange === 'weekly') {
      start.setDate(start.getDate() - 7);
    } else {
      start.setMonth(start.getMonth() - 1);
    }
    const startIso = start.toISOString();

    const [{ data: todayMessages, error: msgErr }, { data: todayMembers, error: memberErr }] = await Promise.all([
      supabase
        .from('messages')
        .select('member_id, virtual_profile_id, sender_role, created_at')
        .gte('created_at', startIso),
      supabase
        .from('members')
        .select('id, created_at')
        .gte('created_at', startIso),
    ]);

    if (msgErr || memberErr) {
      setStatus(msgErr?.message || memberErr?.message || 'Stats alınamadı.');
      return;
    }

    const messages = todayMessages || [];
    const memberMessages = messages.filter((m) => m.sender_role === 'member');
    const adminReplies = messages.filter((m) => m.sender_role === 'virtual');

    const activeThreadKeys = new Set(messages.map((m) => `${m.member_id}::${m.virtual_profile_id}`));
    const respondedThreadKeys = new Set();
    const responseMinutes = [];

    const grouped = new Map();
    messages.forEach((m) => {
      const key = `${m.member_id}::${m.virtual_profile_id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(m);
    });

    grouped.forEach((rows, key) => {
      rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      let lastMemberTs = null;
      rows.forEach((row) => {
        if (row.sender_role === 'member') {
          lastMemberTs = row.created_at;
        } else if (row.sender_role === 'virtual' && lastMemberTs) {
          respondedThreadKeys.add(key);
          const diffMin = (new Date(row.created_at).getTime() - new Date(lastMemberTs).getTime()) / 60000;
          if (diffMin >= 0) responseMinutes.push(diffMin);
          lastMemberTs = null;
        }
      });
    });

    const avgResponseMinToday = responseMinutes.length
      ? responseMinutes.reduce((a, b) => a + b, 0) / responseMinutes.length
      : 0;

    setAdminStats({
      totalMessagesToday: messages.length,
      memberMessagesToday: memberMessages.length,
      adminRepliesToday: adminReplies.length,
      respondedThreadsToday: respondedThreadKeys.size,
      newMembersToday: (todayMembers || []).length,
      activeThreadsToday: activeThreadKeys.size,
      avgResponseMinToday,
    });
  }

  async function fetchThreadMessages(memberId, profileId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('member_id', memberId)
      .eq('virtual_profile_id', profileId)
      .order('created_at', { ascending: true });

    if (error) return setStatus(error.message);
    setThreadMessages(data || []);

    await supabase
      .from('messages')
      .update({ seen_by_admin: true, seen_by_admin_at: new Date().toISOString() })
      .eq('member_id', memberId)
      .eq('virtual_profile_id', profileId)
      .eq('sender_role', 'member')
      .eq('seen_by_admin', false);
  }

  async function fetchQuickFacts(memberId, profileId) {
    const { data, error } = await supabase
      .from('thread_quick_facts')
      .select('notes')
      .eq('member_id', memberId)
      .eq('virtual_profile_id', profileId)
      .maybeSingle();
    if (error) return;
    setQuickFactsText(data?.notes || '');
  }

  async function fetchMemberProfile(memberId) {
    const { data, error } = await supabase
      .from('member_profiles')
      .select('age, hobbies, city, photo_url, status_emoji')
      .eq('member_id', memberId)
      .maybeSingle();
    if (error) return setSelectedMemberProfile(null);
    setSelectedMemberProfile(data || null);
  }

  async function saveQuickFacts() {
    if (!selectedThread) return;
    const { error } = await supabase
      .from('thread_quick_facts')
      .upsert({
        member_id: selectedThread.member_id,
        virtual_profile_id: selectedThread.virtual_profile_id,
        notes: quickFactsText,
      }, { onConflict: 'member_id,virtual_profile_id' });
    if (error) return setStatus(error.message);
    setStatus('Quick Facts kaydedildi.');
  }

  async function fetchRegisteredMembers() {
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from('members')
      .select('id, username, created_at')
      .order('created_at', { ascending: false });
    setLoadingMembers(false);
    if (error) return setStatus(error.message);
    setRegisteredMembers(data || []);
  }

  async function deleteMember(memberId) {
    const { error } = await supabase.from('members').delete().eq('id', memberId);
    if (error) return setStatus(error.message);
    setRegisteredMembers((prev) => prev.filter((m) => m.id !== memberId));
    setStatus('Kullanıcı silindi.');
  }

  function openChatWithProfile(profileId) {
    setSelectedProfileId(profileId);
    setUserView('chat');
  }

  async function sendAdminReply() {
    if (!selectedThread || !adminReply.trim()) return;
    const { error } = await supabase.from('messages').insert({
      member_id: selectedThread.member_id,
      virtual_profile_id: selectedThread.virtual_profile_id,
      sender_role: 'virtual',
      content: adminReply.trim(),
      seen_by_member: false,
      seen_by_admin: true,
    });
    if (error) return setStatus(error.message);
    recordEngagement('admin_reply', selectedThread.member_id, selectedThread.virtual_profile_id, { source: 'admin_reply' });
    setAdminReply('');
    setAiSuggestions([]);
    fetchIncomingThreads();
    fetchThreadMessages(selectedThread.member_id, selectedThread.virtual_profile_id);
    fetchEngagementInsights();
    setStatus('Yanıt gönderildi.');
  }

  async function updateSelectedThreadTag(tag) {
    if (!selectedThread) return;
    try {
      await updateRows(
        'admin_threads',
        { status_tag: tag },
        (q) => q.eq('member_id', selectedThread.member_id).eq('virtual_profile_id', selectedThread.virtual_profile_id)
      );
      await insertRows('thread_events', {
        member_id: selectedThread.member_id,
        virtual_profile_id: selectedThread.virtual_profile_id,
        event_type: 'status_change',
        meta: { status_tag: tag },
      });
    } catch (error) {
      return setStatus(error.message);
    }
    setSelectedThread((prev) => (prev ? { ...prev, status_tag: tag } : prev));
    fetchIncomingThreads();
  }

  async function sendBulkTemplate() {
    const selectedKeys = Object.keys(selectedThreadKeys).filter((k) => selectedThreadKeys[k]);
    if (!selectedKeys.length) return setStatus('Önce en az bir thread seç.');
    if (!bulkTemplate.trim()) return;

    const rows = selectedKeys.map((key) => {
      const [member_id, virtual_profile_id] = key.split('::');
      return {
        member_id,
        virtual_profile_id,
        sender_role: 'virtual',
        content: bulkTemplate,
        seen_by_member: false,
        seen_by_admin: true,
      };
    });

    try {
      await insertRows('messages', rows);
      await insertRows('thread_events', rows.map((row) => ({
        member_id: row.member_id,
        virtual_profile_id: row.virtual_profile_id,
        event_type: 'bulk_sent',
        meta: { template: bulkTemplate },
      })));
    } catch (error) {
      return setStatus(error.message);
    }
    setSelectedThreadKeys({});
    setStatus(`${rows.length} thread için bulk mesaj gönderildi.`);
    fetchIncomingThreads();
  }

  async function fetchAiSuggestions() {
    if (!OPENAI_API_KEY) return setStatus('AI önerileri için VITE_OPENAI_API_KEY tanımla.');
    if (!selectedThread || !threadMessages.length) return;

    const lastMemberMessage = [...threadMessages].reverse().find((m) => m.sender_role === 'member')?.content;
    if (!lastMemberMessage) return;

    setLoadingSuggestions(true);
    setStatus('');

    const prompt = `Kullanıcı mesajı: "${lastMemberMessage}". Flört uygulaması için 3 kısa ve doğal Türkçe cevap öner.`;

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: prompt,
      }),
    });

    setLoadingSuggestions(false);
    if (!res.ok) {
      const txt = await res.text();
      return setStatus(`AI önerisi alınamadı: ${txt}`);
    }

    const data = await res.json();
    const outText = data.output_text || '';
    const lines = outText
      .split('\n')
      .map((l) => l.replace(/^\d+[\).\-]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
    setAiSuggestions(lines);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 font-sans selection:bg-zinc-200 antialiased pb-10">
      {/* HEADER - Clean, white, border-b */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-zinc-900" /> Flort.
        </h1>
        <div className="flex items-center gap-2">
          {isAdmin && loggedIn && (
            <div className="flex items-center gap-1 mr-4 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
              <button className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${adminTab === 'chat' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-900'}`} onClick={() => setAdminTab('chat')}>Chat</button>
              <button className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${adminTab === 'stats' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-900'}`} onClick={() => setAdminTab('stats')}>Stats</button>
              <button className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${adminTab === 'settings' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-900'}`} onClick={() => setAdminTab('settings')}>Ayarlar</button>
            </div>
          )}
          {loggedIn && !isAdmin && (
            <div className="flex items-center gap-2 mr-4 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
              <button className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${userView === 'discover' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`} onClick={() => setUserView('discover')}>Keşfet</button>
              <button className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${userView === 'chat' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`} onClick={() => setUserView('chat')}>
                Mesajlar
                {totalUnreadCount > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-600" />}
              </button>
              <button className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${userView === 'profile' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`} onClick={() => setUserView('profile')}>Profil</button>
            </div>
          )}
          {!loggedIn && (
            <button className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors" onClick={() => setMode(mode === 'user' ? 'admin' : 'user')}>
              {mode === 'user' ? 'Admin Girişi' : 'Kullanıcı Girişi'}
            </button>
          )}
          {loggedIn && (
            <button className="rounded-lg border border-zinc-200 bg-white px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors" onClick={handleSignOut}>
              Çıkış
            </button>
          )}
        </div>
      </header>

      {/* LOGIN VIEW */}
      {!loggedIn ? (
        <section className="flex min-h-[80vh] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
                {mode === 'admin' ? 'Yönetici Girişi' : 'Sisteme Giriş Yap'}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Lütfen hesap bilgilerinizi giriniz.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Kullanıcı Adı</label>
                <input
                  type="text"
                  placeholder={mode === 'admin' ? 'Kapalı' : 'Kullanıcı adınız'}
                  disabled={mode === 'admin'}
                  value={mode === 'admin' ? '' : authForm.username}
                  onChange={(e) => setAuthForm((st) => ({ ...st, username: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Şifre</label>
                <input
                  type="password"
                  placeholder="Şifreniz"
                  value={authForm.password}
                  onChange={(e) => setAuthForm((st) => ({ ...st, password: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                />
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button
                disabled={loading}
                onClick={signIn}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? 'İşleniyor...' : 'Giriş Yap'}
              </button>
              {mode !== 'admin' && (
                <button
                  disabled={loading}
                  onClick={signUp}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                >
                  Yeni Hesap Oluştur
                </button>
              )}
            </div>
          </div>
        </section>

      // ADMIN DASHBOARD
      ) : isAdmin ? (
        <main className="mx-auto max-w-[1400px] p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-5rem)]">
          {/* Admin Sol Menü */}
          <aside className="col-span-1 lg:col-span-3 flex flex-col gap-4 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hide-scrollbar">
            {selectedThread && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Aktif Kullanıcı</h4>
                <div className="flex items-center gap-3 mb-3">
                  {selectedMemberProfile?.photo_url ? <img src={selectedMemberProfile.photo_url} alt="" className="h-10 w-10 rounded-full object-cover border border-zinc-200" /> : <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center font-medium text-zinc-600">{selectedThread.member_username?.slice(0,1)}</div>}
                  <div>
                    <p className="font-medium text-zinc-900">{selectedThread.member_username}</p>
                    <p className="text-xs text-zinc-500">{selectedMemberProfile?.city || '-'} • {selectedMemberProfile?.age || '-'} yaş</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col flex-1 overflow-hidden">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 sticky top-0 bg-white py-2 z-10">Gelen Kutusu</h3>
              <div className="flex flex-col gap-1 overflow-y-auto hide-scrollbar" ref={threadQueueRef}>
                {sortedIncomingThreads.map((thread) => {
                  const threadProfile = profileById[thread.virtual_profile_id];
                  const waitingReply = thread.last_sender_role === 'member';
                  const isActive = selectedThread?.member_id === thread.member_id && selectedThread?.virtual_profile_id === thread.virtual_profile_id;
                  
                  return (
                    <div
                      key={`${thread.member_id}-${thread.virtual_profile_id}`}
                      onClick={() => setSelectedThread(thread)}
                      className={`group cursor-pointer flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${isActive ? 'border-zinc-300 bg-zinc-100' : 'border-transparent hover:bg-zinc-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedThreadKeys[threadKey(thread.member_id, thread.virtual_profile_id)]}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setSelectedThreadKeys((prev) => ({
                            ...prev,
                            [threadKey(thread.member_id, thread.virtual_profile_id)]: e.target.checked,
                          }))
                        }
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900/20"
                      />
                      <div className="relative">
                        {threadProfile?.photo_url ? (
                          <img src={threadProfile.photo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-zinc-200" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-xs font-medium">{thread.virtual_name?.slice(0, 1)}</div>
                        )}
                        {adminUnreadByThread[threadKey(thread.member_id, thread.virtual_profile_id)] > 0 && (
                          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-zinc-900 text-white text-[9px] font-medium flex items-center justify-center">{adminUnreadByThread[threadKey(thread.member_id, thread.virtual_profile_id)]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {thread.member_username} <span className="text-zinc-400 font-normal">→</span> {thread.virtual_name}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {adminTypingByThread[threadKey(thread.member_id, thread.virtual_profile_id)] ? <span className="text-zinc-900 italic">Yazıyor...</span> : thread.last_message_content || 'Mesaj yok'}
                        </p>
                      </div>
                      {waitingReply && <div className="h-2 w-2 rounded-full bg-blue-600" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm mt-auto">
               <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Metrikler</h4>
               <div className="flex justify-between items-center mb-1">
                 <span className="text-zinc-600">Bekleyen:</span>
                 <span className="font-medium text-zinc-900">{slaStats.waitingCount}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-zinc-600">Ort. Yanıt:</span>
                 <span className="font-medium text-zinc-900">{slaStats.avgWaitMin > 0 && slaStats.avgWaitMin < 1 ? '<1 dk' : `${slaStats.avgWaitMin.toFixed(1)} dk`}</span>
               </div>
            </div>
          </aside>

          {/* Admin Orta Alan */}
          <section className="col-span-1 lg:col-span-6 flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            {adminTab === 'chat' && (
              <>
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 bg-zinc-50/50">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900">{selectedThread?.virtual_name || 'Sohbet Seçilmedi'}</h3>
                    {selectedThreadProfile && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${onlineProfiles[selectedThreadProfile.id] ? 'bg-green-500' : 'bg-zinc-300'}`} />
                        <span className="text-xs text-zinc-500">{onlineProfiles[selectedThreadProfile.id] ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedThread?.status_tag || 'takip_edilecek'}
                      onChange={(e) => updateSelectedThreadTag(e.target.value)}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5"
                    >
                      {THREAD_TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                    <button type="button" className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors" onClick={() => setAdminDrawerOpen(!adminDrawerOpen)}>
                      Paneli {adminDrawerOpen ? 'Gizle' : 'Aç'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar" ref={adminChatBoxRef}>
                  {threadMessages.map((msg) => {
                    const audioUrl = getAudioUrl(msg.content);
                    const isMember = msg.sender_role === 'member';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMember ? 'items-start' : 'items-end'}`}>
                        <span className="text-[10px] font-medium text-zinc-400 mb-1 ml-1">{isMember ? selectedThread?.member_username : selectedThread?.virtual_name}</span>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px] ${isMember ? 'bg-zinc-100 text-zinc-900 rounded-tl-sm border border-zinc-200/50' : 'bg-zinc-900 text-white rounded-tr-sm'}`}>
                          {audioUrl ? <audio controls src={audioUrl} className="h-8 max-w-[200px]" /> : <p className="leading-relaxed">{msg.content}</p>}
                        </div>
                        <div className="flex items-center gap-1 mt-1 mr-1 text-[10px] text-zinc-400">
                          {formatTime(msg.created_at)}
                          {!isMember && <span className={msg.seen_by_member ? 'text-blue-500' : 'text-zinc-400'}>✓✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-zinc-200 bg-zinc-50">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {QUICK_REPLIES.map((reply) => (
                      <button key={reply} type="button" className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors" onClick={() => setAdminReply((prev) => `${prev ? `${prev}\n` : ''}${reply}`)}>{reply}</button>
                    ))}
                    <button type="button" className="rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 transition-colors" onClick={fetchAiSuggestions} disabled={loadingSuggestions}>
                      {loadingSuggestions ? 'Düşünüyor...' : 'AI Önerisi'}
                    </button>
                  </div>
                  {!!aiSuggestions.length && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {aiSuggestions.map((suggestion) => (
                        <button key={suggestion} type="button" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-left text-zinc-700 hover:bg-zinc-50 transition-colors" onClick={() => setAdminReply(suggestion)}>{suggestion}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <textarea
                      className="flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 min-h-[44px] max-h-[120px] hide-scrollbar"
                      placeholder="Mesaj yazın..."
                      value={adminReply}
                      onChange={(e) => { setAdminReply(e.target.value); autoResizeTextarea(e.target, 120); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminReply(); } }}
                    />
                    <button onClick={sendAdminReply} className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors h-[44px] px-4 font-medium text-sm flex items-center justify-center">
                      Gönder
                    </button>
                  </div>
                </div>
              </>
            )}

            {adminTab === 'stats' && (
              <div className="p-8 overflow-y-auto hide-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-semibold text-zinc-900">Sistem İstatistikleri</h3>
                  <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
                    {['daily', 'weekly', 'monthly'].map((r) => (
                      <button key={r} type="button" className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${statsRange === r ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-900'}`} onClick={() => setStatsRange(r)}>
                        {r === 'daily' ? 'Günlük' : r === 'weekly' ? 'Haftalık' : 'Aylık'}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="rounded-xl border border-zinc-200 p-5 bg-white shadow-sm">
                    <p className="text-sm font-medium text-zinc-500 mb-1">Toplam Mesaj</p>
                    <p className="text-2xl font-semibold text-zinc-900">{adminStats.totalMessagesToday}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 p-5 bg-white shadow-sm">
                    <p className="text-sm font-medium text-zinc-500 mb-1">Yeni Üye</p>
                    <p className="text-2xl font-semibold text-zinc-900">{adminStats.newMembersToday}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 p-5 bg-white shadow-sm">
                    <p className="text-sm font-medium text-zinc-500 mb-1">Aktif Thread</p>
                    <p className="text-2xl font-semibold text-zinc-900">{adminStats.activeThreadsToday}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 p-5 bg-white shadow-sm">
                    <p className="text-sm font-medium text-zinc-500 mb-1">Ortalama Yanıt</p>
                    <p className="text-2xl font-semibold text-zinc-900">{adminStats.avgResponseMinToday.toFixed(1)} dk</p>
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'settings' && (
              <div className="p-8 overflow-y-auto hide-scrollbar space-y-8">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                   <h3 className="text-base font-semibold text-zinc-900 mb-4">Genel Ayarlar</h3>
                   <label className="flex items-center justify-between cursor-pointer">
                     <span className="text-sm text-zinc-700">Sesli bildirimleri etkinleştir</span>
                     <input type="checkbox" className="sr-only peer" checked={notificationSoundEnabled} onChange={(e) => setNotificationSoundEnabled(e.target.checked)} />
                     <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                   </label>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-semibold text-zinc-900">Sanal Profil Oluştur</h3>
                    <button className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors" onClick={fillRandomVirtualProfile}>Rastgele Doldur</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5" placeholder="İsim" value={profileForm.name} onChange={(e) => setProfileForm((s) => ({ ...s, name: e.target.value }))} />
                    <input className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5" placeholder="Yaş" type="number" value={profileForm.age} onChange={(e) => setProfileForm((s) => ({ ...s, age: e.target.value }))} />
                    <input className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5" placeholder="Şehir" value={profileForm.city} onChange={(e) => setProfileForm((s) => ({ ...s, city: e.target.value }))} />
                    <input className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5" placeholder="Cinsiyet" value={profileForm.gender} onChange={(e) => setProfileForm((s) => ({ ...s, gender: e.target.value }))} />
                    <textarea className="col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 min-h-[80px]" placeholder="Hobiler" value={profileForm.hobbies} onChange={(e) => setProfileForm((s) => ({ ...s, hobbies: e.target.value }))} />
                    <div className="col-span-2">
                      <input type="file" accept="image/*" className="hidden" id="admin-photo-upload" onChange={async (e) => { const f = e.target.files?.[0]; if(f) { const u = await uploadImage(f, 'virtual-profiles'); if(u) setProfileForm(s => ({...s, photo_url: u})) } }} />
                      <label htmlFor="admin-photo-upload" className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 px-6 py-8 text-sm font-medium text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer transition-colors">
                        {profileForm.photo_url ? 'Fotoğraf Seçildi' : 'Profil Fotoğrafı Yükle'}
                      </label>
                    </div>
                    <button className="col-span-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors" onClick={createVirtualProfile}>Profili Kaydet</button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Admin Sağ Menü */}
          {adminDrawerOpen && adminTab === 'chat' && (
            <aside className="col-span-1 lg:col-span-3 flex flex-col gap-4 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hide-scrollbar">
              {selectedThreadProfile && (
                <div className="rounded-lg border border-zinc-200 p-4 text-center bg-zinc-50/50">
                  {selectedThreadProfile.photo_url ? (
                    <img src={selectedThreadProfile.photo_url} alt="" className="h-20 w-20 rounded-full object-cover mx-auto mb-3 border border-zinc-200 shadow-sm" />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-zinc-200 mx-auto mb-3 flex items-center justify-center text-xl font-semibold text-zinc-600">{selectedThreadProfile.name?.slice(0,1)}</div>
                  )}
                  <h4 className="text-base font-semibold text-zinc-900">{selectedThreadProfile.name}, {selectedThreadProfile.age}</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">{selectedThreadProfile.city || '-'}</p>
                </div>
              )}

              <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-4 flex flex-col shadow-sm">
                <h4 className="text-xs font-semibold text-zinc-900 mb-2">Hızlı Notlar</h4>
                <textarea
                  className="flex-1 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm text-zinc-700 placeholder:text-zinc-400 outline-none focus:border-zinc-300 min-h-[120px] hide-scrollbar"
                  placeholder="Kullanıcı notları..."
                  value={quickFactsText}
                  onChange={(e) => setQuickFactsText(e.target.value)}
                />
                <button className="mt-2 w-full rounded-md border border-zinc-200 bg-white py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors" onClick={saveQuickFacts}>Kaydet</button>
              </div>

              <div className="rounded-lg border border-zinc-200 p-4 bg-zinc-50/50">
                 <h4 className="text-xs font-semibold text-zinc-900 mb-2">Toplu Şablon Gönderimi</h4>
                 <select className="w-full rounded-md border border-zinc-300 bg-white p-2 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 mb-2" value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value)}>
                   {BULK_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
                 <button className="w-full rounded-md bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors" onClick={sendBulkTemplate}>Seçili Kuyruğa Gönder</button>
              </div>
            </aside>
          )}
        </main>

      // USER DISCOVER VIEW
      ) : userView === 'discover' ? (
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Keşfet</h2>
              <p className="mt-1 text-sm text-zinc-500">Sizin için önerilen eşleşmeler.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input 
                placeholder="Arama..." 
                value={profileSearch} 
                onChange={(e) => setProfileSearch(e.target.value)} 
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 w-48" 
              />
              <select 
                value={genderFilter} 
                onChange={(e) => setGenderFilter(e.target.value)} 
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 bg-white"
              >
                <option value="all">Tümü</option>
                <option value="Kadın">Kadın</option>
                <option value="Erkek">Erkek</option>
              </select>
              <input 
                placeholder="Şehir" 
                value={cityFilter} 
                onChange={(e) => setCityFilter(e.target.value)} 
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 w-32" 
              />
              <select 
                value={discoverSort} 
                onChange={(e) => setDiscoverSort(e.target.value)} 
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 bg-white"
              >
                <option value="match">Önerilenler</option>
                <option value="newest">En Yeniler</option>
                <option value="online">Aktif Olanlar</option>
              </select>
            </div>
          </div>

          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {discoverProfiles.map((profile) => {
              const hobbyBadges = (profile.hobbies || '').split(',').map((h) => h.trim()).filter(Boolean).slice(0, 2);
              const isOnline = !!effectiveOnlineProfiles[profile.id];
              const liked = !!likedProfiles[profile.id];
              
              return (
                <article key={profile.id} className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative h-64 overflow-hidden bg-zinc-100">
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl font-semibold text-zinc-300">{profile.name?.slice(0, 1)}</div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 shadow-sm">
                      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-zinc-400'}`} />
                      <span className="text-[10px] font-medium text-zinc-700">{isOnline ? 'Aktif' : 'Çevrimdışı'}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900">{profile.name}, {profile.age}</h3>
                        <p className="text-sm text-zinc-500">{profile.city || 'Belirtilmemiş'}</p>
                      </div>
                      <button 
                        type="button" 
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${liked ? 'bg-red-50 text-red-500' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`} 
                        onClick={() => setLikedProfiles((s) => ({ ...s, [profile.id]: !s[profile.id] }))}
                      >
                        {liked ? '♥' : '♡'}
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {hobbyBadges.map((hobby) => (
                        <span key={hobby} className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">{hobby}</span>
                      ))}
                    </div>

                    <button 
                      type="button" 
                      className="mt-5 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800" 
                      onClick={() => openChatWithProfile(profile.id)}
                    >
                      Mesaj Gönder
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {!discoverProfiles.length && (
            <div className="rounded-2xl border border-dashed border-zinc-300 py-20 text-center">
              <h3 className="text-sm font-medium text-zinc-900">Sonuç bulunamadı</h3>
              <p className="mt-1 text-sm text-zinc-500">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
            </div>
          )}
        </main>

      // USER CHAT & PROFILE VIEW
      ) : (
        <main className="mx-auto max-w-5xl px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)]">
          {/* Sol Sohbet Listesi */}
          <aside className="col-span-1 lg:col-span-4 flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-4 bg-zinc-50/50">
              <h3 className="font-semibold text-zinc-900">Mesajlar</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar" ref={profileListRef}>
              {sortedProfiles.map((profile) => {
                 const isActive = selectedProfileId === profile.id;
                 const hasUnread = unreadByProfile[profile.id] > 0;
                 return (
                   <button key={profile.id} onClick={() => setSelectedProfileId(profile.id)} className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${isActive ? 'bg-zinc-100' : 'hover:bg-zinc-50'}`}>
                     <div className="relative shrink-0">
                       {profile.photo_url ? (
                         <img src={profile.photo_url} alt="" className="h-12 w-12 rounded-full object-cover border border-zinc-200" />
                       ) : (
                         <div className="h-12 w-12 rounded-full bg-zinc-200 flex items-center justify-center font-medium text-lg text-zinc-600">{profile.name?.slice(0,1)}</div>
                       )}
                       {onlineProfiles[profile.id] && <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <h4 className={`text-sm font-medium truncate ${hasUnread ? 'text-zinc-900 font-semibold' : 'text-zinc-700'}`}>{profile.name}</h4>
                       <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-blue-600 font-medium' : 'text-zinc-500'}`}>
                         {hasUnread ? `Yeni mesaj (${unreadByProfile[profile.id]})` : profile.city || 'Sohbet et'}
                       </p>
                     </div>
                   </button>
                 );
              })}
            </div>
          </aside>

          {/* Orta Alan */}
          <section className="col-span-1 lg:col-span-8 flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            {userView === 'profile' ? (
               <div className="p-8 max-w-lg mx-auto w-full overflow-y-auto hide-scrollbar">
                 <h2 className="text-xl font-semibold text-zinc-900 mb-6">Profil Ayarları</h2>
                 
                 <div className="flex items-center gap-5 mb-8">
                   <div className="relative group cursor-pointer shrink-0">
                     {memberProfile.photo_url ? (
                       <img src={memberProfile.photo_url} alt="" className="h-20 w-20 rounded-full object-cover border border-zinc-200" />
                     ) : (
                       <div className="h-20 w-20 rounded-full bg-zinc-100 flex items-center justify-center text-2xl text-zinc-400 border border-zinc-200">👤</div>
                     )}
                     <label htmlFor="member-photo-upload" className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Değiştir</span>
                     </label>
                     <input id="member-photo-upload" type="file" accept="image/*" className="hidden" onChange={async(e)=>{ const f=e.target.files?.[0]; if(!f)return; const u=await uploadImage(f,'members'); if(u) setMemberProfile(s=>({...s,photo_url:u})); }} />
                   </div>
                   <div>
                     <p className="text-lg font-medium text-zinc-900">{memberSession?.username}</p>
                     <p className="text-sm text-zinc-500">Bilgilerinizi güncelleyin.</p>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-xs font-medium text-zinc-700 block mb-1">Yaş</label>
                       <input type="number" placeholder="Yaşınız" value={memberProfile.age} onChange={(e)=>setMemberProfile(s=>({...s,age:e.target.value}))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5" />
                     </div>
                     <div>
                       <label className="text-xs font-medium text-zinc-700 block mb-1">Şehir</label>
                       <input placeholder="Şehriniz" value={memberProfile.city} onChange={(e)=>setMemberProfile(s=>({...s,city:e.target.value}))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5" />
                     </div>
                   </div>
                   <div>
                     <label className="text-xs font-medium text-zinc-700 block mb-1">Durum</label>
                     <select value={memberProfile.status_emoji} onChange={(e)=>setMemberProfile(s=>({...s,status_emoji:e.target.value}))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 bg-white">
                       <option value="🙂">🙂 Normal</option>
                       <option value="☕">☕ Kahve</option>
                       <option value="💃">💃 Eğlence</option>
                       <option value="🎧">🎧 Müzik</option>
                       <option value="🌙">🌙 Dinlenme</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-xs font-medium text-zinc-700 block mb-1">İlgi Alanları</label>
                     <textarea placeholder="Virgülle ayırarak yazın..." value={memberProfile.hobbies} onChange={(e)=>setMemberProfile(s=>({...s,hobbies:e.target.value}))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 min-h-[100px] resize-none" />
                   </div>
                   <button onClick={saveOwnProfile} className="w-full rounded-lg bg-zinc-900 py-2.5 font-medium text-sm text-white hover:bg-zinc-800 transition-colors mt-2">Kaydet</button>
                 </div>
               </div>
            ) : (
              // Chat Bölümü
              selectedProfile ? (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-zinc-200 bg-zinc-50/50">
                    <div className="flex items-center gap-3">
                      {selectedProfile.photo_url ? <img src={selectedProfile.photo_url} alt="" className="h-10 w-10 rounded-full object-cover border border-zinc-200" /> : <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center font-medium text-zinc-600">{selectedProfile.name?.slice(0,1)}</div>}
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">{selectedProfile.name}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">{selectedProfile.city || '-'} • Uyum: %{interestScore}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4 hide-scrollbar" ref={chatBoxRef}>
                    {messages.map((msg) => {
                      const audioUrl = getAudioUrl(msg.content);
                      const isMe = msg.sender_role === 'member';
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-zinc-900 text-white rounded-tr-sm' : 'bg-zinc-100 text-zinc-900 rounded-tl-sm border border-zinc-200/50'}`}>
                            {audioUrl ? <audio controls src={audioUrl} className="h-8 max-w-[200px]" /> : <p className="leading-relaxed">{msg.content}</p>}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-400 font-medium px-1">
                            {formatTime(msg.created_at)}
                            {isMe && <span className={msg.seen_by_admin ? 'text-blue-500' : 'text-zinc-400'}>✓✓</span>}
                          </div>
                        </div>
                      );
                    })}
                    {typingLabel && <div className="text-xs text-zinc-500 italic font-medium px-1">Yazıyor...</div>}
                  </div>

                  <div className="p-4 border-t border-zinc-200 bg-zinc-50">
                    <div className="flex items-end gap-2 bg-white rounded-xl border border-zinc-300 p-1.5 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-900/5 transition-shadow">
                      <textarea
                        className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none min-h-[40px] max-h-[120px] hide-scrollbar"
                        placeholder="Bir mesaj yazın..."
                        value={newMessage}
                        onChange={(e) => { setNewMessage(e.target.value); autoResizeTextarea(e.target, 120); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      />
                      <button onClick={sendMessage} className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors h-[40px]">
                        Gönder
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-zinc-50/50">
                   <div className="h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4 text-zinc-400 text-2xl border border-zinc-200">💬</div>
                   <h3 className="text-base font-medium text-zinc-900 mb-1">Sohbet Seçilmedi</h3>
                   <p className="text-sm text-zinc-500 max-w-[250px]">Soldaki listeden birini seçin veya yeni kişilerle tanışmak için keşfete gidin.</p>
                </div>
              )
            )}
          </section>
        </main>
      )}

      {/* TOAST NOTIFICATION */}
      {status && (
        <div className="fixed bottom-6 right-6 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-lg z-[100] flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          {status}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { width: 0px; height: 0px; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
