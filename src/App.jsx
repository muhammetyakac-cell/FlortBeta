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
  const ranked = [...list].map((profile) => ({ id: profile.id, score: hashToInt(`${hourKey}-${profile.id}`) })).sort((a, b) => a.score - b.score);
  ranked.forEach((item, index) => { map[item.id] = index < targetOnlineCount; });
  return map;
}

export default function App() {
  const [status, setStatus] = useState('');

  const { mode, setMode, authForm, setAuthForm, loading, memberSession, isAdmin, signIn, signUp, signOut } = useAuth({ adminPasswords: [ADMIN_PASSWORD, ADMIN_PASSWORD2], setStatus });

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

  // Inject premium fonts & global overrides
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Outfit:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      :root {
        --noir: #080608;
        --deep: #100d10;
        --surface: #181318;
        --surface2: #221a22;
        --border: rgba(232,160,176,0.15);
        --border2: rgba(255,255,255,0.08);
        --rose: #e8a0b0;
        --rose2: #c97090;
        --gold: #c9a86c;
        --cream: #f5ede8;
        --muted: #8a7a84;
        --text: #f0e8ec;
        --text2: #b8a8b0;
        --font-display: 'Cormorant Garamond', Georgia, serif;
        --font-body: 'Outfit', system-ui, sans-serif;
      }
      body { font-family: var(--font-body); background: var(--noir); color: var(--text); margin: 0; }
      input, textarea, select, button { font-family: var(--font-body); }

      /* ── LAYOUT ── */
      .layout { display: flex; flex-direction: column; min-height: 100vh; max-width: 1480px; margin: 0 auto; padding: 0 1rem 2rem; gap: 0; }
      .layout-admin { padding: 0; max-width: 100%; }

      /* ── TOPBAR ── */
      .topbar {
        display: flex; align-items: center; justify-content: space-between;
        padding: 1rem 1.5rem; border-bottom: 1px solid var(--border);
        background: rgba(8,6,8,0.85); backdrop-filter: blur(20px);
        position: sticky; top: 0; z-index: 100;
      }
      .topbar-admin { padding: 0.75rem 1.25rem; }
      .brand { font-family: var(--font-display); font-size: 1.65rem; font-weight: 500; color: var(--cream); margin: 0; letter-spacing: 0.02em; display: flex; align-items: center; gap: 0.35rem; }
      .brand-icon { color: var(--rose); font-style: italic; }
      .topbar-actions { display: flex; align-items: center; gap: 0.75rem; }
      .linkish { background: none; border: 1px solid var(--border); color: var(--muted); font-size: 0.78rem; padding: 0.4rem 0.9rem; border-radius: 999px; cursor: pointer; letter-spacing: 0.05em; transition: all 0.2s; }
      .linkish:hover { border-color: var(--rose); color: var(--rose); }

      /* Admin nav pills */
      .admin-nav-pills { display: flex; gap: 0.25rem; background: var(--surface); border-radius: 999px; padding: 0.25rem; border: 1px solid var(--border); }
      .nav-pill { background: none; border: none; color: var(--muted); font-size: 0.8rem; font-weight: 500; padding: 0.4rem 1rem; border-radius: 999px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.03em; }
      .nav-pill.active { background: var(--rose2); color: #fff; }
      .nav-dot { display: inline-block; width: 7px; height: 7px; background: var(--rose); border-radius: 50%; margin-left: 5px; vertical-align: middle; animation: pulse 2s infinite; }
      @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.85); } }

      /* ── ADMIN SHELL ── */
      .admin-modern { display: grid; grid-template-columns: 300px 1fr; height: calc(100vh - 57px); overflow: hidden; }
      .admin-ops { grid-template-columns: 300px 1fr 280px; }
      .compact-shell {}
      .card { background: var(--deep); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
      .admin-left { overflow-y: auto; }
      .admin-center { flex: 1; overflow: hidden; }
      .admin-right { background: var(--surface); border-left: 1px solid var(--border); border-right: none; overflow-y: auto; }
      .drawer-panel {}
      .drawer-toggle { background: none; border: 1px solid var(--border); color: var(--muted); font-size: 0.72rem; padding: 0.3rem 0.7rem; border-radius: 6px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
      .drawer-toggle:hover { border-color: var(--rose); color: var(--rose); }

      .panel-title-row { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
      .panel-head { background: var(--surface); }
      .panel-divider { border-bottom: 1px solid var(--border); margin-bottom: 0.5rem; }
      .panel-head h3 { margin: 0; font-size: 0.8rem; font-weight: 600; color: var(--text2); letter-spacing: 0.08em; text-transform: uppercase; }
      .icon-dice { background: none; border: 1px solid var(--border); color: var(--gold); font-size: 1rem; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
      .icon-dice:hover { background: var(--gold); color: var(--noir); }

      /* Thread queue */
      .thread-queue { flex: 1; overflow-y: auto; }
      .modern-thread-queue { }
      .thread-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 1rem; border-bottom: 1px solid var(--border2); background: none; border-left: none; border-right: none; border-top: none; color: var(--text); cursor: pointer; text-align: left; width: 100%; transition: background 0.15s; }
      .thread-item:hover { background: var(--surface); }
      .thread-item.active { background: rgba(201,112,144,0.12); border-left: 2px solid var(--rose2); }
      .thread-item.modern {}
      .thread-avatar-wrap { position: relative; flex-shrink: 0; }
      .thread-avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--border); }
      .thread-avatar-fallback { width: 38px; height: 38px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 1rem; color: var(--rose); border: 1.5px solid var(--border); }
      .thread-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
      .thread-copy strong { font-size: 0.78rem; font-weight: 600; color: var(--text); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .thread-copy small { font-size: 0.7rem; color: var(--muted); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pending-badge { display: inline-block; background: rgba(232,160,176,0.2); color: var(--rose); font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 999px; border: 1px solid rgba(232,160,176,0.3); }
      .unread-pill { background: var(--rose2); color: #fff; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 999px; flex-shrink: 0; }

      /* Meta panels */
      .meta { padding: 0.85rem 1rem; border-bottom: 1px solid var(--border2); }
      .meta h4 { margin: 0 0 0.5rem; font-size: 0.72rem; font-weight: 700; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; }
      .meta p { margin: 0.2rem 0; font-size: 0.78rem; color: var(--text2); line-height: 1.5; }
      .meta strong { color: var(--text); }
      .meta select { width: 100%; margin-bottom: 0.5rem; }
      .meta button { width: 100%; margin-top: 0.35rem; }
      .insight-list { margin: 0.3rem 0; padding-left: 1rem; }
      .insight-list li { font-size: 0.75rem; color: var(--text2); margin-bottom: 0.2rem; }
      .selected-profile-meta .profile-photo { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--rose2); margin-bottom: 0.4rem; }
      .left-profile-meta {}

      /* Chat header */
      .chat-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
      .admin-center-head { }
      .chat-header h3 { margin: 0; flex: 1; font-size: 0.95rem; font-weight: 600; color: var(--text); }
      .chat-header small { color: var(--muted); font-size: 0.72rem; }
      .chat-header div { display: flex; flex-direction: column; flex: 1; }
      .chat-header select { width: auto; flex-shrink: 0; }

      /* Chat box */
      .chat-box { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
      .admin-chat-box {}
      .msg { display: flex; flex-direction: column; max-width: 75%; }
      .msg.member { align-items: flex-start; align-self: flex-start; }
      .msg.virtual { align-items: flex-end; align-self: flex-end; }
      .msg span { font-size: 0.68rem; color: var(--muted); margin-bottom: 0.2rem; font-weight: 500; letter-spacing: 0.03em; }
      .msg p { margin: 0; padding: 0.6rem 0.9rem; border-radius: 16px; font-size: 0.85rem; line-height: 1.5; word-break: break-word; }
      .msg.member p { background: var(--surface2); color: var(--text); border-bottom-left-radius: 4px; }
      .msg.virtual p { background: linear-gradient(135deg, var(--rose2), #a05070); color: #fff; border-bottom-right-radius: 4px; }
      .msg small { font-size: 0.65rem; color: var(--muted); margin-top: 0.15rem; display: flex; align-items: center; gap: 0.25rem; }
      .ticks { color: var(--muted); font-size: 0.7rem; }
      .ticks.seen { color: var(--rose); }
      .audio-player { max-width: 240px; height: 32px; }

      /* Quick replies */
      .quick-replies { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.6rem 1rem; border-top: 1px solid var(--border2); background: var(--surface); flex-shrink: 0; }
      .chip { background: var(--surface2); border: 1px solid var(--border); color: var(--text2); font-size: 0.75rem; padding: 0.3rem 0.75rem; border-radius: 999px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
      .chip:hover { border-color: var(--rose); color: var(--rose); background: rgba(232,160,176,0.08); }
      .chip.ai { border-color: rgba(201,168,108,0.4); color: var(--gold); }
      .chip.ai:hover { background: rgba(201,168,108,0.1); }
      .ai-suggestions { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.4rem 1rem; border-top: 1px solid var(--border2); background: rgba(201,168,108,0.05); flex-shrink: 0; }

      /* Textarea & inputs */
      .grow-textarea { width: 100%; resize: none; background: var(--surface); border: none; border-top: 1px solid var(--border); color: var(--text); font-size: 0.88rem; padding: 0.75rem 1rem; outline: none; min-height: 56px; max-height: 200px; flex-shrink: 0; }
      .grow-textarea::placeholder { color: var(--muted); }
      input, textarea, select { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 10px; padding: 0.55rem 0.8rem; font-size: 0.85rem; outline: none; transition: border-color 0.2s; width: 100%; }
      input:focus, textarea:focus, select:focus { border-color: var(--rose2); }
      input::placeholder, textarea::placeholder { color: var(--muted); }
      select option { background: var(--deep); color: var(--text); }
      button { background: linear-gradient(135deg, var(--rose2), #9a4060); color: #fff; border: none; border-radius: 10px; padding: 0.55rem 1rem; font-size: 0.83rem; font-weight: 600; cursor: pointer; transition: all 0.2s; letter-spacing: 0.02em; }
      button:hover { filter: brightness(1.12); transform: translateY(-1px); }
      button:active { transform: translateY(0); filter: brightness(0.95); }

      /* Stats */
      .stats-dashboard { padding: 1.25rem; overflow-y: auto; flex: 1; }
      .stats-dashboard h3 { font-family: var(--font-display); font-size: 1.4rem; color: var(--cream); margin: 0 0 0.75rem; }
      .stats-range-switch { display: flex; gap: 0.4rem; margin-bottom: 1rem; }
      .stats-range-switch button { background: var(--surface2); color: var(--muted); border: 1px solid var(--border); flex: 1; padding: 0.45rem; font-size: 0.78rem; }
      .stats-range-switch button.active { background: var(--rose2); color: #fff; border-color: var(--rose2); }
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem; }
      .stat-card { display: flex; flex-direction: column; gap: 0.35rem; border-radius: 14px; }
      .stat-card small { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
      .stat-card strong { font-family: var(--font-display); font-size: 2rem; color: var(--rose); line-height: 1; }
      .stats-lists { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

      /* Settings */
      .settings-page { padding: 1.25rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 1rem; }
      .toggle-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; color: var(--text2); }
      .toggle-row input[type=checkbox] { width: auto; cursor: pointer; accent-color: var(--rose2); }
      .floating-field { display: block; position: relative; margin-bottom: 0.65rem; }
      .floating-field input, .floating-field textarea { width: 100%; padding-top: 1.2rem; padding-bottom: 0.45rem; }
      .floating-field span { position: absolute; top: 0.55rem; left: 0.8rem; font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; pointer-events: none; }
      .upload-preview { width: 72px; height: 72px; border-radius: 12px; object-fit: cover; border: 2px solid var(--rose2); margin-top: 0.5rem; }

      /* Members list */
      .member-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
      .member-row { display: flex; align-items: center; justify-content: space-between; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 0.5rem 0.75rem; }
      .member-row div { display: flex; flex-direction: column; gap: 0.15rem; }
      .member-row strong { font-size: 0.82rem; color: var(--text); }
      .member-row small { font-size: 0.68rem; color: var(--muted); }
      .danger-btn { background: rgba(220,50,80,0.15); border: 1px solid rgba(220,50,80,0.3); color: #e06070; font-size: 0.72rem; padding: 0.3rem 0.65rem; border-radius: 7px; }
      .danger-btn:hover { background: rgba(220,50,80,0.3); filter: none; transform: none; }

      /* Profile photo */
      .profile-photo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--rose2); display: block; margin-bottom: 0.5rem; }

      /* Typing */
      .typing-indicator { font-size: 0.75rem; color: var(--rose); padding: 0.3rem 1rem; font-style: italic; }
      @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

      /* User chat layout */
      .user-dashboard { display: grid; grid-template-columns: 280px 1fr 220px; height: calc(100vh - 65px); gap: 0; overflow: hidden; }
      .user-chat-layout {}
      .user-grid {}

      /* Profile list */
      .profile-list { flex: 1; overflow-y: auto; }
      .profile-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.65rem 1rem; border: none; border-bottom: 1px solid var(--border2); background: none; color: var(--text); cursor: pointer; width: 100%; text-align: left; transition: background 0.15s; }
      .profile-item:hover { background: var(--surface2); }
      .profile-item.active { background: rgba(201,112,144,0.12); border-left: 2px solid var(--rose2); }
      .profile-item.has-unread .avatar-wrap { box-shadow: 0 0 0 2px var(--rose2); border-radius: 50%; }
      .avatar-wrap { position: relative; flex-shrink: 0; }
      .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
      .avatar-fallback { width: 40px; height: 40px; border-radius: 50%; background: var(--surface2); border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); color: var(--rose); font-size: 1.1rem; }
      .ringing { animation: ring 1.5s ease-in-out infinite; }
      @keyframes ring { 0%,100% { box-shadow: 0 0 0 0 rgba(201,112,144,0.5); } 50% { box-shadow: 0 0 0 6px rgba(201,112,144,0); } }
      .profile-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
      .profile-main strong { font-size: 0.82rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .profile-main small { font-size: 0.7rem; color: var(--muted); }
      .online-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); flex-shrink: 0; border: 1.5px solid var(--deep); }
      .online-dot.on { background: #4ade80; }
      .profile-item small { font-size: 0.7rem; color: var(--rose); }

      /* Row */
      .row { display: flex; gap: 0.5rem; padding: 0.65rem; border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
      .row .grow-textarea { border: 1px solid var(--border); border-radius: 10px; min-height: 44px; padding: 0.6rem 0.85rem; }
      .row button { flex-shrink: 0; align-self: flex-end; padding: 0.55rem 1.1rem; }

      /* Status */
      .status { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--surface2); border: 1px solid var(--border); color: var(--text2); font-size: 0.78rem; padding: 0.5rem 1.25rem; border-radius: 999px; max-width: 480px; text-align: center; z-index: 9999; box-shadow: 0 4px 24px rgba(0,0,0,0.4); animation: fadeInUp 0.25s ease; }
      @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

      /* Scrollbar */
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
      ::-webkit-scrollbar-thumb:hover { background: var(--rose2); }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);

  const selectedProfile = useMemo(() => virtualProfiles.find((p) => p.id === selectedProfileId) || null, [selectedProfileId, virtualProfiles]);
  const sortedProfiles = useMemo(() => [...virtualProfiles].sort((a, b) => {
    const unreadA = unreadByProfile[a.id] || 0;
    const unreadB = unreadByProfile[b.id] || 0;
    if (unreadA !== unreadB) return unreadB - unreadA;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  }), [virtualProfiles, unreadByProfile]);

  const loggedIn = !!memberSession || isAdmin;
  const profileById = useMemo(() => Object.fromEntries(virtualProfiles.map((p) => [p.id, p])), [virtualProfiles]);
  const selectedThreadProfile = useMemo(() => (selectedThread ? profileById[selectedThread.virtual_profile_id] : null), [selectedThread, profileById]);
  const sortedIncomingThreads = useMemo(() => [...incomingThreads].sort((a, b) => {
    const waitA = a.last_sender_role === 'member' ? 1 : 0;
    const waitB = b.last_sender_role === 'member' ? 1 : 0;
    if (waitA !== waitB) return waitB - waitA;
    return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
  }), [incomingThreads]);

  const slaStats = useMemo(() => {
    const waiting = incomingThreads.filter((t) => t.last_sender_role === 'member' || (adminUnreadByThread[threadKey(t.member_id, t.virtual_profile_id)] || 0) > 0);
    const now = Date.now();
    const avgWaitMin = waiting.length ? waiting.reduce((acc, t) => {
      const ts = t.last_message_at || t.created_at;
      const diff = ts ? (now - new Date(ts).getTime()) / 60000 : 0;
      return acc + Math.max(diff, 0);
    }, 0) / waiting.length : 0;
    return { waitingCount: waiting.length, avgWaitMin, lastReplyMin: selectedThread?.last_message_at ? (now - new Date(selectedThread.last_message_at).getTime()) / 60000 : 0 };
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
    return Math.min(100, Math.max(70, 70 + (hashToInt(seed) % 31)));
  }, [selectedProfileId, memberSession?.id]);

  useEffect(() => {
    if (!loggedIn || isAdmin) return;
    const tick = () => { const nowHour = new Date().toISOString().slice(0, 13); setHourKey((prev) => (prev === nowHour ? prev : nowHour)); };
    const interval = window.setInterval(tick, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [loggedIn, isAdmin]);

  const effectiveOnlineProfiles = useMemo(() => (isAdmin ? onlineProfiles : buildHourlyOnlineMap(virtualProfiles, hourKey)), [isAdmin, onlineProfiles, virtualProfiles, hourKey]);

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
      let common = 0; a.forEach((item) => { if (b.has(item)) common += 1; });
      return Math.round((common / Math.max(a.size, b.size)) * 100);
    };
    return filtered.sort((p1, p2) => {
      if (discoverSort === 'newest') return new Date(p2.created_at || 0) - new Date(p1.created_at || 0);
      if (discoverSort === 'age_asc') return Number(p1.age || 0) - Number(p2.age || 0);
      if (discoverSort === 'online') return Number(!!effectiveOnlineProfiles[p2.id]) - Number(!!effectiveOnlineProfiles[p1.id]);
      return score(p2) - score(p1);
    });
  }, [sortedProfiles, cityFilter, genderFilter, profileSearch, memberProfile.hobbies, discoverSort, effectiveOnlineProfiles]);

  const totalUnreadCount = useMemo(() => Object.values(unreadByProfile).reduce((sum, count) => sum + Number(count || 0), 0), [unreadByProfile]);
  const activeProfileCount = useMemo(() => virtualProfiles.filter((profile) => effectiveOnlineProfiles[profile.id]).length, [virtualProfiles, effectiveOnlineProfiles]);
  const spotlightProfiles = useMemo(() => discoverProfiles.slice(0, 5), [discoverProfiles]);

  function threadKey(memberId, profileId) { return `${memberId}::${profileId}`; }
  async function selectRows(table, buildQuery) { const query = buildQuery(supabase.from(table).select('*')); const { data, error } = await query; if (error) throw error; return data || []; }
  async function insertRows(table, payload) { const { data, error } = await supabase.from(table).insert(payload).select(); if (error) throw error; return data || []; }
  async function updateRows(table, payload, buildQuery) { const query = buildQuery(supabase.from(table).update(payload)); const { data, error } = await query.select(); if (error) throw error; return data || []; }
  function formatTime(ts) { if (!ts) return ''; return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
  function getRandomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function buildRandomVirtualProfile() { return { name: getRandomItem(FEMALE_NAMES), age: String(Math.floor(Math.random() * 14) + 20), city: getRandomItem(CITY_LIST), gender: 'Kadın', hobbies: getRandomItem(['Kahve, seyahat, müzik','Yoga, kitap, yürüyüş','Sinema, fotoğraf, dans','Pilates, moda, sanat','Doğa, kamp, paten']) }; }
  function fillRandomVirtualProfile() { setProfileForm((prev) => ({ ...prev, ...buildRandomVirtualProfile() })); }

  function playNotificationSound() {
    if (!notificationSoundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.25);
    } catch { }
  }

  useEffect(() => { const saved = window.localStorage.getItem('admin_notification_sound_enabled'); if (saved === null) return; setNotificationSoundEnabled(saved === 'true'); }, []);
  useEffect(() => { window.localStorage.setItem('admin_notification_sound_enabled', String(notificationSoundEnabled)); }, [notificationSoundEnabled]);

  function getAudioUrl(content) {
    const clean = (content || '').trim();
    if (!clean) return null;
    if (clean.startsWith('audio:')) return clean.replace('audio:', '').trim();
    if (/^https?:\/\/.+\.(mp3|wav|m4a|ogg)(\?.*)?$/i.test(clean)) return clean;
    return null;
  }

  function autoResizeTextarea(el, maxHeight = 220) { if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`; }

  useEffect(() => { if (!loggedIn) return; fetchVirtualProfiles(); if (!isAdmin) fetchUnreadCounts(); if (isAdmin) fetchIncomingThreads(); }, [loggedIn, isAdmin, memberSession]);
  useEffect(() => { if (!memberSession || !selectedProfileId || isAdmin || userView !== 'chat') return; fetchMessages(selectedProfileId); }, [memberSession, selectedProfileId, isAdmin, userView]);
  useEffect(() => { if (!selectedProfileId || isAdmin || userView !== 'chat') return; setUnreadByProfile((prev) => ({ ...prev, [selectedProfileId]: 0 })); }, [selectedProfileId, isAdmin, userView]);
  useEffect(() => { if (!isAdmin || !selectedThread) return; const key = threadKey(selectedThread.member_id, selectedThread.virtual_profile_id); setAdminUnreadByThread((prev) => ({ ...prev, [key]: 0 })); }, [isAdmin, selectedThread]);
  useEffect(() => { if (!memberSession || isAdmin) return; if (!chatBoxRef.current) return; chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight; }, [messages, memberSession, isAdmin]);
  useEffect(() => { if (!isAdmin || !adminChatBoxRef.current) return; adminChatBoxRef.current.scrollTop = adminChatBoxRef.current.scrollHeight; }, [threadMessages, isAdmin]);
  useEffect(() => { if (!profileListRef.current) return; profileListRef.current.scrollTop = 0; }, [unreadByProfile]);
  useEffect(() => { if (!threadQueueRef.current || !isAdmin) return; threadQueueRef.current.scrollTop = 0; }, [incomingThreads, isAdmin]);
  useEffect(() => { if (!isAdmin || selectedThread || !sortedIncomingThreads.length) return; setSelectedThread(sortedIncomingThreads[0]); }, [isAdmin, selectedThread, sortedIncomingThreads]);
  useEffect(() => { if (!isAdmin || !selectedThread) return; fetchThreadMessages(selectedThread.member_id, selectedThread.virtual_profile_id); fetchQuickFacts(selectedThread.member_id, selectedThread.virtual_profile_id); fetchMemberProfile(selectedThread.member_id); }, [isAdmin, selectedThread]);
  useEffect(() => { if (!isAdmin) return; fetchEngagementInsights(); }, [isAdmin, incomingThreads, virtualProfiles]);
  useEffect(() => { if (!isAdmin || adminTab !== 'stats') return; fetchAdminStats(); }, [isAdmin, adminTab, incomingThreads, threadMessages, statsRange]);
  useEffect(() => { if (!isAdmin || adminTab !== 'settings') return; fetchRegisteredMembers(); }, [isAdmin, adminTab]);
  useEffect(() => { if (!memberSession || isAdmin) return; fetchOwnProfile(); }, [memberSession, isAdmin]);
  useEffect(() => { if (!memberSession || isAdmin) return; setUserView('discover'); }, [memberSession, isAdmin]);
  useEffect(() => { const onKeyDown = (e) => { if (!isAdmin) return; if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); } }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [isAdmin]);

  useEffect(() => {
    if (!loggedIn) return;
    const channel = supabase.channel('messages-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
      if (isAdmin) {
        fetchIncomingThreads();
        const changed = payload.new || payload.old; if (!changed) return;
        const key = threadKey(changed.member_id, changed.virtual_profile_id);
        const selectedKey = selectedThread ? threadKey(selectedThread.member_id, selectedThread.virtual_profile_id) : null;
        if (selectedKey && key === selectedKey) { fetchThreadMessages(changed.member_id, changed.virtual_profile_id); setAdminUnreadByThread((prev) => ({ ...prev, [key]: 0 })); }
        else if (changed.sender_role === 'member') { setAdminUnreadByThread((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 })); playNotificationSound(); }
        return;
      }
      if (!memberSession) return;
      const changed = payload.new || payload.old; if (!changed) return;
      if (changed.member_id !== memberSession.id) return;
      if (changed.sender_role === 'virtual') { playNotificationSound(); }
      const viewingSelectedChat = userView === 'chat' && selectedProfileId && changed.virtual_profile_id === selectedProfileId;
      if (viewingSelectedChat) { fetchMessages(selectedProfileId); if (changed.sender_role === 'virtual') { setUnreadByProfile((prev) => ({ ...prev, [selectedProfileId]: 0 })); } }
      else if (changed.sender_role === 'virtual') { setUnreadByProfile((prev) => ({ ...prev, [changed.virtual_profile_id]: (prev[changed.virtual_profile_id] || 0) + 1 })); }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loggedIn, isAdmin, memberSession, selectedProfileId, selectedThread, userView]);

  useEffect(() => {
    if (!loggedIn) return;
    const presenceChannel = supabase.channel('virtual-profiles-presence', { config: { presence: { key: isAdmin ? `admin-${Date.now()}` : `member-${memberSession?.id || Date.now()}` } } });
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState(); const online = {};
      Object.values(state).forEach((entries) => { entries.forEach((entry) => { (entry.online_profiles || []).forEach((profileId) => { online[profileId] = true; }); }); });
      setOnlineProfiles(online);
    }).subscribe(async (state) => { if (state === 'SUBSCRIBED' && isAdmin) { await presenceChannel.track({ role: 'admin', online_profiles: virtualProfiles.map((p) => p.id) }); } });
    return () => { supabase.removeChannel(presenceChannel); };
  }, [loggedIn, isAdmin, memberSession?.id, virtualProfiles]);

  useEffect(() => {
    if (!loggedIn) return;
    const typingChannel = supabase.channel('typing-indicators', { config: { presence: { key: isAdmin ? `typing-admin-${Date.now()}` : `typing-member-${memberSession?.id || Date.now()}` } } });
    typingChannel.on('presence', { event: 'sync' }, () => {
      const state = typingChannel.presenceState(); let memberTyping = ''; const adminTypingMap = {};
      Object.values(state).forEach((entries) => {
        entries.forEach((entry) => {
          if (entry.role === 'admin' && entry.typing && memberSession?.id === entry.member_id && selectedProfileId === entry.virtual_profile_id) { memberTyping = `${entry.display_name || 'Admin'} yazıyor...`; }
          if (entry.role === 'member' && entry.typing) { const key = threadKey(entry.member_id, entry.virtual_profile_id); adminTypingMap[key] = true; }
        });
      });
      setTypingLabel(memberTyping); setAdminTypingByThread(adminTypingMap);
    }).subscribe(async (state) => { if (state === 'SUBSCRIBED') { await typingChannel.track({ role: isAdmin ? 'admin' : 'member', typing: false }); } });
    const stopTyping = () => { typingChannel.track({ role: isAdmin ? 'admin' : 'member', typing: false, member_id: isAdmin ? selectedThread?.member_id : memberSession?.id, virtual_profile_id: isAdmin ? selectedThread?.virtual_profile_id : selectedProfileId, display_name: isAdmin ? (selectedThread?.virtual_name || 'Admin') : (memberSession?.username || 'Üye') }); };
    const typingText = isAdmin ? adminReply : newMessage;
    const memberId = isAdmin ? selectedThread?.member_id : memberSession?.id;
    const profileId = isAdmin ? selectedThread?.virtual_profile_id : selectedProfileId;
    if (memberId && profileId && typingText.trim()) {
      typingChannel.track({ role: isAdmin ? 'admin' : 'member', typing: true, member_id: memberId, virtual_profile_id: profileId, display_name: isAdmin ? (selectedThread?.virtual_name || 'Admin') : (memberSession?.username || 'Üye') });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(stopTyping, 1300);
    } else { stopTyping(); }
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); supabase.removeChannel(typingChannel); };
  }, [loggedIn, isAdmin, newMessage, adminReply, selectedProfileId, selectedThread, memberSession]);

  async function uploadImage(file, folder) {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('profile-images').upload(path, file, { upsert: true });
    if (uploadError) { setStatus(`Görsel yükleme hatası: ${uploadError.message}`); return null; }
    const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function fetchOwnProfile() {
    const { data, error } = await supabase.from('member_profiles').select('*').eq('member_id', memberSession.id).maybeSingle();
    if (error) return setStatus(error.message);
    if (!data) return setMemberProfile(initialMemberProfile);
    setMemberProfile({ age: data.age || '', hobbies: data.hobbies || '', city: data.city || '', photo_url: data.photo_url || '', status_emoji: data.status_emoji || '🙂' });
  }

  async function saveOwnProfile() {
    if (!memberSession) return;
    const payload = { member_id: memberSession.id, age: memberProfile.age ? Number(memberProfile.age) : null, hobbies: memberProfile.hobbies, city: memberProfile.city, photo_url: memberProfile.photo_url, status_emoji: memberProfile.status_emoji };
    const { error } = await supabase.from('member_profiles').upsert(payload, { onConflict: 'member_id' });
    if (error) return setStatus(error.message);
    setStatus('Profil bilgilerin kaydedildi.');
  }

  function handleSignOut() {
    signOut(() => { setSelectedProfileId(null); setMessages([]); setIncomingThreads([]); setSelectedThread(null); setUnreadByProfile({}); setAdminUnreadByThread({}); setTypingLabel(''); setUserView('discover'); });
  }

  async function fetchVirtualProfiles() {
    try { const data = await selectRows('virtual_profiles', (q) => q.order('created_at', { ascending: true })); setVirtualProfiles(data || []); if (!selectedProfileId && data?.length) setSelectedProfileId(data[0].id); }
    catch (error) { setStatus(error.message); }
  }

  async function fetchUnreadCounts() {
    if (!memberSession || isAdmin) return;
    const { data, error } = await supabase.from('messages').select('virtual_profile_id').eq('member_id', memberSession.id).eq('sender_role', 'virtual').eq('seen_by_member', false);
    if (error) return setStatus(error.message);
    const counts = (data || []).reduce((acc, row) => { const key = row.virtual_profile_id; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
    setUnreadByProfile(counts);
  }

  async function fetchMessages(profileId) {
    const { data, error } = await supabase.from('messages').select('*').eq('virtual_profile_id', profileId).eq('member_id', memberSession.id).order('created_at', { ascending: true });
    if (error) return setStatus(error.message);
    setMessages(data || []);
    await supabase.from('messages').update({ seen_by_member: true, seen_by_member_at: new Date().toISOString() }).eq('virtual_profile_id', profileId).eq('member_id', memberSession.id).eq('sender_role', 'virtual').eq('seen_by_member', false);
    setUnreadByProfile((prev) => ({ ...prev, [profileId]: 0 }));
  }

  async function sendMessage() {
    if (!memberSession || !selectedProfileId || !newMessage.trim()) return;
    const { data: memberExists } = await supabase.from('members').select('id').eq('id', memberSession.id).maybeSingle();
    if (!memberExists) return setStatus('Oturum üyeliği veritabanında bulunamadı. Lütfen çıkış yapıp tekrar giriş yap.');
    const slashCommands = { '/selam': 'Selam 👋', '/kahve': 'Kahve içelim mi? ☕' };
    const normalizedMessage = slashCommands[newMessage.trim().toLowerCase()] || newMessage.trim();
    const { error } = await supabase.from('messages').insert({ member_id: memberSession.id, virtual_profile_id: selectedProfileId, sender_role: 'member', content: normalizedMessage, seen_by_member: true, seen_by_admin: false });
    if (error) return setStatus(error.message);
    recordEngagement('member_message', memberSession.id, selectedProfileId, { source: 'chat_input' });
    setNewMessage(''); fetchMessages(selectedProfileId);
  }

  async function sendReaction(profileId, reactionType) {
    if (!memberSession || !profileId) return;
    const templates = { heart: '💘 Kalp gönderdim.', wave: '👋 Selam, sana el salladım.', like: '👍 Profilini beğendim.' };
    const content = templates[reactionType]; if (!content) return;
    const { error } = await supabase.from('messages').insert({ member_id: memberSession.id, virtual_profile_id: profileId, sender_role: 'member', content, seen_by_member: true, seen_by_admin: false });
    if (error) return setStatus(error.message);
    recordEngagement('member_message', memberSession.id, profileId, { source: `reaction_${reactionType}` });
    setStatus('Etkileşim mesajı gönderildi.');
  }

  async function createVirtualProfile() {
    const auto = buildRandomVirtualProfile();
    const payload = { name: profileForm.name || auto.name, age: Number(profileForm.age || auto.age), city: profileForm.city || auto.city, gender: profileForm.gender || 'Kadın', hobbies: profileForm.hobbies || auto.hobbies, photo_url: profileForm.photo_url };
    if (!payload.photo_url) return setStatus('Fotoğraf yükleyip Kaydet tuşuna bas. İsim/şehir/yaş otomatik üretilecek.');
    let { error } = await supabase.from('virtual_profiles').insert(payload);
    if (error?.message?.includes("Could not find the 'photo_url' column")) {
      const retry = await supabase.from('virtual_profiles').insert({ name: payload.name, age: payload.age, city: payload.city, gender: payload.gender, hobbies: payload.hobbies });
      error = retry.error;
      if (!error) setStatus("Profil kaydedildi. Fotoğraf kolonu henüz migration almadığı için görsel eklenmedi.");
    }
    if (error) return setStatus(error.message);
    setProfileForm(initialProfile); fetchVirtualProfiles(); fetchIncomingThreads();
    setStatus(`Sanal profil oluşturuldu: ${payload.name}, ${payload.city}`);
  }

  async function fetchIncomingThreads() {
    try { const data = await selectRows('admin_threads', (q) => q.order('last_message_at', { ascending: false })); setIncomingThreads(data || []); }
    catch (error) { setStatus(error.message); }
  }

  async function recordEngagement(eventType, memberId, virtualProfileId, meta = {}) {
    try { await supabase.from('engagement_events').insert({ event_type: eventType, member_id: memberId, virtual_profile_id: virtualProfileId, meta }); } catch { }
  }

  async function fetchEngagementInsights() {
    if (!isAdmin) return;
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(); let rows = [];
    const events = await supabase.from('engagement_events').select('created_at, virtual_profile_id, event_type').eq('event_type', 'member_message').gte('created_at', since);
    if (!events.error && events.data?.length) { rows = events.data; }
    else { const fallback = await supabase.from('messages').select('created_at, virtual_profile_id, sender_role').eq('sender_role', 'member').gte('created_at', since); rows = (fallback.data || []).map((r) => ({ ...r, event_type: 'member_message' })); }
    const hourMap = new Map(); const profileMap = new Map();
    rows.forEach((row) => { const d = new Date(row.created_at); const h = Number.isNaN(d.getTime()) ? 0 : d.getHours(); hourMap.set(h, (hourMap.get(h) || 0) + 1); profileMap.set(row.virtual_profile_id, (profileMap.get(row.virtual_profile_id) || 0) + 1); });
    const topHours = [...hourMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([hour, count]) => ({ label: `${String(hour).padStart(2, '0')}:00`, count }));
    const topProfiles = [...profileMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([profileId, count]) => ({ name: profileById[profileId]?.name || 'Bilinmeyen', count }));
    setEngagementInsights({ topHours, topProfiles });
  }

  async function fetchAdminStats() {
    if (!isAdmin) return;
    const start = new Date();
    if (statsRange === 'daily') { start.setHours(0, 0, 0, 0); } else if (statsRange === 'weekly') { start.setDate(start.getDate() - 7); } else { start.setMonth(start.getMonth() - 1); }
    const startIso = start.toISOString();
    const [{ data: todayMessages, error: msgErr }, { data: todayMembers, error: memberErr }] = await Promise.all([
      supabase.from('messages').select('member_id, virtual_profile_id, sender_role, created_at').gte('created_at', startIso),
      supabase.from('members').select('id, created_at').gte('created_at', startIso)
    ]);
    if (msgErr || memberErr) { setStatus(msgErr?.message || memberErr?.message || 'Stats alınamadı.'); return; }
    const msgs = todayMessages || [];
    const memberMessages = msgs.filter((m) => m.sender_role === 'member');
    const adminReplies = msgs.filter((m) => m.sender_role === 'virtual');
    const activeThreadKeys = new Set(msgs.map((m) => `${m.member_id}::${m.virtual_profile_id}`));
    const respondedThreadKeys = new Set(); const responseMinutes = [];
    const grouped = new Map();
    msgs.forEach((m) => { const key = `${m.member_id}::${m.virtual_profile_id}`; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(m); });
    grouped.forEach((rows) => {
      rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); let lastMemberTs = null;
      rows.forEach((row) => { if (row.sender_role === 'member') { lastMemberTs = row.created_at; } else if (row.sender_role === 'virtual' && lastMemberTs) { respondedThreadKeys.add(`${row.member_id}::${row.virtual_profile_id}`); const diffMin = (new Date(row.created_at).getTime() - new Date(lastMemberTs).getTime()) / 60000; if (diffMin >= 0) responseMinutes.push(diffMin); lastMemberTs = null; } });
    });
    const avgResponseMinToday = responseMinutes.length ? responseMinutes.reduce((a, b) => a + b, 0) / responseMinutes.length : 0;
    setAdminStats({ totalMessagesToday: msgs.length, memberMessagesToday: memberMessages.length, adminRepliesToday: adminReplies.length, respondedThreadsToday: respondedThreadKeys.size, newMembersToday: (todayMembers || []).length, activeThreadsToday: activeThreadKeys.size, avgResponseMinToday });
  }

  async function fetchThreadMessages(memberId, profileId) {
    const { data, error } = await supabase.from('messages').select('*').eq('member_id', memberId).eq('virtual_profile_id', profileId).order('created_at', { ascending: true });
    if (error) return setStatus(error.message); setThreadMessages(data || []);
    await supabase.from('messages').update({ seen_by_admin: true, seen_by_admin_at: new Date().toISOString() }).eq('member_id', memberId).eq('virtual_profile_id', profileId).eq('sender_role', 'member').eq('seen_by_admin', false);
  }

  async function fetchQuickFacts(memberId, profileId) {
    const { data, error } = await supabase.from('thread_quick_facts').select('notes').eq('member_id', memberId).eq('virtual_profile_id', profileId).maybeSingle();
    if (error) return; setQuickFactsText(data?.notes || '');
  }

  async function fetchMemberProfile(memberId) {
    const { data, error } = await supabase.from('member_profiles').select('age, hobbies, city, photo_url, status_emoji').eq('member_id', memberId).maybeSingle();
    if (error) return setSelectedMemberProfile(null); setSelectedMemberProfile(data || null);
  }

  async function saveQuickFacts() {
    if (!selectedThread) return;
    const { error } = await supabase.from('thread_quick_facts').upsert({ member_id: selectedThread.member_id, virtual_profile_id: selectedThread.virtual_profile_id, notes: quickFactsText }, { onConflict: 'member_id,virtual_profile_id' });
    if (error) return setStatus(error.message); setStatus('Quick Facts kaydedildi.');
  }

  async function fetchRegisteredMembers() {
    setLoadingMembers(true);
    const { data, error } = await supabase.from('members').select('id, username, created_at').order('created_at', { ascending: false });
    setLoadingMembers(false); if (error) return setStatus(error.message); setRegisteredMembers(data || []);
  }

  async function deleteMember(memberId) {
    const { error } = await supabase.from('members').delete().eq('id', memberId);
    if (error) return setStatus(error.message); setRegisteredMembers((prev) => prev.filter((m) => m.id !== memberId)); setStatus('Kullanıcı silindi.');
  }

  function openChatWithProfile(profileId) { setSelectedProfileId(profileId); setUserView('chat'); }

  async function sendAdminReply() {
    if (!selectedThread || !adminReply.trim()) return;
    const { error } = await supabase.from('messages').insert({ member_id: selectedThread.member_id, virtual_profile_id: selectedThread.virtual_profile_id, sender_role: 'virtual', content: adminReply.trim(), seen_by_member: false, seen_by_admin: true });
    if (error) return setStatus(error.message);
    recordEngagement('admin_reply', selectedThread.member_id, selectedThread.virtual_profile_id, { source: 'admin_reply' });
    setAdminReply(''); setAiSuggestions([]); fetchIncomingThreads(); fetchThreadMessages(selectedThread.member_id, selectedThread.virtual_profile_id); fetchEngagementInsights(); setStatus('Yanıt gönderildi.');
  }

  async function updateSelectedThreadTag(tag) {
    if (!selectedThread) return;
    try {
      await updateRows('admin_threads', { status_tag: tag }, (q) => q.eq('member_id', selectedThread.member_id).eq('virtual_profile_id', selectedThread.virtual_profile_id));
      await insertRows('thread_events', { member_id: selectedThread.member_id, virtual_profile_id: selectedThread.virtual_profile_id, event_type: 'status_change', meta: { status_tag: tag } });
    } catch (error) { return setStatus(error.message); }
    setSelectedThread((prev) => (prev ? { ...prev, status_tag: tag } : prev)); fetchIncomingThreads();
  }

  async function sendBulkTemplate() {
    const selectedKeys = Object.keys(selectedThreadKeys).filter((k) => selectedThreadKeys[k]);
    if (!selectedKeys.length) return setStatus('Önce en az bir thread seç.'); if (!bulkTemplate.trim()) return;
    const rows = selectedKeys.map((key) => { const [member_id, virtual_profile_id] = key.split('::'); return { member_id, virtual_profile_id, sender_role: 'virtual', content: bulkTemplate, seen_by_member: false, seen_by_admin: true }; });
    try { await insertRows('messages', rows); await insertRows('thread_events', rows.map((row) => ({ member_id: row.member_id, virtual_profile_id: row.virtual_profile_id, event_type: 'bulk_sent', meta: { template: bulkTemplate } }))); }
    catch (error) { return setStatus(error.message); }
    setSelectedThreadKeys({}); setStatus(`${rows.length} thread için bulk mesaj gönderildi.`); fetchIncomingThreads();
  }

  async function fetchAiSuggestions() {
    if (!OPENAI_API_KEY) return setStatus('AI önerileri için VITE_OPENAI_API_KEY tanımla.');
    if (!selectedThread || !threadMessages.length) return;
    const lastMemberMessage = [...threadMessages].reverse().find((m) => m.sender_role === 'member')?.content; if (!lastMemberMessage) return;
    setLoadingSuggestions(true); setStatus('');
    const prompt = `Kullanıcı mesajı: "${lastMemberMessage}". Flört uygulaması için 3 kısa ve doğal Türkçe cevap öner.`;
    const res = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` }, body: JSON.stringify({ model: 'gpt-4.1-mini', input: prompt }) });
    setLoadingSuggestions(false);
    if (!res.ok) { const txt = await res.text(); return setStatus(`AI önerisi alınamadı: ${txt}`); }
    const data = await res.json(); const outText = data.output_text || '';
    const lines = outText.split('\n').map((l) => l.replace(/^\d+[\).\-]\s*/, '').trim()).filter(Boolean).slice(0, 3);
    setAiSuggestions(lines);
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className={`layout ${isAdmin ? 'layout-admin' : ''}`}>

      {/* ── TOPBAR ── */}
      <header className={`topbar ${isAdmin ? 'topbar-admin' : ''}`}>
        <h1 className="brand">
          <span className="brand-icon">✦</span> Flort.
        </h1>
        <div className="topbar-actions">
          {isAdmin && loggedIn && (
            <div className="admin-nav-pills">
              <button type="button" className={`nav-pill ${adminTab === 'chat' ? 'active' : ''}`} onClick={() => setAdminTab('chat')}>Chat</button>
              <button type="button" className={`nav-pill ${adminTab === 'stats' ? 'active' : ''}`} onClick={() => setAdminTab('stats')}>Stats</button>
              <button type="button" className={`nav-pill ${adminTab === 'settings' ? 'active' : ''}`} onClick={() => setAdminTab('settings')}>Settings</button>
            </div>
          )}

          {loggedIn && !isAdmin && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(30,20,28,0.9)', border: '1px solid rgba(232,160,176,0.2)', borderRadius: '999px', padding: '0.3rem 0.4rem', backdropFilter: 'blur(20px)' }}>
              {[
                { key: 'discover', label: 'Keşfet', icon: '✦' },
                { key: 'chat', label: 'Mesajlar', icon: '✉' },
                { key: 'profile', label: 'Profilim', icon: '◉' },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setUserView(key)}
                  style={{
                    background: userView === key ? 'linear-gradient(135deg, #c97090, #904060)' : 'transparent',
                    border: 'none',
                    color: userView === key ? '#fff' : 'rgba(232,160,176,0.7)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    padding: '0.45rem 1rem',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s',
                    letterSpacing: '0.03em',
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{icon}</span>
                  {label}
                  {key === 'chat' && totalUnreadCount > 0 && <span className="nav-dot" />}
                </button>
              ))}
              <button
                type="button"
                onClick={handleSignOut}
                style={{ background: 'rgba(220,60,80,0.15)', border: '1px solid rgba(220,60,80,0.25)', color: '#e07080', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600, padding: '0.45rem 0.9rem', borderRadius: '999px', cursor: 'pointer', marginLeft: '0.15rem', transition: 'all 0.2s', letterSpacing: '0.03em' }}
              >
                Çıkış
              </button>
            </nav>
          )}

          {!loggedIn && (
            <button className="linkish" onClick={() => setMode(mode === 'user' ? 'admin' : 'user')}>
              {mode === 'user' ? 'Admin girişi' : 'Kullanıcı girişi'}
            </button>
          )}
          {loggedIn && isAdmin && (
            <button onClick={handleSignOut} style={{ background: 'rgba(220,60,80,0.15)', border: '1px solid rgba(220,60,80,0.25)', color: '#e07080', fontSize: '0.78rem', padding: '0.4rem 0.9rem', borderRadius: '8px' }}>
              Çıkış
            </button>
          )}
        </div>
      </header>

      {/* ────────────────────────────────────────────────── */}
      {/* LOGIN / LANDING                                   */}
      {/* ────────────────────────────────────────────────── */}
      {!loggedIn ? (
        <section style={{ minHeight: '82vh', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, overflow: 'hidden', borderRadius: '1.5rem', border: '1px solid rgba(232,160,176,0.1)', margin: '1.5rem 0' }}>

          {/* Left – auth panel */}
          <div style={{ background: 'linear-gradient(160deg, #120d12 0%, #1a1018 60%, #100d10 100%)', padding: '3.5rem 3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid rgba(232,160,176,0.1)' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(201,112,144,0.12)', border: '1px solid rgba(201,112,144,0.25)', borderRadius: '999px', padding: '0.35rem 0.9rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--rose)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                {mode === 'admin' ? 'Yönetici Girişi' : 'Üye Girişi'}
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', fontWeight: 500, color: 'var(--cream)', margin: 0, lineHeight: 1.1, fontStyle: 'italic' }}>
                {mode === 'admin' ? 'Kontrol Paneli' : 'Seni Bekleyen\nbiri var.'}
              </h2>
              <p style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                {mode === 'admin' ? 'Yönetici şifrenle panele eriş.' : 'Giriş yap veya hızlıca hesap oluştur.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {mode !== 'admin' && (
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '1rem', pointerEvents: 'none' }}>👤</span>
                  <input
                    type="text"
                    placeholder="Kullanıcı adı"
                    value={authForm.username}
                    onChange={(e) => setAuthForm((st) => ({ ...st, username: e.target.value }))}
                    style={{ paddingLeft: '2.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,160,176,0.15)', height: '52px', fontSize: '0.88rem' }}
                  />
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '1rem', pointerEvents: 'none' }}>🔐</span>
                <input
                  type="password"
                  placeholder="Şifre"
                  value={authForm.password}
                  onChange={(e) => setAuthForm((st) => ({ ...st, password: e.target.value }))}
                  style={{ paddingLeft: '2.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,160,176,0.15)', height: '52px', fontSize: '0.88rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.5rem' }}>
              <button
                disabled={loading}
                onClick={signIn}
                style={{ height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #c97090 0%, #904060 60%, #6a2040 100%)', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 24px rgba(201,112,144,0.3)' }}
              >
                {loading ? 'İşleniyor...' : 'Giriş Yap'}
              </button>
              {mode !== 'admin' && (
                <button
                  disabled={loading}
                  onClick={signUp}
                  style={{ height: '52px', borderRadius: '14px', background: 'transparent', border: '1px solid rgba(232,160,176,0.25)', color: 'var(--rose)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.03em' }}
                >
                  Hesap Oluştur
                </button>
              )}
            </div>
          </div>

          {/* Right – hero visual */}
          <div style={{ position: 'relative', overflow: 'hidden', background: '#0a0608', display: 'flex', flexDirection: 'column' }}>
            {/* background glow orbs */}
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,112,144,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '45%', height: '45%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,80,160,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', flex: 1, display: 'grid', gridTemplateRows: '2fr 1fr', gap: 0 }}>
              {/* Hero image */}
              <div style={{ overflow: 'hidden', position: 'relative' }}>
                <img
                  src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', filter: 'brightness(0.7) saturate(0.85)' }}
                  alt="Flort hero"
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(10,6,8,0.95) 100%)' }} />
                <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 500, color: '#fff', margin: 0, fontStyle: 'italic' }}>Sena, 24</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>İstanbul · Fotoğraf · Dans · Kahve</p>
                </div>
              </div>

              {/* Stats strip + mock chat */}
              <div style={{ background: 'rgba(16,13,16,0.95)', borderTop: '1px solid rgba(232,160,176,0.1)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  {[['98%', 'Uyum'], ['2.1s', 'Yanıt'], ['24/7', 'Aktif']].map(([val, lbl]) => (
                    <div key={lbl} style={{ flex: 1, background: 'rgba(201,112,144,0.08)', border: '1px solid rgba(201,112,144,0.15)', borderRadius: '10px', padding: '0.6rem', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--rose)', lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.2rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{lbl}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.07)', borderRadius: '12px 12px 12px 3px', padding: '0.5rem 0.85rem', fontSize: '0.8rem', color: 'var(--text)', maxWidth: '80%' }}>
                    Selam! Akşam kahve planı var mı? ☕
                  </div>
                  <div style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg, #c97090, #8a3858)', borderRadius: '12px 12px 3px 12px', padding: '0.5rem 0.85rem', fontSize: '0.8rem', color: '#fff', maxWidth: '80%' }}>
                    Olur! 20:30 Nişantaşı nasıl? ✨
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      /* ────────────────────────────────────────────────── */
      /* ADMIN PANEL                                       */
      /* ────────────────────────────────────────────────── */
      ) : isAdmin ? (
        <main className="admin-modern compact-shell admin-ops">
          <aside className="admin-left card">
            {selectedThread && (
              <div className="meta selected-profile-meta left-profile-meta">
                <h4>Aktif Kullanıcı</h4>
                {selectedMemberProfile?.photo_url && <img src={selectedMemberProfile.photo_url} alt={selectedThread.member_username} className="profile-photo" />}
                <p><strong>Kullanıcı:</strong> {selectedThread.member_username}</p>
                <p><strong>Yaş:</strong> {selectedMemberProfile?.age || '-'}</p>
                <p><strong>Şehir:</strong> {selectedMemberProfile?.city || '-'}</p>
                <p><strong>Hobiler:</strong> {selectedMemberProfile?.hobbies || '-'}</p>
                <p><strong>Durum:</strong> {selectedMemberProfile?.status_emoji || '🙂'}</p>
              </div>
            )}
            <div className="panel-title-row panel-head">
              <h3>Mesaj Bekleyenler</h3>
            </div>
            <div className="thread-queue modern-thread-queue" ref={threadQueueRef}>
              {sortedIncomingThreads.map((thread) => {
                const threadProfile = profileById[thread.virtual_profile_id];
                const waitingReply = thread.last_sender_role === 'member';
                return (
                  <button key={`${thread.member_id}-${thread.virtual_profile_id}`} onClick={() => setSelectedThread(thread)} className={`thread-item modern ${selectedThread?.member_id === thread.member_id && selectedThread?.virtual_profile_id === thread.virtual_profile_id ? 'active' : ''}`}>
                    <input type="checkbox" checked={!!selectedThreadKeys[threadKey(thread.member_id, thread.virtual_profile_id)]} onClick={(e) => e.stopPropagation()} onChange={(e) => setSelectedThreadKeys((prev) => ({ ...prev, [threadKey(thread.member_id, thread.virtual_profile_id)]: e.target.checked }))} />
                    <span className="thread-avatar-wrap">
                      {threadProfile?.photo_url ? <img src={threadProfile.photo_url} alt={thread.virtual_name} className="thread-avatar" /> : <span className="thread-avatar-fallback">{thread.virtual_name?.slice(0, 1)}</span>}
                    </span>
                    <span className="thread-copy">
                      <strong>{thread.member_username} → {thread.virtual_name}</strong>
                      {thread.last_message_content && <small>{thread.last_message_content}</small>}
                      {waitingReply && <small className="pending-badge">Cevap bekliyor</small>}
                      {adminTypingByThread[threadKey(thread.member_id, thread.virtual_profile_id)] && <small>• yazıyor...</small>}
                    </span>
                    {adminUnreadByThread[threadKey(thread.member_id, thread.virtual_profile_id)] > 0 && <span className="unread-pill">{adminUnreadByThread[threadKey(thread.member_id, thread.virtual_profile_id)]}</span>}
                  </button>
                );
              })}
            </div>

            <div className="meta">
              <h4>SLA Paneli</h4>
              <p><strong>Cevaplanmamış:</strong> {slaStats.waitingCount}</p>
              <p><strong>Ort. bekleme:</strong> {slaStats.avgWaitMin > 0 && slaStats.avgWaitMin < 1 ? '<1 dk' : `${slaStats.avgWaitMin.toFixed(1)} dk`}</p>
            </div>
            <div className="meta">
              <h4>Engagement (7 Gün)</h4>
              <p><strong>Yoğun saatler:</strong></p>
              <ul className="insight-list">{engagementInsights.topHours.map((h) => <li key={h.label}>{h.label} → {h.count} mesaj</li>)}</ul>
              <p><strong>İlgi gören profiller:</strong></p>
              <ul className="insight-list">{engagementInsights.topProfiles.map((p) => <li key={p.name}>{p.name} → {p.count}</li>)}</ul>
            </div>
            <div className="meta">
              <h4>Bulk Aksiyon</h4>
              <select value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value)}>{BULK_TEMPLATES.map((tpl) => <option key={tpl} value={tpl}>{tpl}</option>)}</select>
              <button onClick={sendBulkTemplate}>Seçili thread'lere gönder</button>
            </div>
          </aside>

          <section className="admin-center card">
            {adminTab === 'chat' && (
              <>
                <div className="chat-header admin-center-head">
                  <div>
                    <h3>{selectedThread?.virtual_name || 'Sohbet seç'}</h3>
                    <small>{selectedThreadProfile && onlineProfiles[selectedThreadProfile.id] ? '🟢 Online' : '⚪ Offline'}</small>
                  </div>
                  <select value={selectedThread?.status_tag || 'takip_edilecek'} onChange={(e) => updateSelectedThreadTag(e.target.value)} style={{ width: 'auto' }}>
                    {THREAD_TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                  </select>
                  <button type="button" className="drawer-toggle" onClick={() => setAdminDrawerOpen((v) => !v)}>
                    {adminDrawerOpen ? '← Gizle' : '→ Aç'}
                  </button>
                </div>
                <div className="chat-box admin-chat-box" ref={adminChatBoxRef}>
                  {threadMessages.map((msg) => {
                    const audioUrl = getAudioUrl(msg.content);
                    return (
                      <div key={msg.id} className={`msg ${msg.sender_role}`}>
                        <span>{msg.sender_role === 'member' ? selectedThread?.member_username : selectedThread?.virtual_name}</span>
                        {audioUrl ? <audio controls src={audioUrl} className="audio-player" /> : <p>{msg.content}</p>}
                        <small>{formatTime(msg.created_at)}{msg.sender_role === 'virtual' ? <span className={`ticks ${msg.seen_by_member ? 'seen' : ''}`} title={msg.seen_by_member_at ? `Görüldü: ${formatTime(msg.seen_by_member_at)}` : `Teslim: ${formatTime(msg.created_at)}`}>✓✓</span> : ''}</small>
                      </div>
                    );
                  })}
                </div>
                <div className="quick-replies">
                  {QUICK_REPLIES.map((reply) => <button key={reply} type="button" className="chip" onClick={() => setAdminReply((prev) => `${prev ? `${prev}\n` : ''}${reply}`)}>{reply}</button>)}
                  <button type="button" className="chip ai" onClick={fetchAiSuggestions} disabled={loadingSuggestions}>{loadingSuggestions ? '✦ Düşünüyor...' : '✦ AI Önerisi'}</button>
                </div>
                {!!aiSuggestions.length && <div className="ai-suggestions">{aiSuggestions.map((s) => <button key={s} type="button" className="chip" onClick={() => setAdminReply(s)}>{s}</button>)}</div>}
                <textarea className="grow-textarea" placeholder="Sanal profil cevabı..." value={adminReply} onChange={(e) => { setAdminReply(e.target.value); autoResizeTextarea(e.target, 260); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminReply(); } }} />
                <button onClick={sendAdminReply}>Yanıt Gönder</button>
              </>
            )}
            {adminTab === 'stats' && (
              <div className="stats-dashboard">
                <h3>Stats Dashboard</h3>
                <div className="stats-range-switch">
                  <button type="button" className={statsRange === 'daily' ? 'active' : ''} onClick={() => setStatsRange('daily')}>Günlük</button>
                  <button type="button" className={statsRange === 'weekly' ? 'active' : ''} onClick={() => setStatsRange('weekly')}>Haftalık</button>
                  <button type="button" className={statsRange === 'monthly' ? 'active' : ''} onClick={() => setStatsRange('monthly')}>Aylık</button>
                </div>
                <div className="stats-grid">
                  {[['Toplam Mesaj', adminStats.totalMessagesToday],['Üye Mesajı', adminStats.memberMessagesToday],['Admin Cevabı', adminStats.adminRepliesToday],['Cevaplanan Thread', adminStats.respondedThreadsToday],['Yeni Üye', adminStats.newMembersToday],['Aktif Thread', adminStats.activeThreadsToday]].map(([lbl, val]) => (
                    <div key={lbl} className="meta stat-card"><small>{lbl}</small><strong>{val}</strong></div>
                  ))}
                  <div className="meta stat-card"><small>Ort. Cevap Süresi</small><strong>{adminStats.avgResponseMinToday.toFixed(1)} dk</strong></div>
                </div>
                <div className="stats-lists">
                  <div className="meta"><p><strong>Yoğun Saatler</strong></p><ul className="insight-list">{engagementInsights.topHours.map((h) => <li key={h.label}>{h.label} → {h.count}</li>)}</ul></div>
                  <div className="meta"><p><strong>Popüler Profiller</strong></p><ul className="insight-list">{engagementInsights.topProfiles.map((p) => <li key={p.name}>{p.name} → {p.count}</li>)}</ul></div>
                </div>
              </div>
            )}
            {adminTab === 'settings' && (
              <div className="settings-page">
                <div className="meta">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)', margin: '0 0 0.75rem' }}>Ayarlar</h3>
                  <label className="toggle-row"><span>Bildirim sesi</span><input type="checkbox" checked={notificationSoundEnabled} onChange={(e) => setNotificationSoundEnabled(e.target.checked)} /></label>
                </div>
                <div className="meta">
                  <div className="panel-title-row panel-divider">
                    <h3 style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sanal Profil Oluştur</h3>
                    <button type="button" className="icon-dice" onClick={fillRandomVirtualProfile} aria-label="Rastgele üret">🎲</button>
                  </div>
                  <label className="floating-field"><input placeholder=" " value={profileForm.name} onChange={(e) => setProfileForm((s) => ({ ...s, name: e.target.value }))} /><span>Ad (boşsa otomatik)</span></label>
                  <label className="floating-field"><input placeholder=" " type="number" value={profileForm.age} onChange={(e) => setProfileForm((s) => ({ ...s, age: e.target.value }))} /><span>Yaş</span></label>
                  <label className="floating-field"><input placeholder=" " value={profileForm.city} onChange={(e) => setProfileForm((s) => ({ ...s, city: e.target.value }))} /><span>Şehir</span></label>
                  <label className="floating-field"><input placeholder=" " value={profileForm.gender} onChange={(e) => setProfileForm((s) => ({ ...s, gender: e.target.value }))} /><span>Cinsiyet</span></label>
                  <label className="floating-field"><textarea placeholder=" " value={profileForm.hobbies} onChange={(e) => setProfileForm((s) => ({ ...s, hobbies: e.target.value }))} /><span>Hobiler</span></label>
                  <input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const url = await uploadImage(file, 'virtual-profiles'); if (url) setProfileForm((s) => ({ ...s, photo_url: url })); }} />
                  {profileForm.photo_url && <img src={profileForm.photo_url} alt="Önizleme" className="upload-preview" />}
                  <button onClick={createVirtualProfile}>Kaydet</button>
                </div>
                <div className="meta">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--cream)', margin: '0 0 0.5rem' }}>Kayıtlı Üyeler</h3>
                  {loadingMembers ? <p>Yükleniyor...</p> : (
                    <div className="member-list">
                      {registeredMembers.map((member) => (
                        <div key={member.id} className="member-row">
                          <div><strong>{member.username}</strong><small>{new Date(member.created_at).toLocaleString('tr-TR')}</small></div>
                          <button type="button" className="danger-btn" onClick={() => deleteMember(member.id)}>Sil</button>
                        </div>
                      ))}
                      {!registeredMembers.length && <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Kayıtlı kullanıcı yok.</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {adminDrawerOpen && adminTab === 'chat' && (
            <aside className="admin-right card drawer-panel">
              {selectedThreadProfile && (
                <div className="meta selected-profile-meta">
                  <h4>Profil Bilgileri</h4>
                  {selectedThreadProfile.photo_url && <img src={selectedThreadProfile.photo_url} alt={selectedThreadProfile.name} className="profile-photo" />}
                  <p><strong>Ad:</strong> {selectedThreadProfile.name}</p>
                  <p><strong>Yaş:</strong> {selectedThreadProfile.age}</p>
                  <p><strong>Şehir:</strong> {selectedThreadProfile.city || '-'}</p>
                  <p><strong>Hobiler:</strong> {selectedThreadProfile.hobbies || '-'}</p>
                </div>
              )}
              <div className="meta">
                <h4>Quick Facts</h4>
                <textarea placeholder="Kullanıcı hakkında notlar (şehir, iş, tercihler…)" value={quickFactsText} onChange={(e) => setQuickFactsText(e.target.value)} />
                <button onClick={saveQuickFacts}>Kaydet</button>
              </div>
            </aside>
          )}
        </main>

      /* ────────────────────────────────────────────────── */
      /* DISCOVER                                          */
      /* ────────────────────────────────────────────────── */
      ) : userView === 'discover' ? (
        <main style={{ padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Filter bar */}
          <div style={{ background: 'linear-gradient(135deg, rgba(24,19,24,0.95), rgba(20,14,20,0.98))', border: '1px solid rgba(232,160,176,0.12)', borderRadius: '1.25rem', padding: '1.5rem 2rem', backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-30%', right: '-5%', width: '35%', height: '140%', background: 'radial-gradient(ellipse, rgba(201,112,144,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(201,112,144,0.1)', border: '1px solid rgba(201,112,144,0.2)', borderRadius: '999px', padding: '0.25rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, color: 'var(--rose)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                    Keşfet
                  </span>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 500, color: 'var(--cream)', margin: 0, fontStyle: 'italic', lineHeight: 1.15 }}>Seni bekleyen eşleşmeler ✦</h2>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {[
                      [`${discoverProfiles.length} profil`, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)', 'var(--text2)'],
                      [`${discoverProfiles.filter((p) => effectiveOnlineProfiles[p.id]).length} çevrimiçi`, 'rgba(74,222,128,0.06)', 'rgba(74,222,128,0.2)', '#4ade80'],
                      [`${spotlightProfiles.length} spotlight`, 'rgba(201,112,144,0.06)', 'rgba(201,112,144,0.2)', 'var(--rose)'],
                    ].map(([label, bg, border, color]) => (
                      <span key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '999px', padding: '0.3rem 0.8rem', fontSize: '0.72rem', color, fontWeight: 500 }}>{label}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.85rem' }}>⌕</span>
                  <input placeholder="İsim, şehir, hobi…" value={profileSearch} onChange={(e) => setProfileSearch(e.target.value)} style={{ paddingLeft: '2.2rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,160,176,0.12)', fontSize: '0.83rem', height: '42px' }} />
                </div>
                <input placeholder="Şehir" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,160,176,0.12)', fontSize: '0.83rem', height: '42px' }} />
                <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,160,176,0.12)', fontSize: '0.83rem', height: '42px' }}>
                  <option value="all">Tüm cinsiyetler</option>
                  <option value="Kadın">Kadın</option>
                  <option value="Erkek">Erkek</option>
                </select>
                <select value={discoverSort} onChange={(e) => setDiscoverSort(e.target.value)} style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,160,176,0.12)', fontSize: '0.83rem', height: '42px' }}>
                  <option value="match">Uyuma göre</option>
                  <option value="newest">En yeni</option>
                  <option value="age_asc">Yaş (artan)</option>
                  <option value="online">Önce çevrimiçi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Profile grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {discoverProfiles.map((profile) => {
              const hobbyBadges = (profile.hobbies || '').split(',').map((h) => h.trim()).filter(Boolean).slice(0, 3);
              const isOnline = !!effectiveOnlineProfiles[profile.id];
              const liked = !!likedProfiles[profile.id];
              const hearted = !!heartedProfiles[profile.id];
              const waved = !!wavedProfiles[profile.id];

              return (
                <article
                  key={profile.id}
                  style={{ background: 'linear-gradient(160deg, rgba(24,19,24,0.97), rgba(18,13,18,0.99))', border: '1px solid rgba(232,160,176,0.1)', borderRadius: '1.25rem', overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', cursor: 'default', position: 'relative' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'rgba(232,160,176,0.3)'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(201,112,144,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(232,160,176,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* Photo */}
                  <div style={{ position: 'relative', height: 320, overflow: 'hidden' }}>
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease', display: 'block' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1018, #241820)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '5rem', color: 'rgba(232,160,176,0.3)' }}>
                        {profile.name?.slice(0, 1)}
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(10,6,8,0.98) 100%)' }} />

                    {/* Online badge */}
                    <div style={{ position: 'absolute', top: '0.85rem', left: '0.85rem', background: 'rgba(10,6,8,0.75)', backdropFilter: 'blur(10px)', border: `1px solid ${isOnline ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '999px', padding: '0.3rem 0.7rem', fontSize: '0.68rem', color: isOnline ? '#4ade80' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? '#4ade80' : 'var(--muted)', display: 'inline-block' }} />
                      {isOnline ? 'Çevrimiçi' : 'Offline'}
                    </div>

                    {/* Like button overlay */}
                    <button
                      type="button"
                      onClick={() => setLikedProfiles((s) => ({ ...s, [profile.id]: !s[profile.id] }))}
                      style={{ position: 'absolute', top: '0.85rem', right: '0.85rem', width: 36, height: 36, borderRadius: '50%', background: liked ? 'rgba(232,160,176,0.9)' : 'rgba(10,6,8,0.6)', backdropFilter: 'blur(10px)', border: `1px solid ${liked ? 'transparent' : 'rgba(255,255,255,0.15)'}`, color: liked ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', transform: liked ? 'scale(1.1)' : 'scale(1)' }}
                    >
                      {liked ? '★' : '☆'}
                    </button>

                    {/* Name / city */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.25rem 1.1rem' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, color: '#fff', margin: 0, fontStyle: 'italic', lineHeight: 1.1 }}>{profile.name}, {profile.age}</h3>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', margin: '0.25rem 0 0', letterSpacing: '0.02em' }}>📍 {profile.city || 'Türkiye'}</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Hobbies */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {hobbyBadges.length ? hobbyBadges.map((hobby) => (
                        <span key={hobby} style={{ background: 'rgba(201,112,144,0.1)', border: '1px solid rgba(201,112,144,0.2)', borderRadius: '999px', padding: '0.25rem 0.65rem', fontSize: '0.7rem', color: 'var(--rose)', fontWeight: 500 }}>{hobby}</span>
                      )) : <span style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '999px', padding: '0.25rem 0.65rem', fontSize: '0.7rem', color: 'var(--muted)' }}>Yeni tanışma</span>}
                    </div>

                    {/* CTA */}
                    <button
                      type="button"
                      onClick={() => openChatWithProfile(profile.id)}
                      style={{ width: '100%', height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #c97090, #8a3858)', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.03em', transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(201,112,144,0.25)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                    >
                      Mesaj Gönder ✉
                    </button>

                    {/* Reaction row */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => { setHeartedProfiles((s) => ({ ...s, [profile.id]: !s[profile.id] })); sendReaction(profile.id, 'heart'); }}
                        style={{ flex: 1, height: 36, borderRadius: '10px', background: hearted ? 'rgba(232,80,100,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${hearted ? 'rgba(232,80,100,0.35)' : 'rgba(255,255,255,0.08)'}`, color: hearted ? '#e05070' : 'var(--muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.02em' }}
                      >
                        {hearted ? '❤️ Beğenildi' : '🤍 Kalp At'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setWavedProfiles((s) => ({ ...s, [profile.id]: !s[profile.id] })); sendReaction(profile.id, 'wave'); }}
                        style={{ flex: 1, height: 36, borderRadius: '10px', background: waved ? 'rgba(80,180,232,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${waved ? 'rgba(80,180,232,0.3)' : 'rgba(255,255,255,0.08)'}`, color: waved ? '#60b8e0' : 'var(--muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.02em' }}
                      >
                        {waved ? '👋 Selamlandı' : '👋 Selam Gönder'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {!discoverProfiles.length && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed rgba(232,160,176,0.15)', borderRadius: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--rose)', marginBottom: '0.75rem', fontStyle: 'italic' }}>Profil bulunamadı</div>
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Arama kelimesini temizleyip filtreleri değiştirerek tekrar dene.</p>
            </div>
          )}
        </main>

      /* ────────────────────────────────────────────────── */
      /* PROFILE EDIT                                      */
      /* ────────────────────────────────────────────────── */
      ) : userView === 'profile' ? (
        <main style={{ maxWidth: 860, margin: '1.5rem auto', display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem' }}>
          <aside style={{ background: 'linear-gradient(160deg, rgba(24,19,24,0.97), rgba(18,13,18,0.99))', border: '1px solid rgba(232,160,176,0.12)', borderRadius: '1.25rem', padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 500, color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.1 }}>Profilim</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>Profil bilgilerini güncelle ve diğer kullanıcılara nasıl görüneceğini ayarla.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(232,160,176,0.08)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{memberProfile.status_emoji}</span>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>{memberSession?.username}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{memberProfile.city || 'Şehir belirtilmedi'}</div>
                </div>
              </div>
            </div>
          </aside>

          <section style={{ background: 'linear-gradient(160deg, rgba(24,19,24,0.97), rgba(18,13,18,0.99))', border: '1px solid rgba(232,160,176,0.12)', borderRadius: '1.25rem', padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 500, color: 'var(--cream)', margin: 0, fontStyle: 'italic' }}>Bilgilerini Düzenle</h4>

            {memberProfile.photo_url && <img src={memberProfile.photo_url} alt="profil" className="profile-photo" style={{ width: 80, height: 80 }} />}

            <div style={{ display: 'grid', gap: '0.65rem' }}>
              <input id="member-photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const url = await uploadImage(file, 'members'); if (url) setMemberProfile((s) => ({ ...s, photo_url: url })); }} />
              <label htmlFor="member-photo-upload" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: '12px', background: 'rgba(201,112,144,0.1)', border: '1px solid rgba(201,112,144,0.25)', color: 'var(--rose)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.03em' }}>
                📷 Fotoğraf Yükle
              </label>
              <input placeholder="Yaş" type="number" value={memberProfile.age} onChange={(e) => setMemberProfile((s) => ({ ...s, age: e.target.value }))} style={{ borderRadius: '12px', height: 46 }} />
              <input placeholder="Şehir" value={memberProfile.city} onChange={(e) => setMemberProfile((s) => ({ ...s, city: e.target.value }))} style={{ borderRadius: '12px', height: 46 }} />
              <textarea placeholder="Hobiler (virgülle ayır)" value={memberProfile.hobbies} onChange={(e) => setMemberProfile((s) => ({ ...s, hobbies: e.target.value }))} style={{ borderRadius: '12px', minHeight: 80, resize: 'vertical' }} />
              <select value={memberProfile.status_emoji} onChange={(e) => setMemberProfile((s) => ({ ...s, status_emoji: e.target.value }))} style={{ borderRadius: '12px', height: 46 }}>
                <option value="🙂">🙂 Normal</option>
                <option value="☕">☕ Kahve içiyor</option>
                <option value="💃">💃 Dans ediyor</option>
                <option value="🎧">🎧 Müzik dinliyor</option>
                <option value="🌙">🌙 Dinleniyor</option>
              </select>
              <button onClick={saveOwnProfile} style={{ height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #c97090, #8a3858)', fontWeight: 700, letterSpacing: '0.04em', fontSize: '0.88rem' }}>
                Kaydet
              </button>
            </div>
          </section>
        </main>

      /* ────────────────────────────────────────────────── */
      /* CHAT VIEW                                         */
      /* ────────────────────────────────────────────────── */
      ) : (
        <main className="dashboard user-grid user-dashboard user-chat-layout compact-shell">
          <aside className="card">
            <h3 style={{ padding: '1rem', margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cream)', borderBottom: '1px solid var(--border)', fontStyle: 'italic' }}>Sohbetler</h3>
            <div className="profile-list" ref={profileListRef}>
              {sortedProfiles.map((profile) => (
                <button key={profile.id} onClick={() => setSelectedProfileId(profile.id)} className={`profile-item ${selectedProfileId === profile.id ? 'active' : ''} ${unreadByProfile[profile.id] > 0 ? 'has-unread' : ''}`}>
                  <span className={`avatar-wrap ${unreadByProfile[profile.id] > 0 ? 'ringing' : ''}`}>
                    {profile.photo_url ? <img src={profile.photo_url} alt={profile.name} className="avatar" /> : <span className="avatar-fallback">{profile.name?.slice(0, 1)}</span>}
                  </span>
                  <span className="profile-main">
                    <strong>{profile.name}</strong>
                    <small>{profile.city || 'Türkiye'}</small>
                  </span>
                  <span className={`online-dot ${effectiveOnlineProfiles[profile.id] ? 'on' : ''}`} />
                  {unreadByProfile[profile.id] > 0 && <small>Yeni ({unreadByProfile[profile.id]})</small>}
                </button>
              ))}
            </div>
            {selectedProfile && (
              <div className="meta">
                {selectedProfile.photo_url && <img src={selectedProfile.photo_url} alt={selectedProfile.name} className="profile-photo" />}
                <p><strong>Yaş:</strong> {selectedProfile.age}</p>
                <p><strong>Şehir:</strong> {selectedProfile.city || '-'}</p>
                <p><strong>Hobiler:</strong> {selectedProfile.hobbies || '-'}</p>
                <p style={{ color: 'var(--rose)' }}><strong>Uyum skoru:</strong> %{interestScore}</p>
              </div>
            )}
          </aside>

          <section className="card">
            <h3 style={{ padding: '1rem', margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cream)', borderBottom: '1px solid var(--border)', fontStyle: 'italic' }}>
              {selectedProfile ? `${selectedProfile.name} ile Sohbet` : 'Sohbet'}
            </h3>
            <div className="chat-box" ref={chatBoxRef}>
              {messages.map((msg) => {
                const audioUrl = getAudioUrl(msg.content);
                return (
                  <div key={msg.id} className={`msg ${msg.sender_role}`}>
                    <span>{msg.sender_role === 'member' ? 'Sen' : selectedProfile?.name}</span>
                    {audioUrl ? <audio controls src={audioUrl} className="audio-player" /> : <p>{msg.content}</p>}
                    <small>{formatTime(msg.created_at)}{msg.sender_role === 'member' ? <span className={`ticks ${msg.seen_by_admin ? 'seen' : ''}`} title={msg.seen_by_admin_at ? `Görüldü: ${formatTime(msg.seen_by_admin_at)}` : `Teslim: ${formatTime(msg.created_at)}`}>✓✓</span> : ''}</small>
                  </div>
                );
              })}
            </div>
            {typingLabel && <div className="typing-indicator">{typingLabel}</div>}
            <div className="row">
              <textarea className="grow-textarea" placeholder="Mesaj yaz…" value={newMessage} onChange={(e) => { setNewMessage(e.target.value); autoResizeTextarea(e.target, 220); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
              <button onClick={sendMessage}>Gönder</button>
            </div>
          </section>

          <section className="card">
            <h3 style={{ padding: '1rem', margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cream)', borderBottom: '1px solid var(--border)', fontStyle: 'italic' }}>Profil</h3>
            <div style={{ padding: '1rem' }}>
              {memberProfile.photo_url && <img src={memberProfile.photo_url} alt="profil" className="profile-photo" />}
              <p style={{ fontSize: '1.5rem', margin: '0.5rem 0 0.25rem' }}>{memberProfile.status_emoji}</p>
              <p style={{ color: 'var(--text2)', fontSize: '0.82rem', margin: '0.2rem 0' }}><strong style={{ color: 'var(--text)' }}>Yaş:</strong> {memberProfile.age || '-'}</p>
              <p style={{ color: 'var(--text2)', fontSize: '0.82rem', margin: '0.2rem 0' }}><strong style={{ color: 'var(--text)' }}>Şehir:</strong> {memberProfile.city || '-'}</p>
              <p style={{ color: 'var(--text2)', fontSize: '0.82rem', margin: '0.2rem 0' }}><strong style={{ color: 'var(--text)' }}>Hobiler:</strong> {memberProfile.hobbies || '-'}</p>
              <button type="button" onClick={() => setUserView('profile')} style={{ width: '100%', marginTop: '0.85rem', background: 'rgba(201,112,144,0.1)', border: '1px solid rgba(201,112,144,0.25)', color: 'var(--rose)', fontSize: '0.82rem', fontWeight: 600, borderRadius: '10px', height: 40 }}>
                Profilimi Düzenle
              </button>
            </div>
          </section>
        </main>
      )}

      {status && <p className="status">{status}</p>}
    </div>
  );
}
