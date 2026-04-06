import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
const ADMIN_PASSWORD2 = import.meta.env.VITE_ADMIN_PASSWORD2;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const initialProfile = { name: '', age: '', city: '', gender: '', hobbies: '', photo_url: '' };
const initialMemberProfile = { age: '', hobbies: '', city: '', photo_url: '', status_emoji: '🙂' };

const NAME_SEEDS = [
  'Alara','Asya','Defne','Nehir','Derin','Lina','Mira','Arya','Ela','Ada','Duru','Elif','Zeynep','Eylül','İdil','İpek','Mina','Nisa','Sude','Su','Beren','Naz','Aylin','Yaren','Lara','Selin','Melis','Ayşe','Buse','Ceren','Yasemin','Sena','Gizem','Selen','Nehir','Yelda','Esila','İrem','Tuana','Merve','Hilal','Nisanur','Ece','Nazlı','Güneş','Ecrin','Hazal','Helin','Sıla','Berfin','Damla','Sinem','Yağmur','Derya','Pelin','Cansu','Gökçe','Deniz','Meryem','Beste','Aden','Alina','Maya','Sahara','Lavin','Lavinya','Rüya','Nehirsu','Miray','Sahra','Mina','Nehirnaz','Aysu','Melisa','Zümra','Ecrinsu','Asel','Rabia','Nursena','Pınar','Leman','Öykü','Çağla','Açelya','Irmak','Ahu','Nehircan','Beliz','Elvan','Ayça','Mislina','Mislinay','Aren','Arven','Helia','Hira','Yüsra','Elisa','Liya','Mona','Noa','Talia'
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
        // setCommandPaletteOpen omitted due to state missing in original, kept to match original logic layout
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 antialiased selection:bg-cyan-500/30 pb-10">
      {/* GLOWING HEADER */}
      <header className="sticky top-4 z-50 mx-auto max-w-7xl px-4 mb-8">
        <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-2xl shadow-2xl">
          <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 flex items-center gap-2">
            <span className="text-fuchsia-400">✦</span> Flort.
          </h1>
          <div className="flex items-center gap-3">
            {isAdmin && loggedIn && (
              <div className="flex items-center gap-1 rounded-2xl bg-white/5 p-1 border border-white/10">
                <button type="button" className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${adminTab === 'chat' ? 'bg-indigo-500 shadow-lg text-white' : 'text-slate-400 hover:text-white'}`} onClick={() => setAdminTab('chat')}>Chat</button>
                <button type="button" className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${adminTab === 'stats' ? 'bg-indigo-500 shadow-lg text-white' : 'text-slate-400 hover:text-white'}`} onClick={() => setAdminTab('stats')}>Stats</button>
                <button type="button" className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${adminTab === 'settings' ? 'bg-indigo-500 shadow-lg text-white' : 'text-slate-400 hover:text-white'}`} onClick={() => setAdminTab('settings')}>Settings</button>
              </div>
            )}
            {loggedIn && !isAdmin && (
              <div className="flex items-center gap-2 rounded-2xl border border-blue-300/40 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 p-2 shadow-2xl shadow-blue-500/40 backdrop-blur-xl">
                <button
                  type="button"
                  className={`rounded-xl px-5 py-2.5 text-sm font-extrabold tracking-[0.02em] transition-all ${userView === 'discover' ? 'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 text-white shadow-lg shadow-fuchsia-500/35' : 'bg-white/10 text-indigo-50 ring-1 ring-white/25 hover:-translate-y-0.5 hover:bg-white/20'}`}
                  onClick={() => setUserView('discover')}
                >
                  Keşfet
                </button>
                <button
                  type="button"
                  className={`relative rounded-xl px-5 py-2.5 text-sm font-extrabold tracking-[0.02em] transition-all ${userView === 'chat' ? 'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 text-white shadow-lg shadow-fuchsia-500/35' : 'bg-white/10 text-indigo-50 ring-1 ring-white/25 hover:-translate-y-0.5 hover:bg-white/20'}`}
                  onClick={() => setUserView('chat')}
                >
                  Mesajlar
                  {totalUnreadCount > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-blue-500" />}
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-5 py-2.5 text-sm font-extrabold tracking-[0.02em] transition-all ${userView === 'profile' ? 'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 text-white shadow-lg shadow-fuchsia-500/35' : 'bg-white/10 text-indigo-50 ring-1 ring-white/25 hover:-translate-y-0.5 hover:bg-white/20'}`}
                  onClick={() => setUserView('profile')}
                >
                  Profilim
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-rose-200/50 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 px-5 py-2.5 text-sm font-extrabold tracking-[0.02em] text-white shadow-lg shadow-rose-500/35 transition hover:-translate-y-0.5 hover:brightness-110"
                  onClick={handleSignOut}
                >
                  Çıkış
                </button>
              </div>
            )}
            {!loggedIn && (
              <button className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors" onClick={() => setMode(mode === 'user' ? 'admin' : 'user')}>
                {mode === 'user' ? 'Admin girişi' : 'Kullanıcı girişi'}
              </button>
            )}
            {loggedIn && isAdmin && (
              <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/30" onClick={handleSignOut}>
                Çıkış
              </button>
            )}
          </div>
        </div>
      </header>

      {/* LOGIN VIEW */}
      {!loggedIn ? (
        <section className="relative isolate min-h-[78vh] overflow-hidden rounded-[2rem] border border-white/10 mx-4 max-w-6xl md:mx-auto bg-slate-900/40 px-4 py-6 md:px-8 md:py-8 backdrop-blur-3xl shadow-2xl">
          <div className="pointer-events-none absolute -left-16 top-1/4 h-56 w-56 rounded-full bg-fuchsia-500/35 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-indigo-500/30 blur-[100px]" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-cyan-500/25 blur-[100px]" />

          <div className="relative mx-auto grid max-w-5xl gap-6 lg:grid-cols-[430px_1fr] items-center h-full">
            <div className="rounded-[2.5rem] border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-2xl md:p-10">
              <div className="mb-8 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Flort Quantum UI
                </div>
                <div>
                  <p className="text-sm text-slate-400">Yeni nesil sosyal keşif deneyimi</p>
                  <h2 className="mt-2 text-4xl font-bold tracking-tight text-white">
                    {mode === 'admin' ? 'Yönetici Girişi' : 'Kullanıcı Merkezi'}
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition-all focus-within:border-fuchsia-400 focus-within:bg-white/10 focus-within:shadow-[0_0_20px_rgba(217,70,239,0.2)]">
                  <span className="text-lg text-slate-400">👤</span>
                  <input
                    type="text"
                    placeholder={mode === 'admin' ? 'Kullanıcı adı (Kapalı)' : 'Kullanıcı adı'}
                    disabled={mode === 'admin'}
                    value={mode === 'admin' ? '' : authForm.username}
                    onChange={(e) => setAuthForm((st) => ({ ...st, username: e.target.value }))}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition-all focus-within:border-cyan-400 focus-within:bg-white/10 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                  <span className="text-lg text-slate-400">🔐</span>
                  <input
                    type="password"
                    placeholder="Şifre"
                    value={authForm.password}
                    onChange={(e) => setAuthForm((st) => ({ ...st, password: e.target.value }))}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  disabled={loading}
                  onClick={signIn}
                  className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] hover:shadow-fuchsia-500/40 active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'İşleniyor...' : 'Giriş Yap'}
                </button>
                {mode !== 'admin' && (
                  <button
                    disabled={loading}
                    onClick={signUp}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50"
                  >
                    Hesap Oluştur
                  </button>
                )}
              </div>
            </div>

            <div className="hidden lg:block rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-indigo-900/40 to-fuchsia-900/20 p-8 shadow-2xl backdrop-blur-xl">
              <div className="grid gap-6 md:grid-cols-2 h-full">
                <div className="group relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/5 backdrop-blur-sm">
                  <img
                    src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt="Flort profil kartı"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-3xl font-bold">Sena, 24</h3>
                    <p className="mt-1 text-sm text-white/70 font-medium tracking-wide">İstanbul · Fotoğraf · Dans · Kahve</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-xl">
                    <p className="text-xs uppercase tracking-[0.2em] font-bold text-cyan-400 mb-4">Canlı Etkileşim</p>
                    <div className="space-y-3">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-white/10 border border-white/5 px-4 py-3 text-sm text-white backdrop-blur-md">Selam! Akşam kahve planı var mı? ☕</div>
                      <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-none bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-3 text-sm text-white shadow-lg shadow-indigo-500/30">Olur! 20:30 Nişantaşı nasıl? ✨</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-md">
                      <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">98%</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">Uyum</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-md">
                      <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">2.1s</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">Yanıt</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-md">
                      <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400">24/7</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">Aktif</p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-2 backdrop-blur-md shadow-xl">
                    <input type="text" placeholder="Bir mesaj yaz..." className="flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder-slate-500 outline-none" readOnly />
                    <button type="button" className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-500/30">
                      Gönder
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      // ADMIN DASHBOARD
      ) : isAdmin ? (
        <main className="mx-auto max-w-[1600px] px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[82vh]">
          {/* Admin Sol Menü */}
          <aside className="col-span-1 lg:col-span-3 flex flex-col gap-6 overflow-y-auto rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl p-5 shadow-2xl hide-scrollbar">
            {selectedThread && (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">Aktif Kullanıcı</h4>
                <div className="flex items-center gap-3 mb-3">
                  {selectedMemberProfile?.photo_url ? <img src={selectedMemberProfile.photo_url} alt="" className="h-12 w-12 rounded-full object-cover border border-white/20" /> : <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-xl">{selectedThread.member_username?.slice(0,1)}</div>}
                  <div>
                    <p className="font-bold text-white text-lg">{selectedThread.member_username}</p>
                    <p className="text-xs text-slate-400">{selectedMemberProfile?.city || '-'} • {selectedMemberProfile?.age || '-'} yaş</p>
                  </div>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <p><span className="text-slate-500">Durum:</span> {selectedMemberProfile?.status_emoji || '🙂'}</p>
                  <p><span className="text-slate-500">Hobiler:</span> {selectedMemberProfile?.hobbies || '-'}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col flex-1 overflow-hidden">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 sticky top-0 bg-black/40 backdrop-blur-xl py-2 z-10">Kuyruk</h3>
              <div className="flex flex-col gap-2 overflow-y-auto hide-scrollbar" ref={threadQueueRef}>
                {sortedIncomingThreads.map((thread) => {
                  const threadProfile = profileById[thread.virtual_profile_id];
                  const waitingReply = thread.last_sender_role === 'member';
                  const isActive = selectedThread?.member_id === thread.member_id && selectedThread?.virtual_profile_id === thread.virtual_profile_id;
                  
                  return (
                    <div
                      key={`${thread.member_id}-${thread.virtual_profile_id}`}
                      onClick={() => setSelectedThread(thread)}
                      className={`group cursor-pointer flex items-center gap-3 p-3 rounded-2xl border transition-all ${isActive ? 'border-fuchsia-500/50 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(217,70,239,0.1)]' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'}`}
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
                        className="rounded border-white/20 bg-black/50 text-fuchsia-500 focus:ring-fuchsia-500/50"
                      />
                      <div className="relative">
                        {threadProfile?.photo_url ? (
                          <img src={threadProfile.photo_url} alt="" className="h-10 w-10 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-500/30">{thread.virtual_name?.slice(0, 1)}</div>
                        )}
                        {adminUnreadByThread[threadKey(thread.member_id, thread.virtual_profile_id)] > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-[9px] font-bold flex items-center justify-center border border-black">{adminUnreadByThread[threadKey(thread.member_id, thread.virtual_profile_id)]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {thread.member_username} <span className="text-slate-500">→</span> {thread.virtual_name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {adminTypingByThread[threadKey(thread.member_id, thread.virtual_profile_id)] ? <span className="text-cyan-400 italic">Yazıyor...</span> : thread.last_message_content || 'Mesaj yok'}
                        </p>
                      </div>
                      {waitingReply && <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm">
               <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">SLA Paneli</h4>
               <div className="flex justify-between items-center mb-1">
                 <span className="text-slate-400">Bekleyen:</span>
                 <span className="font-bold text-white">{slaStats.waitingCount}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-400">Ort. Yanıt:</span>
                 <span className="font-bold text-white">{slaStats.avgWaitMin > 0 && slaStats.avgWaitMin < 1 ? '<1 dk' : `${slaStats.avgWaitMin.toFixed(1)} dk`}</span>
               </div>
            </div>
          </aside>

          {/* Admin Orta Alan (Chat veya Stats) */}
          <section className="col-span-1 lg:col-span-6 flex flex-col rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            {adminTab === 'chat' && (
              <>
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedThread?.virtual_name || 'Sohbet Seçilmedi'}</h3>
                    {selectedThreadProfile && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`h-2 w-2 rounded-full ${onlineProfiles[selectedThreadProfile.id] ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`} />
                        <span className="text-xs text-slate-400">{onlineProfiles[selectedThreadProfile.id] ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedThread?.status_tag || 'takip_edilecek'}
                      onChange={(e) => updateSelectedThreadTag(e.target.value)}
                      className="rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-semibold text-slate-200 outline-none focus:border-indigo-500"
                    >
                      {THREAD_TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                    <button type="button" className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors border border-white/5" onClick={() => setAdminDrawerOpen(!adminDrawerOpen)}>
                      {adminDrawerOpen ? 'Kapat ⇥' : 'Bilgi ⇤'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 hide-scrollbar" ref={adminChatBoxRef}>
                  {threadMessages.map((msg) => {
                    const audioUrl = getAudioUrl(msg.content);
                    const isMember = msg.sender_role === 'member';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMember ? 'items-start' : 'items-end'}`}>
                        <span className="text-[10px] text-slate-500 mb-1 ml-1">{isMember ? selectedThread?.member_username : selectedThread?.virtual_name}</span>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-lg ${isMember ? 'bg-white/10 text-white rounded-tl-none border border-white/5' : 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white rounded-tr-none'}`}>
                          {audioUrl ? <audio controls src={audioUrl} className="h-8 max-w-[200px]" /> : <p className="leading-relaxed">{msg.content}</p>}
                        </div>
                        <div className="flex items-center gap-1 mt-1 mr-1 text-[10px] text-slate-500">
                          {formatTime(msg.created_at)}
                          {!isMember && <span className={msg.seen_by_member ? 'text-cyan-400' : 'text-slate-600'}>✓✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-white/10 bg-white/5">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {QUICK_REPLIES.map((reply) => (
                      <button key={reply} type="button" className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors" onClick={() => setAdminReply((prev) => `${prev ? `${prev}\n` : ''}${reply}`)}>{reply}</button>
                    ))}
                    <button type="button" className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-bold text-fuchsia-300 hover:bg-fuchsia-500/20 transition-colors shadow-[0_0_10px_rgba(217,70,239,0.1)]" onClick={fetchAiSuggestions} disabled={loadingSuggestions}>
                      {loadingSuggestions ? 'AI Düşünüyor...' : '✨ AI Önerisi'}
                    </button>
                  </div>
                  {!!aiSuggestions.length && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {aiSuggestions.map((suggestion) => (
                        <button key={suggestion} type="button" className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[12px] text-left text-cyan-100 hover:bg-cyan-500/20 transition-colors" onClick={() => setAdminReply(suggestion)}>{suggestion}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <textarea
                      className="flex-1 resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 min-h-[50px] max-h-[150px] hide-scrollbar"
                      placeholder="Sanal profil olarak yanıtla..."
                      value={adminReply}
                      onChange={(e) => { setAdminReply(e.target.value); autoResizeTextarea(e.target, 150); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminReply(); } }}
                    />
                    <button onClick={sendAdminReply} className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 p-3 text-white shadow-lg shadow-fuchsia-500/25 hover:brightness-110 transition-all h-[50px] w-[50px] flex items-center justify-center">
                      <span className="transform -rotate-45 block">➤</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {adminTab === 'stats' && (
              <div className="p-6 overflow-y-auto hide-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-white">Sistem Metrikleri</h3>
                  <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
                    {['daily', 'weekly', 'monthly'].map((r) => (
                      <button key={r} type="button" className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${statsRange === r ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`} onClick={() => setStatsRange(r)}>
                        {r === 'daily' ? 'Gün' : r === 'weekly' ? 'Hafta' : 'Ay'}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md text-center">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Toplam Msj</p>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">{adminStats.totalMessagesToday}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md text-center">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Yeni Üye</p>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">{adminStats.newMembersToday}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md text-center">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Aktif Thread</p>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-500">{adminStats.activeThreadsToday}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md text-center">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Ort Yanıt</p>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">{adminStats.avgResponseMinToday.toFixed(1)}m</p>
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'settings' && (
              <div className="p-6 overflow-y-auto hide-scrollbar space-y-6">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                   <h3 className="text-lg font-bold text-white mb-4">Sistem Ayarları</h3>
                   <label className="flex items-center justify-between cursor-pointer">
                     <span className="text-sm font-medium text-slate-300">Gelen Mesaj Sesi</span>
                     <input type="checkbox" className="sr-only peer" checked={notificationSoundEnabled} onChange={(e) => setNotificationSoundEnabled(e.target.checked)} />
                     <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                   </label>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Bot Profili Üret</h3>
                    <button className="rounded-xl bg-indigo-500/20 text-indigo-300 px-4 py-2 text-sm font-bold border border-indigo-500/30 hover:bg-indigo-500/40 transition-colors" onClick={fillRandomVirtualProfile}>🎲 Rastgele Doldur</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" placeholder="İsim" value={profileForm.name} onChange={(e) => setProfileForm((s) => ({ ...s, name: e.target.value }))} />
                    <input className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" placeholder="Yaş" type="number" value={profileForm.age} onChange={(e) => setProfileForm((s) => ({ ...s, age: e.target.value }))} />
                    <input className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" placeholder="Şehir" value={profileForm.city} onChange={(e) => setProfileForm((s) => ({ ...s, city: e.target.value }))} />
                    <input className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" placeholder="Cinsiyet" value={profileForm.gender} onChange={(e) => setProfileForm((s) => ({ ...s, gender: e.target.value }))} />
                    <textarea className="col-span-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 min-h-[80px]" placeholder="Hobiler" value={profileForm.hobbies} onChange={(e) => setProfileForm((s) => ({ ...s, hobbies: e.target.value }))} />
                    <div className="col-span-2">
                      <input type="file" accept="image/*" className="hidden" id="admin-photo-upload" onChange={async (e) => { const f = e.target.files?.[0]; if(f) { const u = await uploadImage(f, 'virtual-profiles'); if(u) setProfileForm(s => ({...s, photo_url: u})) } }} />
                      <label htmlFor="admin-photo-upload" className="flex items-center justify-center w-full rounded-xl border-2 border-dashed border-white/20 bg-black/20 py-6 text-sm font-medium text-slate-400 hover:bg-black/40 cursor-pointer transition-colors">
                        {profileForm.photo_url ? 'Fotoğraf Yüklendi (Değiştir)' : '📸 Fotoğraf Seç'}
                      </label>
                    </div>
                    <button className="col-span-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 py-3 font-bold text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.01] transition-transform" onClick={createVirtualProfile}>Profili Kaydet</button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Admin Sağ Menü (Seçili Thread Bilgileri) */}
          {adminDrawerOpen && adminTab === 'chat' && (
            <aside className="col-span-1 lg:col-span-3 flex flex-col gap-6 overflow-y-auto rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl p-5 shadow-2xl hide-scrollbar">
              {selectedThreadProfile && (
                <div className="rounded-2xl border border-white/5 bg-white/5 p-5 text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {selectedThreadProfile.photo_url ? (
                    <img src={selectedThreadProfile.photo_url} alt="" className="h-24 w-24 rounded-full object-cover mx-auto mb-4 border-2 border-white/20 shadow-lg" />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-fuchsia-500/20 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-fuchsia-300 border-2 border-fuchsia-500/30">{selectedThreadProfile.name?.slice(0,1)}</div>
                  )}
                  <h4 className="text-xl font-bold text-white">{selectedThreadProfile.name}, {selectedThreadProfile.age}</h4>
                  <p className="text-sm text-slate-400 mt-1">{selectedThreadProfile.city || '-'}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1">
                    {(selectedThreadProfile.hobbies || '').split(',').filter(Boolean).map(h => (
                       <span key={h} className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-slate-300 border border-white/5">{h.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 rounded-2xl border border-white/5 bg-white/5 p-4 flex flex-col">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">Quick Facts (Notlar)</h4>
                <textarea
                  className="flex-1 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/50 min-h-[150px] hide-scrollbar"
                  placeholder="Kullanıcı zaafları, yalanlar, senaryo notları..."
                  value={quickFactsText}
                  onChange={(e) => setQuickFactsText(e.target.value)}
                />
                <button className="mt-3 w-full rounded-xl bg-amber-500/20 text-amber-400 font-bold py-2 border border-amber-500/30 hover:bg-amber-500/30 transition-colors" onClick={saveQuickFacts}>Notu Kaydet</button>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                 <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">Toplu İşlem</h4>
                 <select className="w-full rounded-xl border border-white/10 bg-black/50 p-2.5 text-sm text-white outline-none mb-3" value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value)}>
                   {BULK_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
                 <button className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-2.5 font-bold text-white shadow-lg shadow-rose-500/25 hover:brightness-110" onClick={sendBulkTemplate}>Seçili Kuyruğa Gönder</button>
              </div>
            </aside>
          )}
        </main>

      // USER DISCOVER VIEW (Zaten bayağı modern Tailwind idi, biraz daha Glassmorphism/Dark Space eklendi)
      ) : userView === 'discover' ? (
        <main className="relative isolate mx-auto max-w-7xl space-y-8 overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 p-6 text-white shadow-2xl backdrop-blur-2xl md:p-8">
          <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-[120px]" />
          <div className="pointer-events-none absolute right-10 top-10 h-56 w-56 rounded-full bg-cyan-500/15 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-0 right-1/3 h-52 w-52 rounded-full bg-indigo-500/15 blur-[120px]" />

          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 text-slate-100 shadow-xl backdrop-blur-md md:p-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="relative space-y-4">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-fuchsia-300">
                  <span className="h-2 w-2 rounded-full bg-fuchsia-400 animate-pulse" />
                  Keşfet Radarı
                </span>
                <h2 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 md:text-5xl">Gelecekteki Eşleşmen ✨</h2>
                <p className="max-w-2xl text-sm text-slate-400 font-medium md:text-base leading-relaxed">
                  Kuantum algoritmamızla senin için en ideal profilleri süzüyoruz. Hemen birini seç ve sohbete başla.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">Toplam: {discoverProfiles.length}</span>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-emerald-400">
                    Çevrimiçi: {discoverProfiles.filter((p) => effectiveOnlineProfiles[p.id]).length}
                  </span>
                </div>
              </div>

              <div className="relative grid gap-3 sm:grid-cols-2 xl:w-[500px]">
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 shadow-inner transition-colors focus-within:border-cyan-500">
                  <span className="text-sm text-cyan-400">⌕</span>
                  <input placeholder="Kimi arıyorsun?" value={profileSearch} onChange={(e) => setProfileSearch(e.target.value)} className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none" />
                </label>
                <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-slate-200 outline-none shadow-inner focus:border-cyan-500 appearance-none">
                  <option value="all">Herkes</option>
                  <option value="Kadın">Kadın</option>
                  <option value="Erkek">Erkek</option>
                </select>
                <input placeholder="Şehir filtresi" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none shadow-inner focus:border-fuchsia-500" />
                <select value={discoverSort} onChange={(e) => setDiscoverSort(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-slate-200 outline-none shadow-inner focus:border-indigo-500 appearance-none">
                  <option value="match">Uyuma göre diz</option>
                  <option value="newest">En yeniler</option>
                  <option value="online">Aktif olanlar</option>
                </select>
              </div>
            </div>
          </section>

          <section className="relative grid gap-6 sm:grid-cols-2 2xl:grid-cols-4">
            {discoverProfiles.map((profile) => {
              const hobbyBadges = (profile.hobbies || '').split(',').map((h) => h.trim()).filter(Boolean).slice(0, 3);
              const isOnline = !!effectiveOnlineProfiles[profile.id];
              const liked = !!likedProfiles[profile.id];
              
              return (
                <article key={profile.id} className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-3 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-white/30 hover:bg-white/10 hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.3)]">
                  <div className="relative h-[380px] overflow-hidden rounded-[1.5rem]">
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-900 to-slate-900 text-7xl font-bold text-white/30">{profile.name?.slice(0, 1)}</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-bold tracking-wide text-white backdrop-blur-md flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-500'}`} />
                      {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 space-y-3 p-5">
                      <div>
                        <h3 className="text-3xl font-black text-white tracking-tight">{profile.name}, {profile.age}</h3>
                        <p className="text-sm font-medium text-slate-300 mt-1">{profile.city || 'Belirtilmemiş'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {hobbyBadges.length ? hobbyBadges.map((hobby) => (
                          <span key={hobby} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-200 backdrop-blur-md">{hobby}</span>
                        )) : <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold text-slate-200">Gizemli</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
                    <button type="button" className="rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-95" onClick={() => openChatWithProfile(profile.id)}>
                      Mesaj Gönder
                    </button>
                    <button type="button" className={`flex items-center justify-center rounded-2xl border px-4 py-3 text-lg transition-all active:scale-90 ${liked ? 'border-rose-500/50 bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'border-white/10 bg-black/40 text-slate-400 hover:text-white'}`} onClick={() => setLikedProfiles((s) => ({ ...s, [profile.id]: !s[profile.id] }))}>
                      {liked ? '♥' : '♡'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {!discoverProfiles.length && (
            <div className="rounded-[2.5rem] border border-dashed border-white/20 bg-white/5 py-20 text-center backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-white">Radarda kimse kalmadı</h3>
              <p className="mt-2 text-slate-400">Arama kriterlerini esneterek yeni evrenler keşfedebilirsin.</p>
            </div>
          )}
        </main>

      // USER CHAT & PROFILE VIEW (Sıfırdan modern Glassmorphism tasarım)
      ) : (
        <main className="mx-auto max-w-7xl px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[80vh]">
          {/* Kullanıcı Sol Menü (Sohbet Listesi) */}
          <aside className="col-span-1 lg:col-span-4 flex flex-col gap-4 overflow-y-auto rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-2xl p-5 shadow-2xl hide-scrollbar">
            <h3 className="text-xl font-bold text-white mb-2 px-2">Mesajlar</h3>
            <div className="flex flex-col gap-2 overflow-y-auto hide-scrollbar" ref={profileListRef}>
              {sortedProfiles.map((profile) => {
                 const isActive = selectedProfileId === profile.id;
                 const hasUnread = unreadByProfile[profile.id] > 0;
                 return (
                   <button key={profile.id} onClick={() => setSelectedProfileId(profile.id)} className={`group relative flex items-center gap-4 p-3 rounded-2xl border transition-all text-left ${isActive ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'border-transparent hover:bg-white/5'}`}>
                     <div className="relative">
                       {profile.photo_url ? (
                         <img src={profile.photo_url} alt="" className="h-14 w-14 rounded-full object-cover border border-white/10" />
                       ) : (
                         <div className="h-14 w-14 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xl text-slate-400 border border-white/10">{profile.name?.slice(0,1)}</div>
                       )}
                       {onlineProfiles[profile.id] && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-black" />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <h4 className={`text-base font-bold truncate ${hasUnread ? 'text-white' : 'text-slate-200'}`}>{profile.name}</h4>
                       <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-cyan-400 font-semibold' : 'text-slate-500'}`}>
                         {hasUnread ? `Yeni mesaj (${unreadByProfile[profile.id]})` : profile.city || 'Sohbet et'}
                       </p>
                     </div>
                   </button>
                 );
              })}
            </div>
          </aside>

          {/* Kullanıcı Orta/Sağ Alan */}
          <section className="col-span-1 lg:col-span-8 flex flex-col rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            {userView === 'profile' ? (
               <div className="p-8 md:p-12 max-w-2xl mx-auto w-full overflow-y-auto hide-scrollbar">
                 <div className="text-center mb-8">
                   <div className="relative inline-block group cursor-pointer mb-6">
                     {memberProfile.photo_url ? (
                       <img src={memberProfile.photo_url} alt="" className="h-32 w-32 rounded-full object-cover border-4 border-white/10 shadow-2xl" />
                     ) : (
                       <div className="h-32 w-32 rounded-full bg-indigo-900/50 flex items-center justify-center text-4xl text-indigo-300 border-4 border-white/10">👤</div>
                     )}
                     <label htmlFor="member-photo-upload" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Değiştir</span>
                     </label>
                     <input id="member-photo-upload" type="file" accept="image/*" className="hidden" onChange={async(e)=>{ const f=e.target.files?.[0]; if(!f)return; const u=await uploadImage(f,'members'); if(u) setMemberProfile(s=>({...s,photo_url:u})); }} />
                   </div>
                   <h2 className="text-3xl font-black text-white">{memberSession?.username}</h2>
                   <p className="text-slate-400 font-medium mt-1">Sanal Evren Profili</p>
                 </div>

                 <div className="space-y-5">
                   <div className="grid grid-cols-2 gap-5">
                     <div className="space-y-1.5">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-2">Yaş</label>
                       <input type="number" placeholder="Örn. 24" value={memberProfile.age} onChange={(e)=>setMemberProfile(s=>({...s,age:e.target.value}))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-fuchsia-500" />
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-2">Şehir</label>
                       <input placeholder="Örn. İzmir" value={memberProfile.city} onChange={(e)=>setMemberProfile(s=>({...s,city:e.target.value}))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-fuchsia-500" />
                     </div>
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-2">Şu anki Ruh Halin</label>
                     <select value={memberProfile.status_emoji} onChange={(e)=>setMemberProfile(s=>({...s,status_emoji:e.target.value}))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-fuchsia-500 appearance-none">
                       <option value="🙂">🙂 Her şey yolunda</option>
                       <option value="☕">☕ Kahve modunda</option>
                       <option value="💃">💃 Eğlence arıyor</option>
                       <option value="🎧">🎧 Müziğe dalmış</option>
                       <option value="🌙">🌙 Dinlenme safhasında</option>
                     </select>
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-2">Nelerden Hoşlanırsın?</label>
                     <textarea placeholder="Kitaplar, yürüyüş, teknoloji..." value={memberProfile.hobbies} onChange={(e)=>setMemberProfile(s=>({...s,hobbies:e.target.value}))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-fuchsia-500 min-h-[100px] resize-none" />
                   </div>
                   <button onClick={saveOwnProfile} className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 py-4 font-bold text-white shadow-lg shadow-fuchsia-500/25 hover:brightness-110 hover:scale-[1.01] transition-all active:scale-95">Değişiklikleri Kaydet</button>
                 </div>
               </div>
            ) : (
              // Kullanıcı Sohbet Alanı
              selectedProfile ? (
                <>
                  <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                      {selectedProfile.photo_url ? <img src={selectedProfile.photo_url} alt="" className="h-12 w-12 rounded-full object-cover border border-white/20" /> : <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xl">{selectedProfile.name?.slice(0,1)}</div>}
                      <div>
                        <h3 className="text-xl font-bold text-white">{selectedProfile.name}</h3>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">{selectedProfile.city} • Uyum: %{interestScore}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4 hide-scrollbar relative" ref={chatBoxRef}>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
                    {messages.map((msg) => {
                      const audioUrl = getAudioUrl(msg.content);
                      const isMe = msg.sender_role === 'member';
                      return (
                        <div key={msg.id} className={`flex flex-col relative z-10 ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[75%] rounded-3xl px-5 py-3 text-[15px] shadow-lg ${isMe ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm border border-white/10 backdrop-blur-md'}`}>
                            {audioUrl ? <audio controls src={audioUrl} className="h-10 max-w-[220px] rounded-full" /> : <p className="leading-normal">{msg.content}</p>}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-500 font-medium px-2">
                            {formatTime(msg.created_at)}
                            {isMe && <span className={msg.seen_by_admin ? 'text-cyan-400' : 'text-slate-600'}>✓✓</span>}
                          </div>
                        </div>
                      );
                    })}
                    {typingLabel && <div className="text-xs text-fuchsia-400 italic font-medium relative z-10 px-2 animate-pulse">{selectedProfile.name} yazıyor...</div>}
                  </div>

                  <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md relative z-10">
                    <div className="flex items-end gap-3 rounded-3xl border border-white/10 bg-black/50 p-2 shadow-inner focus-within:border-cyan-500/50 transition-colors">
                      <textarea
                        className="flex-1 resize-none bg-transparent px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none min-h-[44px] max-h-[120px] hide-scrollbar"
                        placeholder="Bir şeyler yaz..."
                        value={newMessage}
                        onChange={(e) => { setNewMessage(e.target.value); autoResizeTextarea(e.target, 120); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      />
                      <button onClick={sendMessage} className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 p-3 text-white shadow-lg hover:brightness-110 active:scale-90 transition-all h-[44px] w-[44px] flex items-center justify-center shrink-0">
                        <span className="transform -rotate-45 block mb-0.5 ml-0.5">➤</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                   <div className="text-6xl mb-4 opacity-50">🌌</div>
                   <h3 className="text-2xl font-bold text-white mb-2">Uzayda Ses Yok</h3>
                   <p className="text-slate-400 max-w-sm">Soldaki listeden bir profil seçerek konuşmayı başlat veya "Keşfet" sekmesinden yeni eşleşmeler bul.</p>
                </div>
              )
            )}
          </section>
        </main>
      )}

      {/* GLOBAL STATUS TOAST */}
      {status && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-900/90 px-6 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-xl z-[100] flex items-center gap-3 animate-[slideUp_0.3s_ease-out]">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          {status}
        </div>
      )}
      
      {/* İnce scrollbar CSS Inject (Varsa global css içinde halletmek en iyisidir ama komponent tam dolsun diye ekliyorum) */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .hide-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .hide-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .hide-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      `}} />
    </div>
  );
}
