import {ref, onValue, set} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import {onAuthStateChanged, signInAnonymously} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';

export function createCommunityRatings(db, auth) {
  const core = window.CommunityRatingCore, listeners = new Set();
  let stops = [], generation = 0, started = false;
  let state = {uid:null, canVote:false, connected:false, ballots:{techniques:{},skills:{},specialTechniques:{}}, loaded:{techniques:false,skills:false,specialTechniques:false}, errors:{}};
  const emit = () => { for (const listener of listeners) listener(state); };
  const fail = (category, message) => { state = {...state, errors:{...state.errors,[category]:message}}; emit(); };
  async function connect() {
    const epoch = ++generation;
    for (const stop of stops) stop();
    stops = [];
    await auth.authStateReady();
    if (epoch !== generation || !started) return;
    if (!auth.currentUser) {
      try { await signInAnonymously(auth); }
      catch { if (epoch === generation) for (const category of Object.keys(core.categories)) fail(category, '評価を読み込めません。時間をおいて再試行してください。'); }
      return;
    }
    stops.push(onValue(ref(db, '.info/connected'), snapshot => {
      if (epoch !== generation) return;
      state = {...state, connected:snapshot.val() === true}; emit();
    }));
    for (const category of Object.keys(core.categories)) {
      stops.push(onValue(ref(db, 'communityRatings/' + category), snapshot => {
        if (epoch !== generation) return;
        state = {...state, ballots:{...state.ballots,[category]:snapshot.val() || {}}, loaded:{...state.loaded,[category]:true}, errors:{...state.errors,[category]:''}};
        emit();
      }, () => { if (epoch === generation) fail(category, '評価を読み込めません。時間をおいて再試行してください。'); }));
    }
  }
  onAuthStateChanged(auth, user => {
    state = {...state, uid:user?.uid || null, canVote:!!user && !user.isAnonymous, connected:false, loaded:{techniques:false,skills:false,specialTechniques:false}, ballots:{techniques:{},skills:{},specialTechniques:{}}, errors:{}};
    emit();
    if (started) connect();
  });
  return Object.freeze({
    watch(listener) {
      listeners.add(listener); listener(state);
      if (!started) { started = true; connect(); }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { started = false; generation++; for (const stop of stops) stop(); stops = []; }
      };
    },
    retry:connect,
    async save(category, values) {
      const user = auth.currentUser;
      if (!user || user.isAnonymous) throw Error('アカウントでログインしてください。');
      if (!state.loaded[category] || !state.connected) throw Error('通信を確認してから、もう一度保存してください。');
      const votes = core.ballot(category, values);
      // Replacing the UID's ballot updates its existing vote, never appends one.
      let timer;
      try {
        await Promise.race([
          set(ref(db, 'communityRatings/' + category + '/' + user.uid), votes),
          new Promise((_, reject) => { timer = setTimeout(() => reject(Error('保存結果を確認できません。接続後に投票画面を開き直して確認してください。')), 12000); })
        ]);
      } finally { clearTimeout(timer); }
    }
  });
}
