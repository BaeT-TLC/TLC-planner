import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,connectAuthEmulator,signInWithCredential} from 'firebase/auth';
import {getFirestore,doc,collection,getDoc,getDocs,setDoc,updateDoc,onSnapshot,runTransaction,connectFirestoreEmulator} from 'firebase/firestore';
import {dateKey,weekDates,splitSession,formatDuration} from './time.js';
const productionConfig={apiKey:"AIzaSyC0RC30vLXQEweevK7WRfn0kvhLHmvZ0aA",authDomain:"baet-tlc.firebaseapp.com",projectId:"baet-tlc",appId:"1:100281045075:web:29bf34bac8b1f082b2f6a6"};
const app=initializeApp(__EMULATOR_TEST__ ? {apiKey:"demo-key",authDomain:"localhost",projectId:"demo-tlc-planner"} : productionConfig);
const auth=getAuth(app),db=getFirestore(app),COACH='nktre1715@gmail.com';
if (__EMULATOR_TEST__) {
 if(location.hostname!=='localhost')throw Error('에뮬레이터 빌드는 localhost 전용입니다.');
 connectAuthEmulator(auth,'http://localhost:9099',{disableWarnings:true});
 connectFirestoreEmulator(db,'localhost',8080);
 window.__tlcTest={
  async login(email){
   const idToken=JSON.stringify({sub:email,email,email_verified:true});
   await signInWithCredential(auth,GoogleAuthProvider.credential(idToken));
  },
  async readDay(email,key){return (await getDoc(doc(db,'plannerStudents',email,'days',key))).data()}
 };
}
const $=id=>document.getElementById(id);
let user=null,isCoach=false,selected='',weekOffset=0,days={},sessions=[],profile={},unsubs=[],rosterUnsub=null,epoch=0,dayKey='',dayVersion=0;
const message=(text)=>{$('status').textContent=text};
const fail=e=>message('오류 ['+(e.code||e.name)+']: '+e.message);
const studentRef=()=>doc(db,'plannerStudents',selected);
const entryRef=(group,id)=>doc(db,'plannerStudents',selected,group,id);
function clearSelection(){epoch++;unsubs.forEach(f=>f());unsubs=[];selected='';days={};sessions=[];profile={};$('daily').close();$('tasks').replaceChildren();for(const id of ['summary','questions','review','reflection','feedback','subject'])$(id).value='';$('week').replaceChildren();$('stats').replaceChildren();$('elapsed').textContent='00:00:00';dayKey='';dayVersion=0;$('workspace').hidden=true;document.body.removeAttribute('data-skin');}
async function action(fn){try{await fn()}catch(e){fail(e)}}
$('login').onclick=()=>action(()=>signInWithPopup(auth,new GoogleAuthProvider()));
$('logout').onclick=()=>action(()=>signOut(auth));
onAuthStateChanged(auth,async u=>{
 rosterUnsub?.();rosterUnsub=null;clearSelection();user=u;
 $('login').hidden=!!u;$('logout').hidden=!u;
 if(!u){message('로그인 후 등록된 학생만 이용할 수 있습니다.');return}
 isCoach=u.emailVerified&&u.email?.toLowerCase()===COACH;
 $('coach').hidden=!isCoach;
 try{
 if(isCoach){
 $('workspace').hidden=false;message('코치 계정 · 학생을 등록하거나 선택하세요.');
 rosterUnsub=onSnapshot(collection(db,'plannerStudents'),snap=>{
 const old=selected;$('students').replaceChildren(new Option('학생 선택',''));
 snap.docs.forEach(d=>$('students').add(new Option(d.id+(d.data().active?'':' (접근 해제)'),d.id)));
 if(snap.docs.some(d=>d.id===old)){$('students').value=old}else if(old){clearSelection();$('workspace').hidden=false}
 },fail);
 }else{
 const email=u.email?.toLowerCase();if(!email||!u.emailVerified)throw Error('이메일 인증된 Google 계정이 필요합니다.');
 const s=await getDoc(doc(db,'plannerStudents',email));
 if(auth.currentUser?.uid!==u.uid)return;
 if(!s.exists()||!s.data().active){message('코치가 등록한 활성 학생 계정만 접근할 수 있습니다.');return}
 selectStudent(email);
 }
 }catch(e){fail(e)}
});
function selectStudent(email){
 clearSelection();selected=email;const token=epoch;$('workspace').hidden=false;
 $('student-title').textContent=isCoach?email+' · 주간 계획':'나의 주간 계획';
 for(const group of ['days','sessions']){
 unsubs.push(onSnapshot(collection(db,'plannerStudents',email,group),snap=>{
 if(token!==epoch)return;
 if(group==='days'){days=Object.fromEntries(snap.docs.map(d=>[d.id,d.data()]));renderWeek()}
 else{sessions=snap.docs.map(d=>d.data());renderStats()}
 },fail));
 }
 unsubs.push(onSnapshot(doc(db,'plannerStudents',email),snap=>{
 if(token!==epoch)return;
 if(!snap.exists()||(!isCoach&&!snap.data().active)){clearSelection();message('학생 접근이 해제되었습니다.');return}
 profile=snap.data();$('skin').value=profile.skin;document.body.dataset.skin=profile.skin;renderTimer();
 },fail));
 message(isCoach?'학생 계획과 피드백을 수정할 수 있습니다.':'내 계획과 기록만 표시됩니다.');renderWeek();
}
$('students').onchange=()=>{if($('students').value)selectStudent($('students').value)};
$('register').onsubmit=e=>{e.preventDefault();action(async()=>{
 const email=$('email').value.trim().toLowerCase();if(!/^[^/@\s]+@[^/@\s]+\.[^/@\s]+$/.test(email))throw Error('올바른 이메일을 입력하세요.');
 if(email===COACH)throw Error('코치 계정은 학생으로 등록할 수 없습니다.');
 const ref=doc(db,'plannerStudents',email);const s=await getDoc(ref);
 if(s.exists())await updateDoc(ref,{active:true});else await setDoc(ref,{email,active:true,skin:'forest',timer:null});
 $('email').value='';message('학생을 등록했습니다: '+email);
 })};
