import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';
import { buildHourlyPresenceMap } from './utils/presence';

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
  const [presenceHourBucket, setPresenceHourBucket] = useState(new Date().toISOString().slice(0, 13));
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
  const displayOnlineProfiles = useMemo(
    () => buildHourlyPresenceMap(virtualProfiles, presenceHourBucket, onlineProfiles),
    [virtualProfiles, presenceHourBucket, onlineProfiles]
  );
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
    if (!selectedProfile?.hobbies || !memberProfile?.hobbies) return 0;
    const a = new Set(selectedProfile.hobbies.toLowerCase().split(',').map((x) => x.trim()).filter(Boolean));
    const b = new Set(memberProfile.hobbies.toLowerCase().split(',').map((x) => x.trim()).filter(Boolean));
    if (!a.size || !b.size) return 0;
    let common = 0;
    a.forEach((item) => { if (b.has(item)) common += 1; });
    return Math.round((common / Math.max(a.size, b.size)) * 100);
  }, [selectedProfile, memberProfile]);

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
      if (discoverSort === 'online') return Number(!!displayOnlineProfiles[p2.id]) - Number(!!displayOnlineProfiles[p1.id]);
      return score(p2) - score(p1);
    });
  }, [sortedProfiles, cityFilter, genderFilter, profileSearch, memberProfile.hobbies, discoverSort, displayOnlineProfiles]);

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
    if (isAdmin) fetchIncomingThreads();
  }, [loggedIn, isAdmin]);

  useEffect(() => {
    if (!memberSession || !selectedProfileId || isAdmin || userView !== 'chat') return;
    fetchMessages(selectedProfileId);
  }, [memberSession, selectedProfileId, isAdmin, userView]);

  useEffect(() => {
    if (!selectedProfileId || isAdmin) return;
    setUnreadByProfile((prev) => ({ ...prev, [selectedProfileId]: 0 }));
  }, [selectedProfileId, isAdmin]);

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
    const timer = window.setInterval(() => {
      setPresenceHourBucket(new Date().toISOString().slice(0, 13));
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!isAdmin) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
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

        if (selectedProfileId && changed.virtual_profile_id === selectedProfileId) {
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
  }, [loggedIn, isAdmin, memberSession, selectedProfileId, selectedThread]);

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
    <div className={`min-h-screen bg-slate-50 ${isAdmin ? 'bg-slate-900' : 'bg-gradient-to-br from-indigo-50 via-white to-pink-50'}`}>
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
          <span className="text-3xl animate-pulse">✦</span> Flort Chat
        </h1>
        <div className="flex items-center gap-4">
          {isAdmin && loggedIn && (
            <nav className="hidden md:flex bg-slate-100 p-1 rounded-xl gap-1">
              <button 
                type="button" 
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${adminTab === 'chat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} 
                onClick={() => setAdminTab('chat')}
              >
                Chat
              </button>
              <button 
                type="button" 
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${adminTab === 'stats' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} 
                onClick={() => setAdminTab('stats')}
              >
                Stats
              </button>
              <button 
                type="button" 
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${adminTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} 
                onClick={() => setAdminTab('settings')}
              >
                Settings
              </button>
            </nav>
          )}
          {!loggedIn && (
            <button 
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors" 
              onClick={() => setMode(mode === 'user' ? 'admin' : 'user')}
            >
              {mode === 'user' ? 'Admin Paneli' : 'Kullanıcı Paneli'}
            </button>
          )}
          {loggedIn && (
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-full text-sm font-bold transition-all border border-transparent hover:border-red-100"
            >
              Çıkış Yap
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {loggedIn && !isAdmin && (
          <section className="flex items-center gap-3 mb-8 bg-white/60 backdrop-blur-sm p-2 rounded-2xl border border-white shadow-xl shadow-indigo-100/50">
            <button 
              type="button" 
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${userView === 'discover' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-indigo-50 text-slate-600'}`} 
              onClick={() => setUserView('discover')}
            >
              Keşfet
            </button>
            <button 
              type="button" 
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${userView === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-indigo-50 text-slate-600'}`} 
              onClick={() => setUserView('chat')}
            >
              Mesajlarım
            </button>
            <div className="hidden sm:flex items-center gap-4 ml-auto px-4 border-l border-slate-200">
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-500">👍 {Object.values(likedProfiles).filter(Boolean).length}</span>
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-500">💘 {Object.values(heartedProfiles).filter(Boolean).length}</span>
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-500">👋 {Object.values(wavedProfiles).filter(Boolean).length}</span>
            </div>
          </section>
        )}

        {!loggedIn ? (
          <section className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4">
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-indigo-200/50 border border-indigo-50 overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
              
              <div className="p-8 md:p-10 pt-12">
                <div className="flex justify-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-pink-500 rounded-3xl rotate-12 flex items-center justify-center text-white text-4xl font-black shadow-xl group-hover:rotate-0 transition-transform duration-500">
                    <span className="-rotate-12 group-hover:rotate-0 transition-transform duration-500">C</span>
                  </div>
                </div>

                <h2 className="text-3xl font-black text-center text-slate-800 mb-2">
                  {mode === 'admin' ? 'Admin Girişi' : 'Hoş Geldin!'}
                </h2>
                <p className="text-center text-slate-500 text-sm mb-8">
                  {mode === 'admin' ? 'Yönetici bilgileriyle oturum aç' : 'Hemen kayıt ol ve sohbet etmeye başla'}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Kullanıcı Adı</label>
                    <input
                      className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20 rounded-2xl px-5 py-4 text-slate-700 placeholder-slate-300 transition-all font-medium"
                      placeholder={mode === 'admin' ? 'Admin kullanıcı adı gerekmez' : 'HarikaBirIsim'}
                      disabled={mode === 'admin'}
                      value={mode === 'admin' ? '' : authForm.username}
                      onChange={(e) => setAuthForm((st) => ({ ...st, username: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Şifre</label>
                    <input
                      className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20 rounded-2xl px-5 py-4 text-slate-700 placeholder-slate-300 transition-all font-medium"
                      placeholder="••••••••"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm((st) => ({ ...st, password: e.target.value }))}
                    />
                  </div>
                  
                  <div className="pt-4 space-y-3">
                    <button 
                      disabled={loading} 
                      onClick={signIn}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                    </button>
                    {mode !== 'admin' && (
                      <button 
                        disabled={loading} 
                        onClick={signUp}
                        className="w-full py-4 bg-white border-2 border-indigo-50 hover:border-indigo-100 hover:bg-indigo-50 text-indigo-600 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        Hemen Kayıt Ol
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center max-w-lg">
              <h3 className="text-xl font-bold text-slate-800 mb-3 uppercase tracking-[0.2em]">Sanal Dünya, Gerçek Duygular</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                Modern algoritmalarla eşleş, gerçek zamanlı sohbetin tadını çıkar. 
                Binlerce aktif profil seni bekliyor.
              </p>
            </div>
          </section>
        ) : isAdmin ? (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-140px)] animate-in fade-in duration-500">
          {/* Admin Sidebar: Active Threads */}
          <aside className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
            <div className="bg-slate-800 text-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-full border border-slate-700">
              <div className="p-6 border-b border-slate-700">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  Aktif Konuşmalar
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar-dark">
                {sortedIncomingThreads.map((thread) => {
                  const threadProfile = profileById[thread.virtual_profile_id];
                  const waitingReply = thread.last_sender_role === 'member';
                  const isSelected = selectedThread?.member_id === thread.member_id && selectedThread?.virtual_profile_id === thread.virtual_profile_id;
                  
                  return (
                    <div 
                      key={`${thread.member_id}-${thread.virtual_profile_id}`}
                      className={`relative group rounded-2xl transition-all duration-300 ${isSelected ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-700/50'}`}
                    >
                      <button
                        onClick={() => setSelectedThread(thread)}
                        className="w-full flex items-center gap-3 p-4 text-left"
                      >
                        <div className="relative shrink-0">
                          {threadProfile?.photo_url ? (
                            <img src={threadProfile.photo_url} className="w-10 h-10 rounded-xl object-cover border border-slate-600" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center font-black text-slate-400">
                              {thread.virtual_name?.slice(0, 1)}
                            </div>
                          )}
                          {waitingReply && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-800" />}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm truncate">{thread.member_username}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase truncate opacity-70">
                            → {thread.virtual_name}
                          </p>
                          {thread.last_message_content && (
                            <p className="text-xs text-slate-300 truncate mt-1 italic opacity-60">
                              "{thread.last_message_content}"
                            </p>
                          )}
                        </div>

                        {adminUnreadByThread[threadKey(thread.member_id, thread.virtual_profile_id)] > 0 && (
                          <span className="bg-red-500 text-white w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black">
                            {adminUnreadByThread[threadKey(thread.member_id, thread.virtual_profile_id)]}
                          </span>
                        )}
                      </button>
                      
                      <input
                        type="checkbox"
                        className="absolute top-4 right-2 w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-offset-slate-800"
                        checked={!!selectedThreadKeys[threadKey(thread.member_id, thread.virtual_profile_id)]}
                        onChange={(e) =>
                          setSelectedThreadKeys((prev) => ({
                            ...prev,
                            [threadKey(thread.member_id, thread.virtual_profile_id)]: e.target.checked,
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-slate-900/50 border-t border-slate-700 space-y-3">
                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <span>SLA Durumu</span>
                  <span className={slaStats.waitingCount > 5 ? 'text-red-400' : 'text-green-400'}>
                    {slaStats.waitingCount} Bekleyen
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${slaStats.avgWaitMin > 10 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                    style={{ width: `${Math.min((slaStats.avgWaitMin / 30) * 100, 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Admin Center: Content Area */}
          <section className="lg:col-span-6 flex flex-col gap-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col h-[75vh] lg:h-full overflow-hidden relative">
              {adminTab === 'chat' && (
                <>
                  {/* Admin Chat Header */}
                  <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">
                          {selectedThread?.virtual_name?.slice(0, 1) || '?'}
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${selectedThreadProfile && onlineProfiles[selectedThreadProfile.id] ? 'bg-green-500' : 'bg-slate-300'}`} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800">{selectedThread?.virtual_name || 'Seçim Yapılmadı'}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Kullanıcı: {selectedThread?.member_username || '-'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <select 
                        className="bg-white border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:ring-indigo-500/20"
                        value={selectedThread?.status_tag || 'takip_edilecek'} 
                        onChange={(e) => updateSelectedThreadTag(e.target.value)}
                      >
                        {THREAD_TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                      </select>
                      <button 
                        className="p-2.5 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"
                        onClick={() => setAdminDrawerOpen(!adminDrawerOpen)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Admin Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/30 custom-scrollbar" ref={adminChatBoxRef}>
                    {threadMessages.map((msg) => {
                      const isVirtual = msg.sender_role === 'virtual';
                      const audioUrl = getAudioUrl(msg.content);
                      return (
                        <div key={msg.id} className={`flex ${isVirtual ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium shadow-sm ${isVirtual ? 'bg-slate-800 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                            <div className="flex justify-between items-center gap-8 mb-1 opacity-50 text-[9px] font-black uppercase">
                              <span>{isVirtual ? selectedThread?.virtual_name : selectedThread?.member_username}</span>
                              <span>{formatTime(msg.created_at)}</span>
                            </div>
                            {audioUrl ? <audio controls src={audioUrl} className="h-8 mt-1" /> : <p className="leading-relaxed">{msg.content}</p>}
                            {isVirtual && (
                              <div className="text-right mt-1">
                                <span className={`text-[10px] ${msg.seen_by_member ? 'text-sky-400' : 'text-slate-500'}`}>
                                  {msg.seen_by_member ? '✓✓ Görüldü' : '✓ Gönderildi'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Admin Input Area */}
                  <div className="p-6 bg-white border-t border-slate-100 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {QUICK_REPLIES.map((reply) => (
                        <button 
                          key={reply} 
                          className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-[10px] font-bold text-slate-500 transition-all border border-transparent hover:border-indigo-100"
                          onClick={() => setAdminReply((prev) => `${prev ? `${prev}\n` : ''}${reply}`)}
                        >
                          {reply}
                        </button>
                      ))}
                      <button 
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                        onClick={fetchAiSuggestions} 
                        disabled={loadingSuggestions}
                      >
                        {loadingSuggestions ? 'AI...' : '✦ AI ÖNERİSİ'}
                      </button>
                    </div>

                    {aiSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in zoom-in-95">
                        {aiSuggestions.map((s) => (
                          <button key={s} className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all" onClick={() => setAdminReply(s)}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3 bg-slate-100 p-2 rounded-3xl border border-slate-200 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                      <textarea
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-semibold p-3 resize-none max-h-40"
                        placeholder="Yanıtınızı buraya yazın..."
                        value={adminReply}
                        onChange={(e) => { setAdminReply(e.target.value); autoResizeTextarea(e.target, 160); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminReply(); } }}
                      />
                      <button 
                        onClick={sendAdminReply}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all"
                      >
                        GÖNDER
                      </button>
                    </div>
                  </div>
                </>
              )}

              {adminTab === 'stats' && (
                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-slate-800">Performans Analizi</h3>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {['daily', 'weekly', 'monthly'].map(r => (
                        <button 
                          key={r}
                          className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${statsRange === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                          onClick={() => setStatsRange(r)}
                        >
                          {r === 'daily' ? 'Gün' : r === 'weekly' ? 'Hafta' : 'Ay'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Toplam Mesaj', value: adminStats.totalMessagesToday, color: 'indigo' },
                      { label: 'Üye Mesajı', value: adminStats.memberMessagesToday, color: 'blue' },
                      { label: 'Admin Cevabı', value: adminStats.adminRepliesToday, color: 'pink' },
                      { label: 'Yeni Üye', value: adminStats.newMembersToday, color: 'emerald' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
                        <p className={`text-3xl font-black text-${stat.color}-600`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800 text-white p-8 rounded-[2.5rem] shadow-xl">
                      <h4 className="text-lg font-black mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center text-xs">⏰</span>
                        Yanıt Süreleri
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-sm font-bold opacity-60">Ortalama Cevap Süresi</span>
                          <span className="text-3xl font-black text-indigo-400">{adminStats.avgResponseMinToday.toFixed(1)} dk</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${Math.max(100 - adminStats.avgResponseMinToday * 2, 0)}%` }} />
                        </div>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Hedef: 2.0 dakikanın altı</p>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 bg-pink-100 rounded-xl flex items-center justify-center text-xs">🔥</span>
                        En Popüler Profiller
                      </h4>
                      <div className="space-y-3">
                        {engagementInsights.topProfiles.map((p, i) => (
                          <div key={p.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                            <span className="text-sm font-bold text-slate-700">{i+1}. {p.name}</span>
                            <span className="text-xs font-black text-pink-500 bg-pink-50 px-3 py-1 rounded-lg">{p.count} Etkileşim</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {adminTab === 'settings' && (
                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200">
                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                      <span className="text-2xl">✨</span> Sanal Profil Oluştur
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="relative">
                          <input className="w-full bg-white border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:ring-indigo-500/20" placeholder="İsim (veya 🎲)" value={profileForm.name} onChange={(e) => setProfileForm({ ...s, name: e.target.value })} />
                          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-xl" onClick={fillRandomVirtualProfile}>🎲</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <input className="bg-white border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:ring-indigo-500/20" placeholder="Yaş" type="number" value={profileForm.age} onChange={(e) => setProfileForm({ ...s, age: e.target.value })} />
                          <input className="bg-white border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:ring-indigo-500/20" placeholder="Şehir" value={profileForm.city} onChange={(e) => setProfileForm({ ...s, city: e.target.value })} />
                        </div>
                        <textarea className="w-full bg-white border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:ring-indigo-500/20 h-32" placeholder="Hobiler..." value={profileForm.hobbies} onChange={(e) => setProfileForm({ ...s, hobbies: e.target.value })} />
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex-1 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-6 relative overflow-hidden group">
                          {profileForm.photo_url ? (
                            <img src={profileForm.photo_url} className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <span className="text-4xl mb-2 block">📸</span>
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Fotoğraf Yükle</span>
                            </div>
                          )}
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await uploadImage(file, 'virtual-profiles');
                            if (url) setProfileForm(s => ({ ...s, photo_url: url }));
                          }} />
                        </div>
                        <button className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 transition-all" onClick={createVirtualProfile}>
                          PROFİLİ YAYINLA
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 mb-6">Kayıtlı Üyeler</h3>
                    <div className="space-y-3">
                      {registeredMembers.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                          <div>
                            <p className="font-black text-slate-800">{m.username}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(m.created_at).toLocaleDateString()}</p>
                          </div>
                          <button className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white" onClick={() => deleteMember(m.id)}>SİL</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Admin Right: Quick Facts Drawer */}
          {adminDrawerOpen && adminTab === 'chat' && (
            <aside className="lg:col-span-3 space-y-6 animate-in slide-in-from-right duration-500">
              {selectedThreadProfile && (
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl">
                  <div className="text-center mb-6">
                    <img src={selectedThreadProfile.photo_url} className="w-24 h-24 rounded-3xl object-cover mx-auto mb-4 shadow-lg border-2 border-white" />
                    <h4 className="text-lg font-black text-slate-800">{selectedThreadProfile.name}, {selectedThreadProfile.age}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedThreadProfile.city}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hakkında</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedThreadProfile.hobbies?.split(',').map(h => (
                          <span key={h} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-100">{h.trim()}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-800 text-white p-8 rounded-[2.5rem] shadow-xl space-y-6">
                <h4 className="text-lg font-black flex items-center gap-2">
                  <span className="w-8 h-8 bg-slate-700 rounded-xl flex items-center justify-center text-xs">📝</span>
                  Quick Facts
                </h4>
                <textarea
                  className="w-full bg-slate-700/50 border-slate-600 rounded-2xl p-4 text-sm font-medium focus:ring-indigo-500/20 h-40 resize-none text-slate-200"
                  placeholder="Kullanıcıya özel notlar..."
                  value={quickFactsText}
                  onChange={(e) => setQuickFactsText(e.target.value)}
                />
                <button 
                  className="w-full py-4 bg-white text-slate-800 rounded-2xl font-black shadow-lg transition-all active:scale-95"
                  onClick={saveQuickFacts}
                >
                  NOTU KAYDET
                </button>
              </div>

              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toplu İşlemler</h4>
                <div className="space-y-3">
                  <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold" value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value)}>
                    {BULK_TEMPLATES.map((tpl) => <option key={tpl} value={tpl}>{tpl}</option>)}
                  </select>
                  <button className="w-full py-3 bg-slate-100 hover:bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black transition-all" onClick={sendBulkTemplate}>
                    SEÇİLİ {Object.values(selectedThreadKeys).filter(Boolean).length} KİŞİYE GÖNDER
                  </button>
                </div>
              </div>
=======
    <div className={`layout ${isAdmin ? 'layout-admin' : ''}`}>
      <header className={`topbar ${isAdmin ? 'topbar-admin' : ''}`}>
        <h1 className="brand"><span className="brand-icon">✦</span> Flort Chat</h1>
        <div className="topbar-actions">
          {isAdmin && loggedIn && (
            <div className="admin-nav-pills">
              <button type="button" className={`nav-pill ${adminTab === 'chat' ? 'active' : ''}`} onClick={() => setAdminTab('chat')}>Chat</button>
              <button type="button" className={`nav-pill ${adminTab === 'stats' ? 'active' : ''}`} onClick={() => setAdminTab('stats')}>Stats</button>
              <button type="button" className={`nav-pill ${adminTab === 'settings' ? 'active' : ''}`} onClick={() => setAdminTab('settings')}>Settings</button>
            </div>
          )}
          {!loggedIn && (
            <button className="linkish" onClick={() => setMode(mode === 'user' ? 'admin' : 'user')}>
              {mode === 'user' ? 'Admin girişi' : 'Kullanıcı girişi'}
            </button>
          )}
          {loggedIn && <button onClick={handleSignOut}>Çıkış</button>}
        </div>
      </header>

      {loggedIn && !isAdmin && (
        <section className="user-nav-strip card">
          <button type="button" onClick={() => setUserView('discover')}>Keşfet</button>
          <button type="button" onClick={() => setUserView('chat')}>Mesaj Kutusu</button>
          <span className="mini-stat">👍 {Object.values(likedProfiles).filter(Boolean).length}</span>
          <span className="mini-stat">💘 {Object.values(heartedProfiles).filter(Boolean).length}</span>
          <span className="mini-stat">👋 {Object.values(wavedProfiles).filter(Boolean).length}</span>
        </section>
      )}

      {!loggedIn ? (
        <section className="auth-hero">
          <div className="auth-card">
            <div className="auth-badge">CHAT</div>
            <h2>{mode === 'admin' ? 'Admin Login' : 'Login / Register'}</h2>
            <input
              placeholder={mode === 'admin' ? 'Admin için kullanıcı adı kullanılmıyor' : 'Username...'}
              disabled={mode === 'admin'}
              value={mode === 'admin' ? '' : authForm.username}
              onChange={(e) => setAuthForm((st) => ({ ...st, username: e.target.value }))}
            />
            <input
              placeholder="Password..."
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm((st) => ({ ...st, password: e.target.value }))}
            />
            <button disabled={loading} onClick={signIn}>Sign in</button>
            {mode !== 'admin' && <button disabled={loading} onClick={signUp}>Kayıt ol</button>}
            <small>{mode === 'admin' ? 'Admin şifresi ile giriş yap' : 'Hesabın yoksa kayıt ol'}</small>
          </div>

          <div className="auth-info">
            <h2>MESSENGER</h2>
            <p>
              Gerçek zamanlı sohbet, sanal profiller ve admin cevap penceresi ile modern bir chat deneyimi.
              Üye olarak giriş yapıp profilini oluşturabilir, adminin yanıtlarını anında görebilirsin.
            </p>
          </div>
        </section>
      ) : isAdmin ? (
        <main className="admin-modern compact-shell admin-ops">
          <aside className="admin-left card">
            {selectedThread && (
              <div className="meta selected-profile-meta left-profile-meta">
                <h4>Aktif Konuşan Kullanıcı</h4>
                {selectedMemberProfile?.photo_url && <img src={selectedMemberProfile.photo_url} alt={selectedThread.member_username} className="profile-photo" />}
                <p><strong>Kullanıcı Adı:</strong> {selectedThread.member_username}</p>
                <p><strong>Yaş:</strong> {selectedMemberProfile?.age || '-'}</p>
                <p><strong>Şehir:</strong> {selectedMemberProfile?.city || '-'}</p>
                <p><strong>Hobiler:</strong> {selectedMemberProfile?.hobbies || '-'}</p>
                <p><strong>Durum:</strong> {selectedMemberProfile?.status_emoji || '🙂'}</p>
              </div>
            )}

            <div className="panel-title-row panel-head">
              <h3>Mesaj Bekleyen Thread'ler</h3>
            </div>
            <div className="thread-queue modern-thread-queue" ref={threadQueueRef}>
              {sortedIncomingThreads.map((thread) => {
                const threadProfile = profileById[thread.virtual_profile_id];
                const waitingReply = thread.last_sender_role === 'member';
                return (
                  <button
                    key={`${thread.member_id}-${thread.virtual_profile_id}`}
                    onClick={() => setSelectedThread(thread)}
                    className={`thread-item modern ${selectedThread?.member_id === thread.member_id && selectedThread?.virtual_profile_id === thread.virtual_profile_id ? 'active' : ''}`}
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
                    />
                    <span className="thread-avatar-wrap">
                      {threadProfile?.photo_url ? (
                        <img src={threadProfile.photo_url} alt={thread.virtual_name} className="thread-avatar" />
                      ) : (
                        <span className="thread-avatar-fallback">{thread.virtual_name?.slice(0, 1)}</span>
                      )}
                    </span>
                    <span className="thread-copy">
                      <strong>{thread.member_username} → {thread.virtual_name}</strong>
                      {thread.last_message_content && <small>{thread.last_message_content}</small>}
                      {waitingReply && <small className="pending-badge">Cevap bekliyor</small>}
                      {adminTypingByThread[threadKey(thread.member_id, thread.virtual_profile_id)] && <small>• yazıyor...</small>}
                    </span>
                    {adminUnreadByThread[threadKey(thread.member_id, thread.virtual_profile_id)] > 0 && (
                      <span className="unread-pill">{adminUnreadByThread[threadKey(thread.member_id, thread.virtual_profile_id)]}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="meta">
              <h4>SLA Paneli</h4>
              <p><strong>Cevaplanmamış thread:</strong> {slaStats.waitingCount}</p>
              <p><strong>Ort. bekleme süresi:</strong> {slaStats.avgWaitMin > 0 && slaStats.avgWaitMin < 1 ? '<1 dk' : `${slaStats.avgWaitMin.toFixed(1)} dk`}</p>
            </div>

            <div className="meta">
              <h4>Engagement (7 Gün)</h4>
              <p><strong>Yoğun saatler:</strong></p>
              <ul className="insight-list">
                {engagementInsights.topHours.map((h) => (
                  <li key={h.label}>{h.label} → {h.count} mesaj</li>
                ))}
              </ul>
              <p><strong>İlgi gören profiller:</strong></p>
              <ul className="insight-list">
                {engagementInsights.topProfiles.map((p) => (
                  <li key={p.name}>{p.name} → {p.count} etkileşim</li>
                ))}
              </ul>
            </div>

            <div className="meta">
              <h4>Bulk Aksiyon</h4>
              <select value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value)}>
                {BULK_TEMPLATES.map((tpl) => (
                  <option key={tpl} value={tpl}>{tpl}</option>
                ))}
              </select>
              <button onClick={sendBulkTemplate}>Seçili thread’lere template gönder</button>
            </div>
          </aside>

          <section className="admin-center card">
            {adminTab === 'chat' && (
              <>
                <div className="chat-header admin-center-head">
                  <div>
                    <h3>{selectedThread?.virtual_name || 'Sohbet seç'}</h3>
                    <small>{selectedThreadProfile && onlineProfiles[selectedThreadProfile.id] ? 'Online' : 'Offline'}</small>
                  </div>
                  <select value={selectedThread?.status_tag || 'takip_edilecek'} onChange={(e) => updateSelectedThreadTag(e.target.value)} style={{ width: 'auto' }}>
                    {THREAD_TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                  </select>
                  <button type="button" className="drawer-toggle" onClick={() => setAdminDrawerOpen((v) => !v)}>
                    {adminDrawerOpen ? 'Paneli Gizle' : 'Paneli Aç'}
                  </button>
                </div>

                <div className="chat-box admin-chat-box" ref={adminChatBoxRef}>
                  {threadMessages.map((msg) => {
                    const audioUrl = getAudioUrl(msg.content);
                    return (
                      <div key={msg.id} className={`msg ${msg.sender_role}`}>
                        <span>{msg.sender_role === 'member' ? selectedThread?.member_username : selectedThread?.virtual_name}</span>
                        {audioUrl ? <audio controls src={audioUrl} className="audio-player" /> : <p>{msg.content}</p>}
                        <small>
                          {formatTime(msg.created_at)}
                          {msg.sender_role === 'virtual' ? <span className={`ticks ${msg.seen_by_member ? 'seen' : ''}`} title={msg.seen_by_member_at ? `Görüldü: ${formatTime(msg.seen_by_member_at)}` : `Teslim: ${formatTime(msg.created_at)}`}>✓✓</span> : ''}
                        </small>
                      </div>
                    );
                  })}
                </div>

                <div className="quick-replies">
                  {QUICK_REPLIES.map((reply) => (
                    <button key={reply} type="button" className="chip" onClick={() => setAdminReply((prev) => `${prev ? `${prev}\n` : ''}${reply}`)}>{reply}</button>
                  ))}
                  <button type="button" className="chip ai" onClick={fetchAiSuggestions} disabled={loadingSuggestions}>{loadingSuggestions ? 'AI düşünüyor...' : 'AI Önerisi Getir'}</button>
                </div>

                {!!aiSuggestions.length && (
                  <div className="ai-suggestions">
                    {aiSuggestions.map((suggestion) => (
                      <button key={suggestion} type="button" className="chip" onClick={() => setAdminReply(suggestion)}>{suggestion}</button>
                    ))}
                  </div>
                )}

                <textarea
                  className="grow-textarea"
                  placeholder="Sanal profil cevabı"
                  value={adminReply}
                  onChange={(e) => {
                    setAdminReply(e.target.value);
                    autoResizeTextarea(e.target, 260);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminReply(); } }}
                />
                <button onClick={sendAdminReply}>Yanıt Gönder</button>
              </>
            )}

            {adminTab === 'stats' && (
              <div className="stats-dashboard">
                <h3>Stats Dashboard ({statsRange === 'daily' ? 'Günlük' : statsRange === 'weekly' ? 'Haftalık' : 'Aylık'})</h3>
                <div className="stats-range-switch">
                  <button type="button" className={statsRange === 'daily' ? 'active' : ''} onClick={() => setStatsRange('daily')}>Günlük</button>
                  <button type="button" className={statsRange === 'weekly' ? 'active' : ''} onClick={() => setStatsRange('weekly')}>Haftalık</button>
                  <button type="button" className={statsRange === 'monthly' ? 'active' : ''} onClick={() => setStatsRange('monthly')}>Aylık</button>
                </div>
                <div className="stats-grid">
                  <div className="meta stat-card"><small>Toplam Mesaj</small><strong>{adminStats.totalMessagesToday}</strong></div>
                  <div className="meta stat-card"><small>Üye Mesajı</small><strong>{adminStats.memberMessagesToday}</strong></div>
                  <div className="meta stat-card"><small>Admin Cevabı</small><strong>{adminStats.adminRepliesToday}</strong></div>
                  <div className="meta stat-card"><small>Cevaplanan Thread</small><strong>{adminStats.respondedThreadsToday}</strong></div>
                  <div className="meta stat-card"><small>Yeni Üye Kaydı</small><strong>{adminStats.newMembersToday}</strong></div>
                  <div className="meta stat-card"><small>Aktif Thread</small><strong>{adminStats.activeThreadsToday}</strong></div>
                  <div className="meta stat-card"><small>Ort. Cevap Süresi</small><strong>{adminStats.avgResponseMinToday.toFixed(1)} dk</strong></div>
                </div>

                <div className="stats-lists">
                  <div className="meta">
                    <p><strong>Yoğun Saatler</strong></p>
                    <ul className="insight-list">
                      {engagementInsights.topHours.map((h) => <li key={h.label}>{h.label} → {h.count}</li>)}
                    </ul>
                  </div>
                  <div className="meta">
                    <p><strong>En Çok İlgi Gören Profiller</strong></p>
                    <ul className="insight-list">
                      {engagementInsights.topProfiles.map((p) => <li key={p.name}>{p.name} → {p.count}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'settings' && (
              <div className="settings-page">
                <div className="meta">
                  <h3>Settings</h3>
                  <label className="toggle-row">
                    <span>Bildirim sesi</span>
                    <input
                      type="checkbox"
                      checked={notificationSoundEnabled}
                      onChange={(e) => setNotificationSoundEnabled(e.target.checked)}
                    />
                  </label>
                </div>

                <div className="meta">
                  <div className="panel-title-row panel-divider">
                    <h3>Sanal Profil Oluştur</h3>
                    <button type="button" className="icon-dice" onClick={fillRandomVirtualProfile} aria-label="Rastgele üret">🎲</button>
                  </div>

                  <label className="floating-field">
                    <input placeholder=" " value={profileForm.name} onChange={(e) => setProfileForm((s) => ({ ...s, name: e.target.value }))} />
                    <span>Ad (boşsa otomatik)</span>
                  </label>
                  <label className="floating-field">
                    <input placeholder=" " type="number" value={profileForm.age} onChange={(e) => setProfileForm((s) => ({ ...s, age: e.target.value }))} />
                    <span>Yaş (boşsa otomatik)</span>
                  </label>
                  <label className="floating-field">
                    <input placeholder=" " value={profileForm.city} onChange={(e) => setProfileForm((s) => ({ ...s, city: e.target.value }))} />
                    <span>Şehir (boşsa otomatik)</span>
                  </label>
                  <label className="floating-field">
                    <input placeholder=" " value={profileForm.gender} onChange={(e) => setProfileForm((s) => ({ ...s, gender: e.target.value }))} />
                    <span>Cinsiyet</span>
                  </label>
                  <label className="floating-field">
                    <textarea placeholder=" " value={profileForm.hobbies} onChange={(e) => setProfileForm((s) => ({ ...s, hobbies: e.target.value }))} />
                    <span>Hobiler</span>
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadImage(file, 'virtual-profiles');
                      if (url) setProfileForm((s) => ({ ...s, photo_url: url }));
                    }}
                  />
                  {profileForm.photo_url && <img src={profileForm.photo_url} alt="Önizleme" className="upload-preview" />}

                  <button onClick={createVirtualProfile}>Kaydet (Foto + Otomatik İsim/Şehir/Yaş)</button>
                </div>

                <div className="meta">
                  <h3>Kayıt Olan Kullanıcılar</h3>
                  {loadingMembers ? (
                    <p>Yükleniyor...</p>
                  ) : (
                    <div className="member-list">
                      {registeredMembers.map((member) => (
                        <div key={member.id} className="member-row">
                          <div>
                            <strong>{member.username}</strong>
                            <small>{new Date(member.created_at).toLocaleString('tr-TR')}</small>
                          </div>
                          <button type="button" className="danger-btn" onClick={() => deleteMember(member.id)}>Sil</button>
                        </div>
                      ))}
                      {!registeredMembers.length && <p>Kayıtlı kullanıcı yok.</p>}
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
                  <h4>Seçili Profil Bilgileri</h4>
                  {selectedThreadProfile.photo_url && <img src={selectedThreadProfile.photo_url} alt={selectedThreadProfile.name} className="profile-photo" />}
                  <p><strong>Ad:</strong> {selectedThreadProfile.name}</p>
                  <p><strong>Yaş:</strong> {selectedThreadProfile.age}</p>
                  <p><strong>Şehir:</strong> {selectedThreadProfile.city || '-'}</p>
                  <p><strong>Hobiler:</strong> {selectedThreadProfile.hobbies || '-'}</p>
                </div>
              )}

              <div className="meta">
                <h4>Quick Facts</h4>
                <textarea
                  placeholder="Kullanıcı hakkında önemli notlar (şehir, iş, sınırlar, tercih vb.)"
                  value={quickFactsText}
                  onChange={(e) => setQuickFactsText(e.target.value)}
                />
                <button onClick={saveQuickFacts}>Quick Facts Kaydet</button>
              </div>

>>>>>>> 461019a74df50a7e7e99e887b36546377ed561e5
            </aside>
          )}
        </main>
      ) : userView === 'discover' ? (
<<<<<<< HEAD
        <main className="animate-in fade-in duration-700">
          <section className="mb-10 text-center md:text-left">
            <h2 className="text-4xl font-black text-slate-900 mb-2">Keşfet <span className="text-indigo-600">2026</span> ✨</h2>
            <p className="text-slate-500 font-medium mb-8">Senin için en uygun profilleri bir araya getirdik.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/40 p-4 rounded-3xl border border-white shadow-xl shadow-indigo-100/30">
              <input 
                className="bg-white/80 border-none rounded-2xl px-5 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                placeholder="📍 Şehir ara..." 
                value={cityFilter} 
                onChange={(e) => setCityFilter(e.target.value)} 
              />
              <select 
                className="bg-white/80 border-none rounded-2xl px-5 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                value={genderFilter} 
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option value="all">Tüm Cinsiyetler</option>
                <option value="Kadın">Kadın</option>
                <option value="Erkek">Erkek</option>
              </select>
              <input 
                className="bg-white/80 border-none rounded-2xl px-5 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                placeholder="🔍 İsim veya hobi..." 
                value={profileSearch} 
                onChange={(e) => setProfileSearch(e.target.value)} 
              />
              <select 
                className="bg-white/80 border-none rounded-2xl px-5 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                value={discoverSort} 
                onChange={(e) => setDiscoverSort(e.target.value)}
              >
                <option value="match">Akıllı Sıralama</option>
                <option value="online">Şu an Online</option>
                <option value="newest">En Yeniler</option>
                <option value="age_asc">Yaşa Göre (Artan)</option>
              </select>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {discoverProfiles.map((profile) => (
              <article key={profile.id} className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-indigo-100/50 hover:shadow-2xl hover:shadow-indigo-200 transition-all duration-500 hover:-translate-y-2 border border-white">
                <div className="aspect-[3/4] relative overflow-hidden">
                  {profile.photo_url ? (
                    <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-4xl font-black text-slate-300">
                      {profile.name?.slice(0, 1)}
                    </div>
                  )}
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  
                  {/* Status Badges */}
                  <div className="absolute top-5 left-5 flex gap-2">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${displayOnlineProfiles[profile.id] ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${displayOnlineProfiles[profile.id] ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`} />
                      {displayOnlineProfiles[profile.id] ? 'Online' : 'Offline'}
                    </span>
                    <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Doğrulandı
                    </span>
                  </div>

                  {/* Profile Info Overlay */}
                  <div className="absolute bottom-6 left-6 right-6 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="text-2xl font-black mb-1">{profile.name}, {profile.age}</h3>
                    <p className="text-white/80 text-sm font-semibold mb-4 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      {profile.city || 'Türkiye'}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-2">
                  <div className="flex gap-2 mb-6">
                    <button 
                      className={`flex-1 flex justify-center items-center py-3 rounded-2xl transition-all ${heartedProfiles[profile.id] ? 'bg-pink-100 text-pink-600' : 'bg-slate-50 text-slate-400 hover:bg-pink-50 hover:text-pink-500'}`}
                      onClick={() => { setHeartedProfiles((s) => ({ ...s, [profile.id]: !s[profile.id] })); sendReaction(profile.id, 'heart'); }}
                    >
                      <span className="text-xl">💘</span>
                    </button>
                    <button 
                      className={`flex-1 flex justify-center items-center py-3 rounded-2xl transition-all ${wavedProfiles[profile.id] ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`}
                      onClick={() => { setWavedProfiles((s) => ({ ...s, [profile.id]: !s[profile.id] })); sendReaction(profile.id, 'wave'); }}
                    >
                      <span className="text-xl">👋</span>
                    </button>
                    <button 
                      className={`flex-1 flex justify-center items-center py-3 rounded-2xl transition-all ${likedProfiles[profile.id] ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-500'}`}
                      onClick={() => { setLikedProfiles((s) => ({ ...s, [profile.id]: !s[profile.id] })); sendReaction(profile.id, 'like'); }}
                    >
                      <span className="text-xl">👍</span>
                    </button>
                  </div>
                  
                  <button 
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
                    onClick={() => openChatWithProfile(profile.id)}
                  >
                    Sohbet Başlat
                  </button>
=======
        <main className="dashboard compact-shell discover-shell">
          <section className="card discover-hero">
            <h2>Discover 2026 ✨</h2>
            <p>Şehir, cinsiyet ve ilgi alanlarına göre profilleri keşfet. Hızlı aksiyonlarla sohbet başlat.</p>
            <div className="discover-filters">
              <input placeholder="Şehir ara" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
                <option value="all">Tümü</option>
                <option value="Kadın">Kadın</option>
                <option value="Erkek">Erkek</option>
              </select>
              <input placeholder="İsim / hobi ara" value={profileSearch} onChange={(e) => setProfileSearch(e.target.value)} />
              <select value={discoverSort} onChange={(e) => setDiscoverSort(e.target.value)}>
                <option value="match">Uyuma Göre</option>
                <option value="online">Online</option>
                <option value="newest">Yeni Eklenen</option>
                <option value="age_asc">Yaş (Artan)</option>
              </select>
              <button type="button" onClick={() => setUserView('chat')}>Mesaj Kutuma Git</button>
            </div>
            <div className="discover-meta-row">
              <span className="mini-pill">{discoverProfiles.length} profil bulundu</span>
              <span className="mini-pill">Trend: kısa mesaj + hızlı etkileşim</span>
            </div>
          </section>

          <section className="discover-grid">
            {discoverProfiles.map((profile) => (
              <article key={profile.id} className="card discover-card">
                <div className="discover-topline">
                  <span className={`online-dot ${displayOnlineProfiles[profile.id] ? 'on' : ''}`} />
                  <span>{displayOnlineProfiles[profile.id] ? 'Online' : 'Offline'}</span>
                  <span className="verified-pill">✔ doğrulandı</span>
                </div>
                {profile.photo_url ? <img src={profile.photo_url} alt={profile.name} className="discover-photo" /> : <div className="discover-photo-fallback">{profile.name?.slice(0, 1)}</div>}
                <h3>{profile.name}, {profile.age}</h3>
                <p>{profile.city || 'Türkiye'} • {profile.gender || '-'}</p>
                <small className="discover-hobbies">{profile.hobbies || 'Hobi bilgisi yok.'}</small>
                <div className="discover-actions">
                  <button type="button" onClick={() => { setHeartedProfiles((s) => ({ ...s, [profile.id]: !s[profile.id] })); sendReaction(profile.id, 'heart'); }}>{heartedProfiles[profile.id] ? '💘 Kalp Atıldı' : '💘 Kalp At'}</button>
                  <button type="button" onClick={() => { setWavedProfiles((s) => ({ ...s, [profile.id]: !s[profile.id] })); sendReaction(profile.id, 'wave'); }}>{wavedProfiles[profile.id] ? '👋 El Sallandı' : '👋 El Salla'}</button>
                  <button type="button" onClick={() => { setLikedProfiles((s) => ({ ...s, [profile.id]: !s[profile.id] })); sendReaction(profile.id, 'like'); }}>{likedProfiles[profile.id] ? '👍 Beğenildi' : '👍 Beğen'}</button>
                  <button type="button" className="cta-message" onClick={() => openChatWithProfile(profile.id)}>Mesaj At</button>
>>>>>>> 461019a74df50a7e7e99e887b36546377ed561e5
                </div>
              </article>
            ))}
          </section>
        </main>
      ) : (
<<<<<<< HEAD
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Left Sidebar: Conversations */}
          <aside className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-white shadow-xl shadow-indigo-100/30 overflow-hidden flex flex-col h-full">
              <div className="p-6 pb-2 border-b border-slate-100">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  Mesajlar <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-lg text-xs">{sortedProfiles.length}</span>
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {sortedProfiles.map((profile) => (
                  <button 
                    key={profile.id} 
                    onClick={() => setSelectedProfileId(profile.id)} 
                    className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 group ${selectedProfileId === profile.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'hover:bg-indigo-50 text-slate-600'}`}
                  >
                    <div className="relative">
                      {profile.photo_url ? (
                        <img src={profile.photo_url} alt={profile.name} className={`w-12 h-12 rounded-2xl object-cover border-2 ${selectedProfileId === profile.id ? 'border-indigo-400' : 'border-white'}`} />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                          {profile.name?.slice(0,1)}
                        </div>
                      )}
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${displayOnlineProfiles[profile.id] ? 'bg-green-500' : 'bg-slate-300'}`} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`font-bold truncate ${selectedProfileId === profile.id ? 'text-white' : 'text-slate-800'}`}>{profile.name}</p>
                      <p className={`text-xs truncate ${selectedProfileId === profile.id ? 'text-indigo-100' : 'text-slate-400'}`}>{profile.city || 'Türkiye'}</p>
                    </div>
                    {unreadByProfile[profile.id] > 0 && (
                      <span className={`w-6 h-6 flex items-center justify-center rounded-xl text-[10px] font-black ${selectedProfileId === profile.id ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                        {unreadByProfile[profile.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Center: Chat Window */}
          <section className="lg:col-span-6 flex flex-col gap-6">
            <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl shadow-indigo-100/50 overflow-hidden flex flex-col h-[70vh] lg:h-full relative">
              {/* Chat Header */}
              {selectedProfile && (
                <div className="p-6 bg-white border-b border-slate-50 flex items-center gap-4">
                  <div className="relative">
                    <img src={selectedProfile.photo_url} className="w-12 h-12 rounded-2xl object-cover" />
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${displayOnlineProfiles[selectedProfile.id] ? 'bg-green-500' : 'bg-slate-300'}`} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">{selectedProfile.name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {displayOnlineProfiles[selectedProfile.id] ? 'Şu an aktif' : 'Çevrimdışı'}
                    </p>
                  </div>
                </div>
              )}

              {/* Chat Box */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/50" ref={chatBoxRef}>
                {messages.map((msg) => {
                  const isMember = msg.sender_role === 'member';
                  const audioUrl = getAudioUrl(msg.content);
                  return (
                    <div key={msg.id} className={`flex ${isMember ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[80%] px-5 py-3.5 rounded-3xl shadow-sm ${isMember ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-indigo-50 rounded-tl-sm'}`}>
                        <div className="text-[10px] font-bold opacity-50 mb-1 uppercase tracking-wider">
                          {isMember ? 'Sen' : selectedProfile?.name}
                        </div>
                        {audioUrl ? (
                          <audio controls src={audioUrl} className="w-full h-10 mt-1" />
                        ) : (
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <div className={`text-[9px] font-bold mt-2 flex items-center justify-end gap-1 opacity-60 ${isMember ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {formatTime(msg.created_at)}
                          {isMember && (
                            <span className={msg.seen_by_admin ? 'text-sky-300' : 'text-indigo-200'}>
                              {msg.seen_by_admin ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {typingLabel && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white border border-indigo-50 px-5 py-3 rounded-3xl text-xs font-bold text-indigo-600">
                      {typingLabel}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-6 bg-white border-t border-slate-50">
                <div className="flex items-end gap-3 bg-slate-50 p-2 rounded-[2rem] border border-slate-100 focus-within:border-indigo-200 focus-within:bg-white transition-all">
                  <textarea
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-semibold p-3 resize-none max-h-32 text-slate-700 placeholder-slate-400"
                    placeholder="Mesajınızı buraya yazın..."
                    rows="1"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      autoResizeTextarea(e.target, 128);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <button 
                    onClick={sendMessage}
                    className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] shadow-lg shadow-indigo-100 transition-all active:scale-90"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Right Sidebar: Profile Details & Own Profile */}
          <aside className="lg:col-span-3 space-y-8">
            {selectedProfile && (
              <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-indigo-100/30 overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center text-center">
                  <img src={selectedProfile.photo_url} className="w-24 h-24 rounded-3xl object-cover mb-4 shadow-lg" />
                  <h3 className="text-xl font-black text-slate-800">{selectedProfile.name}, {selectedProfile.age}</h3>
                  <p className="text-sm font-bold text-slate-400 mb-6">{selectedProfile.city || 'Türkiye'}</p>
                  
                  <div className="w-full space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Ortak İlgi Skoru</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-indigo-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${interestScore}%` }} />
                        </div>
                        <span className="text-sm font-black text-indigo-600">%{interestScore}</span>
                      </div>
                    </div>
                    
                    <div className="text-left space-y-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hobiler</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProfile.hobbies?.split(',').map(h => (
                            <span key={h} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-100">
                              {h.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-white shadow-xl shadow-indigo-100/30 p-8">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center justify-between">
                Profilim
                <span className="text-2xl">{memberProfile.status_emoji}</span>
              </h3>
              
              <div className="space-y-4">
                <div className="relative group">
                  {memberProfile.photo_url ? (
                    <img src={memberProfile.photo_url} className="w-full aspect-square rounded-[2rem] object-cover mb-4 border-2 border-indigo-50" />
                  ) : (
                    <div className="w-full aspect-square rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-300 text-5xl mb-4">📸</div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    id="profile-upload"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadImage(file, 'members');
                      if (url) setMemberProfile((s) => ({ ...s, photo_url: url }));
                    }}
                  />
                  <label htmlFor="profile-upload" className="absolute bottom-6 right-2 p-3 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-2xl shadow-xl cursor-pointer transition-all border border-indigo-50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Yaş"
                    type="number"
                    value={memberProfile.age}
                    onChange={(e) => setMemberProfile((s) => ({ ...s, age: e.target.value }))}
                  />
                  <input
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Şehir"
                    value={memberProfile.city}
                    onChange={(e) => setMemberProfile((s) => ({ ...s, city: e.target.value }))}
                  />
                </div>
                
                <textarea
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 resize-none h-24"
                  placeholder="Hobiler (virgülle ayır)"
                  value={memberProfile.hobbies}
                  onChange={(e) => setMemberProfile((s) => ({ ...s, hobbies: e.target.value }))}
                />

                <select 
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 text-slate-600"
                  value={memberProfile.status_emoji} 
                  onChange={(e) => setMemberProfile((s) => ({ ...s, status_emoji: e.target.value }))}
                >
                  <option value="🙂">🙂 Normal</option>
                  <option value="☕">☕ Kahve içiyor</option>
                  <option value="💃">💃 Dans ediyor</option>
                  <option value="🎧">🎧 Müzik dinliyor</option>
                  <option value="🌙">🌙 Dinleniyor</option>
                </select>

                <button 
                  onClick={saveOwnProfile}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-100"
                >
                  Profili Güncelle
                </button>
              </div>
            </div>
          </aside>
        </main>
      )}

      {status && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right duration-500">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl border border-white/10 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <p className="text-sm font-bold">{status}</p>
            <button onClick={() => setStatus('')} className="ml-2 hover:text-indigo-400">✕</button>
          </div>
        </div>
      )}
=======
        <main className="dashboard user-grid user-dashboard user-chat-layout compact-shell">
          <aside className="card">
            <h3>Sohbetler</h3>
            <div className="profile-list" ref={profileListRef}>
              {sortedProfiles.map((profile) => (
                <button key={profile.id} onClick={() => setSelectedProfileId(profile.id)} className={`profile-item ${selectedProfileId === profile.id ? 'active' : ''} ${unreadByProfile[profile.id] > 0 ? 'has-unread' : ''}`}>
                  <span className={`avatar-wrap ${unreadByProfile[profile.id] > 0 ? 'ringing' : ''}`}>
                    {profile.photo_url ? <img src={profile.photo_url} alt={profile.name} className="avatar" /> : <span className="avatar-fallback">{profile.name?.slice(0,1)}</span>}
                  </span>
                  <span className="profile-main">
                    <strong>{profile.name}</strong>
                    <small>{profile.city || 'Türkiye'}</small>
                  </span>
                  <span className={`online-dot ${displayOnlineProfiles[profile.id] ? 'on' : ''}`} />
                  {unreadByProfile[profile.id] > 0 && <small>Yeni ({unreadByProfile[profile.id]})</small>}
                </button>
              ))}
            </div>
            {selectedProfile && (
              <div className="meta">
                {selectedProfile.photo_url && <img src={selectedProfile.photo_url} alt={selectedProfile.name} className="profile-photo" />}
                <p><strong>Yaş:</strong> {selectedProfile.age}</p>
                <p><strong>Cinsiyet:</strong> {selectedProfile.gender}</p>
                <p><strong>Şehir:</strong> {selectedProfile.city || '-'}</p>
                <p><strong>Hobiler:</strong> {selectedProfile.hobbies || '-'}</p>
                <p><strong>Ortak ilgi skoru:</strong> %{interestScore}</p>
              </div>
            )}
          </aside>
          <section className="card">
            <h3>Sohbet</h3>
            <div className="chat-box" ref={chatBoxRef}>
              {messages.map((msg) => {
                const audioUrl = getAudioUrl(msg.content);
                return (
                  <div key={msg.id} className={`msg ${msg.sender_role}`}>
                    <span>{msg.sender_role === 'member' ? 'Sen' : selectedProfile?.name}</span>
                    {audioUrl ? <audio controls src={audioUrl} className="audio-player" /> : <p>{msg.content}</p>}
                    <small>
                      {formatTime(msg.created_at)}
                      {msg.sender_role === 'member' ? <span className={`ticks ${msg.seen_by_admin ? 'seen' : ''}`} title={msg.seen_by_admin_at ? `Görüldü: ${formatTime(msg.seen_by_admin_at)}` : `Teslim: ${formatTime(msg.created_at)}`}>✓✓</span> : ''}
                    </small>
                  </div>
                );
              })}
            </div>
            {typingLabel && <div className="typing-indicator">{typingLabel}</div>}
            <div className="row">
              <textarea
                className="grow-textarea"
                placeholder="Mesaj yaz"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  autoResizeTextarea(e.target, 220);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <button onClick={sendMessage}>Gönder</button>
            </div>
          </section>
          <section className="card">
            <h3>Kendi Profilin {memberProfile.status_emoji}</h3>
            {memberProfile.photo_url && <img src={memberProfile.photo_url} alt="profil" className="profile-photo" />}
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await uploadImage(file, 'members');
                if (url) setMemberProfile((s) => ({ ...s, photo_url: url }));
              }}
            />
            <input
              placeholder="Yaş"
              type="number"
              value={memberProfile.age}
              onChange={(e) => setMemberProfile((s) => ({ ...s, age: e.target.value }))}
            />
            <input
              placeholder="Şehir"
              value={memberProfile.city}
              onChange={(e) => setMemberProfile((s) => ({ ...s, city: e.target.value }))}
            />
            <textarea
              placeholder="Hobiler"
              value={memberProfile.hobbies}
              onChange={(e) => setMemberProfile((s) => ({ ...s, hobbies: e.target.value }))}
            />
            <select value={memberProfile.status_emoji} onChange={(e) => setMemberProfile((s) => ({ ...s, status_emoji: e.target.value }))}>
              <option value="🙂">🙂 Normal</option>
              <option value="☕">☕ Kahve içiyor</option>
              <option value="💃">💃 Dans ediyor</option>
              <option value="🎧">🎧 Müzik dinliyor</option>
              <option value="🌙">🌙 Dinleniyor</option>
            </select>
            <button onClick={saveOwnProfile}>Profili Kaydet</button>
          </section>
        </main>
      )}

      {status && <p className="status">{status}</p>}
>>>>>>> 461019a74df50a7e7e99e887b36546377ed561e5
    </div>
  );
}
