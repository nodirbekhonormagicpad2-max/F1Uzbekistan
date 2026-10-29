/* F1 QUIZ PRO — Firebase umumiy reytingi. Anonymous Authentication yoqilgan bo‘lishi kerak. */
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getDatabase, ref, query, orderByChild, limitToLast, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js';

const config = {
  apiKey:'AIzaSyC14M6bg7n4WVn8fcBVleBHGC8yWpwrtw8',
  authDomain:'f1-uzbekistan.firebaseapp.com',
  databaseURL:'https://f1-uzbekistan-default-rtdb.europe-west1.firebasedatabase.app',
  projectId:'f1-uzbekistan',
  storageBucket:'f1-uzbekistan.firebasestorage.app',
  messagingSenderId:'234814349924',
  appId:'1:234814349924:web:66c7affa25a58fd335b571'
};
const app = getApps().length ? getApp() : initializeApp(config);
const auth = getAuth(app), db = getDatabase(app);
const $ = id => document.getElementById(id);
const levels = ['easy','medium','hard'];
const cache = {easy:[],medium:[],hard:[]};
let activeLevel = 'easy', expanded = false;
let userReady;
const ready = new Promise((resolve,reject) => { userReady = {resolve,reject}; });
let subscriptions = [];
const rank = score => score === 150 ? '👑 WORLD CHAMPION' : score >= 120 ? '🏆 LEGEND' : score >= 90 ? '🥇 EXPERT' : score >= 50 ? '🏎️ RACER' : '🏁 ROOKIE';

function render(){
  const all = cache[activeLevel];
  const shown = expanded ? all : all.slice(0,10);
  const list = $('leaderboardList');
  const fragment = document.createDocumentFragment();
  if (!shown.length) {
    const p = document.createElement('p'); p.className = 'leaderboard-empty';
    p.textContent = 'Hozircha natija yo‘q. Birinchi bo‘lib o‘ynang!'; fragment.append(p);
  }
  shown.forEach((player,i) => {
    const row = document.createElement('div');
    row.className = 'leaderboard-item' + (i < 3 ? ' podium' : '');
    const pos = document.createElement('div'); pos.className = 'leaderboard-position';
    pos.textContent = ['🥇','🥈','🥉'][i] || String(i+1);
    const info = document.createElement('div');
    const name = document.createElement('div'); name.className = 'leaderboard-name'; name.textContent = player.name;
    const label = document.createElement('small'); label.className = 'leaderboard-rank'; label.textContent = rank(player.score);
    info.append(name,label);
    const score = document.createElement('div'); score.className = 'leaderboard-points'; score.textContent = player.score;
    row.append(pos,info,score); fragment.append(row);
  });
  list.replaceChildren(fragment);
  const more = $('leaderboardMore');
  more.classList.toggle('hidden',all.length <= 10);
  more.textContent = expanded ? '↑ TOP 10 GA QAYTISH' : '🏆 TOP 100 NI KO‘RISH ↓';
  more.setAttribute('aria-expanded',String(expanded));
}
function showLevel(level){
  if (!levels.includes(level)) return;
  activeLevel = level; expanded = false;
  document.querySelectorAll('[data-board]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.board === level)));
  render();
}
async function save({name,score,level}){
  if (!levels.includes(level) || !Number.isInteger(score) || score < 0 || score > 150 || score % 10 !== 0) throw Error('Noto‘g‘ri natija');
  const clean = String(name).trim().replace(/\s+/g,' ');
  if (clean.length < 2 || clean.length > 24 || /[<>\u0000-\u001f]/.test(clean)) throw Error('Noto‘g‘ri ism');
  const user = await ready;
  const playerRef = ref(db,`quizLeaderboard/${level}/${user.uid}`);
  const result = await runTransaction(playerRef,old => {
    if (old && typeof old.score === 'number' && old.score >= score) return;
    return {name:clean,score,achievedAt:Date.now()};
  },{applyLocally:false});
  return result.committed ? '✅ Natijangiz umumiy reytingga saqlandi!' : 'ℹ️ Sizning avvalgi eng yuqori natijangiz saqlanib qoldi.';
}
window.F1QuizLeaderboard = {save,showLevel};
$('leaderboardMore').addEventListener('click',() => {expanded = !expanded; render();});
document.querySelectorAll('[data-board]').forEach(button => button.addEventListener('click',() => showLevel(button.dataset.board)));

onAuthStateChanged(auth, user => {
  if (!user) return;
  userReady.resolve(user);
  if (subscriptions.length) return;
  for (const level of levels) {
    const q = query(ref(db,`quizLeaderboard/${level}`),orderByChild('score'),limitToLast(100));
    const unsubscribe = onValue(q,snapshot => {
      const items = [];
      snapshot.forEach(child => {
        const value = child.val();
        if (value && typeof value.name === 'string' && Number.isInteger(value.score)) items.push(value);
      });
      items.sort((a,b) => b.score-a.score || (a.achievedAt||0)-(b.achievedAt||0) || a.name.localeCompare(b.name));
      cache[level] = items;
      if (activeLevel === level) render();
      $('leaderboardStatus').textContent = '';
    },error => {
      console.error('Reytingni o‘qish xatosi:',error);
      $('leaderboardStatus').textContent = '⚠️ Reyting yuklanmadi. Firebase Database Rules ni tekshiring.';
    });
    subscriptions.push(unsubscribe);
  }
},error => {
  console.error('Firebase kirish xatosi:',error);
  $('leaderboardStatus').textContent = '⚠️ Firebase Authentication → Anonymous ni yoqing.';
  userReady.reject(error);
});
signInAnonymously(auth).catch(error => {
  console.error('Anonim kirish amalga oshmadi:',error);
  $('leaderboardStatus').textContent = '⚠️ Firebase Authentication → Anonymous ni yoqing.';
  userReady.reject(error);
});