$('revoke').onclick=()=>action(async()=>{if(!selected)throw Error('학생을 선택하세요.');await updateDoc(studentRef(),{active:false});message('학생 접근을 해제했습니다. 기존 기록은 보존됩니다.')});
$('skin').onchange=()=>action(async()=>{if(!selected)return;await updateDoc(studentRef(),{skin:$('skin').value})});
$('prev').onclick=()=>{weekOffset--;renderWeek()};$('next').onclick=()=>{weekOffset++;renderWeek()};
function renderWeek(){
 const dates=weekDates(Date.now(),weekOffset);$('week-label').textContent=dates[0]+' ~ '+dates[6];$('week').replaceChildren();
 for(const key of dates){const data=days[key]||{},tasks=data.tasks||[],b=document.createElement('button');b.dataset.date=key;b.className='day'+(key===dateKey(Date.now())?' today':'');
 const strong=document.createElement('strong');strong.textContent=key.slice(5)+' '+['일','월','화','수','목','금','토'][new Date(key+'T12:00:00+09:00').getUTCDay()];
 const count=document.createElement('span');count.textContent=tasks.filter(t=>t.done).length+'/'+tasks.length+' 완료';
 const hint=document.createElement('span');hint.textContent=tasks[0]?.text||'데일리 플랜 열기';b.append(strong,count,hint);b.onclick=()=>openDay(key);$('week').append(b)}
 renderStats();
}
function addTask(task={text:'',done:false}){
 if($('tasks').children.length>=10){$('day-status').textContent='할 일은 하루 최대 10개입니다.';return}
 const row=document.createElement('div');row.className='task';
 const check=document.createElement('input');check.type='checkbox';check.checked=task.done;check.setAttribute('aria-label','할 일 완료');
 const input=document.createElement('input');input.type='text';input.maxLength=300;input.value=task.text;input.required=true;input.setAttribute('aria-label','할 일');
 const del=document.createElement('button');del.type='button';del.textContent='삭제';del.onclick=()=>row.remove();row.append(check,input,del);$('tasks').append(row);
}
function openDay(key){
 if(!selected)return;dayKey=key;const data=days[key]||{};dayVersion=data.version||0;
 $('day-title').textContent=key+' 데일리 플랜';$('day-status').textContent='';$('tasks').replaceChildren();(data.tasks||[]).forEach(addTask);
 for(const k of ['summary','questions','review','reflection','feedback'])$(k).value=data[k]||'';
 $('feedback').readOnly=!isCoach;$('daily').showModal();
}
$('close').onclick=()=>$('daily').close();$('add-task').onclick=()=>addTask();
$('daily-form').onsubmit=e=>{e.preventDefault();action(async()=>{
 const token=epoch,ref=entryRef('days',dayKey),tasks=Array.from($('tasks').children,row=>({text:row.querySelector('input[type=text]').value.trim(),done:row.querySelector('input[type=checkbox]').checked}));
 const data={tasks};for(const k of ['summary','questions','review','reflection'])data[k]=$(k).value;
 const feedback=$('feedback').value,expected=dayVersion;
 $('save-day').disabled=true;
 try{await runTransaction(db,async tx=>{
 const snap=await tx.get(ref),old=snap.data()||{};if((old.version||0)!==expected)throw Error('다른 창에서 수정했습니다. 내용을 복사한 뒤 닫고 다시 열어 주세요.');
 tx.set(ref,{...data,feedback:isCoach?feedback:(old.feedback||''),version:expected+1});
 });if(token===epoch){dayVersion=expected+1;$('day-status').textContent='저장했습니다.'}}
 finally{$('save-day').disabled=false}
 })};
$('start').onclick=()=>action(async()=>{
 if(!selected)throw Error('학생을 선택하세요.');const subject=$('subject').value.trim();if(!subject)throw Error('과목을 입력하세요.');
 await runTransaction(db,async tx=>{const ref=studentRef(),s=await tx.get(ref);if(s.data().timer)throw Error('진행 중인 타이머를 먼저 종료하세요.');tx.update(ref,{timer:{subject,start:Date.now()}})});
});
$('stop').onclick=()=>action(async()=>{
 if(!selected)return;const ref=studentRef(),session=doc(collection(db,'plannerStudents',selected,'sessions'));$('stop').disabled=true;
 try{await runTransaction(db,async tx=>{const s=await tx.get(ref),timer=s.data().timer;if(!timer)throw Error('진행 중인 타이머가 없습니다.');
 const end=Date.now();if(end<timer.start)throw Error('기기 시각을 확인하세요.');
 tx.set(session,{subject:timer.subject,start:timer.start,end});tx.update(ref,{timer:null});
 })}finally{renderTimer()}
});
function renderTimer(){
 const timer=profile.timer;$('start').disabled=!selected||!!timer;$('stop').disabled=!selected||!timer;$('subject').disabled=!!timer;
 if(timer)$('subject').value=timer.subject;
 $('elapsed').textContent=formatDuration(timer?Math.max(0,Date.now()-timer.start):0);
}
setInterval(renderTimer,1000);
function renderStats(){
 const today=dateKey(Date.now()),dates=weekDates(Date.now(),weekOffset),totals=Object.create(null);
 for(const s of sessions)for(const part of splitSession(s.start,s.end)){
 if(!totals[s.subject])totals[s.subject]={day:0,week:0};
 if(part.date===today)totals[s.subject].day+=part.ms;if(dates.includes(part.date))totals[s.subject].week+=part.ms;
 }
 $('stats').replaceChildren();const p=document.createElement('p');p.textContent='오늘 ('+today+') / 선택한 주 · 종료 후 저장된 시간 기준';$('stats').append(p);
 const table=document.createElement('table');const head=document.createElement('tr');
 for(const t of ['과목','오늘','선택 주']){const th=document.createElement('th');th.textContent=t;head.append(th)}table.append(head);
 for(const [subject,v] of Object.entries(totals)){if(!v.day&&!v.week)continue;const row=document.createElement('tr');for(const v2 of [subject,formatDuration(v.day),formatDuration(v.week)]){const td=document.createElement('td');td.textContent=v2;row.append(td)}table.append(row)}
 $('stats').append(table);
}
