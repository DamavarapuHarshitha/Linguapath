import React, { useEffect, useState } from 'react'
import VoiceTutor from './VoiceTutor'
import axios from 'axios'
import { BookOpen, CheckCircle2, ChevronRight, CircleHelp, Flame, Globe2, GraduationCap, Headphones, LogOut, Menu, Mic, ShieldCheck, Sparkles, Trophy, User, X } from 'lucide-react'

const API = 'http://127.0.0.1:8000/api'
const api = axios.create({baseURL:API})
api.interceptors.request.use(config => {
  const token = localStorage.getItem('linguapath_token')
  if(token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function Auth({onAuth}) {
  const [mode,setMode]=useState('login'), [name,setName]=useState(''), [email,setEmail]=useState(''), [password,setPassword]=useState(''), [error,setError]=useState(''), [busy,setBusy]=useState(false)
  async function submit(e){
    e.preventDefault(); setError(''); setBusy(true)
    try{
      const {data}=await api.post(mode==='login'?'/login':'/register',mode==='login'?{email,password}:{name,email,password})
      localStorage.setItem('linguapath_token',data.token); onAuth(data.user)
    }catch(err){setError(err.response?.data?.detail || 'Unable to connect. Is the backend running?')}
    finally{setBusy(false)}
  }
  return <div className="auth-shell">
    <div className="auth-art"><div className="brand light"><span className="brand-mark">L</span> linguapath</div><div className="art-copy"><span className="eyebrow">A LITTLE PRACTICE, EVERY DAY</span><h1>Make room for<br/><em>a new language.</em></h1><p>Short lessons. Real progress. Learn French and Japanese at your own pace.</p><div className="art-orbs"><span>Bonjour!</span><span>こんにちは</span><span>ありがとう</span></div></div><div className="art-footer">YOUR NEXT CHAPTER STARTS HERE</div></div>
    <div className="auth-panel"><div className="auth-mobile brand"><span className="brand-mark">L</span> linguapath</div><div className="auth-card"><span className="eyebrow">{mode==='login'?'WELCOME BACK':'GET STARTED'}</span><h2>{mode==='login'?'Sign in to learn':'Create your account'}</h2><p className="muted">{mode==='login'?'Your next lesson is waiting for you.':'Start your French or Japanese learning journey.'}</p>
      <form onSubmit={submit}>
        {mode==='register'&&<label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Alex" required minLength="2"/></label>}
        <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" required minLength="6"/></label>
        {error&&<div className="error">{error}</div>}
        <button className="primary full" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'} <ChevronRight size={18}/></button>
      </form>
      <p className="switch-auth">{mode==='login'?"New to LinguaPath?":"Already have an account?"} <button onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?'Create an account':'Sign in'}</button></p>
      <div className="secure-note"><ShieldCheck size={15}/> Your learning progress is saved locally.</div>
    </div></div>
  </div>
}

function App(){
  const [user,setUser]=useState(null), [courses,setCourses]=useState([]), [progress,setProgress]=useState({completed_count:0,total_lessons:0}), [selected,setSelected]=useState(null), [lesson,setLesson]=useState(null), [index,setIndex]=useState(0), [answer,setAnswer]=useState(''), [checked,setChecked]=useState(false), [correct,setCorrect]=useState(false), [view,setView]=useState('home'), [loading,setLoading]=useState(true), [error,setError]=useState('')
  async function load(){
    try{const [c,p,m]=await Promise.all([api.get('/courses'),api.get('/progress'),api.get('/me')]);setCourses(c.data);setProgress(p.data);setUser(m.data.user)}
    catch(e){localStorage.removeItem('linguapath_token');setUser(null)}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(localStorage.getItem('linguapath_token'))load();else setLoading(false)},[])
  async function refresh(){const [c,p]=await Promise.all([api.get('/courses'),api.get('/progress')]);setCourses(c.data);setProgress(p.data)}
  function logout(){localStorage.removeItem('linguapath_token');setUser(null);setSelected(null);setLesson(null);setView('home')}
  async function openLesson(id){try{const {data}=await api.get(`/lessons/${id}`);setLesson(data);setIndex(0);setAnswer('');setChecked(false);setCorrect(false);setView('lesson')}catch(e){setError('Could not open this lesson.')}}
  const task=lesson?.tasks[index]
  function checkAnswer(){if(!answer)return;setCorrect(answer===task.answer);setChecked(true)}
  function nextTask(){if(index<lesson.tasks.length-1){setIndex(index+1);setAnswer('');setChecked(false);setCorrect(false)}else finishLesson()}
  async function finishLesson(){try{await api.post('/progress/complete',{lesson_id:lesson.id});await refresh();setLesson(null);setView('complete')}catch(e){setError('Could not save lesson progress.')}}
  if(loading)return <div className="loading">Loading your learning space…</div>
  if(!user)return <Auth onAuth={u=>{setUser(u);load()}}/>
  const activeCourse=courses.find(c=>c.id===selected)
  const completedPct=progress.total_lessons?Math.round(progress.completed_count/progress.total_lessons*100):0
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">L</span> linguapath</div><div className="side-label">YOUR LEARNING</div><button className={`nav-item ${view==='home'||view==='course'||view==='lesson'||view==='complete'?'active':''}`} onClick={()=>{setView('home');setLesson(null);setSelected(null)}}><BookOpen size={18}/> My courses</button><button className={`nav-item ${view==='voice'?'active':''}`} onClick={()=>{setView('voice');setLesson(null);setSelected(null)}}><Mic size={18}/> AI voice tutor</button><div className="side-bottom"><div className="mini-profile"><div className="avatar">{user.name[0]?.toUpperCase()}</div><div><b>{user.name}</b><small>Learner</small></div></div><button className="nav-item logout" onClick={logout}><LogOut size={18}/> Sign out</button></div></aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">YOUR LANGUAGE JOURNEY</span><h1>{view==='lesson'?lesson?.title:view==='complete'?'Wonderful work!':activeCourse?`${activeCourse.name} course`:'Welcome back'}</h1></div><div className="top-user"><div className="progress-pill"><CheckCircle2 size={16}/>{progress.completed_count} lessons completed</div><div className="avatar">{user.name[0]?.toUpperCase()}</div></div></header>
      {error&&<div className="error banner">{error}<button onClick={()=>setError('')}><X size={16}/></button></div>}
      {view==='voice'&&<VoiceTutor api={api} onBack={()=>{setView('home');setSelected(null)}}/>}
      {view==='home'&&!selected&&<><section className="welcome-card"><div><span className="eyebrow">SMALL STEPS ADD UP</span><h2>Where will curiosity<br/>take you today?</h2><p>Choose a language and start with a short lesson. No points, no pressure — just learning.</p><div className="welcome-stats"><span><CheckCircle2 size={16}/>{progress.completed_count} lessons completed</span><span><Globe2 size={16}/>2 languages available</span></div></div><div className="welcome-illustration"><div className="sun"></div><div className="book-stack">Aa</div><div className="floating f1">Bonjour</div><div className="floating f2">こんにちは</div></div></section>
        <div className="section-heading"><div><span className="eyebrow">PICK YOUR PATH</span><h2>Explore languages</h2></div><span className="muted">Choose one to continue</span></div>
        <div className="course-grid">{courses.map(c=><button className="course-card" key={c.id} onClick={()=>{setSelected(c.id);setView('course')}}><div className={`course-flag ${c.id}`}>{c.flag}</div><div className="course-meta"><span>{c.id==='fr'?'ROMANCE LANGUAGE':'EAST ASIAN LANGUAGE'}</span><span className="course-arrow"><ChevronRight size={18}/></span></div><h3>{c.name}</h3><div className="native">{c.native}</div><p>{c.description}</p><div className="course-bottom"><span><BookOpen size={15}/>{c.units.reduce((n,u)=>n+u.lessons.length,0)} lessons</span><span>Start learning <ChevronRight size={15}/></span></div></button>)}</div>
        <section className="progress-card"><div className="progress-icon"><GraduationCap size={22}/></div><div className="progress-copy"><span className="eyebrow">YOUR OVERALL PROGRESS</span><h3>Keep building your skills</h3><p>{progress.completed_count} of {progress.total_lessons} lessons completed across both courses.</p><div className="progress-track"><span style={{width:`${completedPct}%`}}/></div></div><strong>{completedPct}%</strong></section>
      </>}
      {view==='course'&&activeCourse&&<><button className="back-link" onClick={()=>{setSelected(null);setView('home')}}>← All languages</button><section className={`course-hero ${activeCourse.id}`}><div className="hero-flag">{activeCourse.flag}</div><div><span className="eyebrow">YOUR COURSE</span><h2>{activeCourse.name} <small>{activeCourse.native}</small></h2><p>{activeCourse.description}</p><p className="muted">{activeCourse.units.reduce((n,u)=>n+u.lessons.length,0)} lessons · {activeCourse.levels} levels</p></div></section><div className="section-heading"><div><span className="eyebrow">LEARNING PATH</span><h2>Your lessons</h2></div><span className="muted">{activeCourse.levels} learning levels · {activeCourse.units.length} units</span></div>
        {activeCourse.units.map((unit,i)=><section className="unit-card" key={unit.id}><div className="unit-head"><div className="unit-number">0{i+1}</div><div><span className="eyebrow">UNIT {i+1} · {unit.level} — {unit.level_name}</span><h3>{unit.title}</h3><p>{unit.description}</p></div></div><div className="lesson-list">{unit.lessons.map((l,j)=><div className="lesson-row" key={l.id}><div className={`lesson-symbol ${l.completed?'done':''}`}>{l.completed?<CheckCircle2 size={20}/>:<BookOpen size={20}/>}</div><div className="lesson-info"><b>{l.title}</b><small>{l.task_count} activities · {l.completed?'Completed':'Ready to start'}</small></div><button className={l.completed?'secondary':'primary'} onClick={()=>openLesson(l.id)}>{l.completed?'Review':'Start lesson'} <ChevronRight size={16}/></button></div>)}</div></section>)}</>}
      {view==='lesson'&&lesson&&task&&<div className="lesson-work"><div className="lesson-progress-top"><button className="back-link" onClick={()=>{setLesson(null);setView('course')}}>✕ Exit lesson</button><div className="step-count">QUESTION {index+1} OF {lesson.tasks.length}</div></div><div className="step-track"><span style={{width:`${((index+(checked?1:0))/lesson.tasks.length)*100}%`}}/></div><div className="question-card"><div className="question-icon"><Sparkles size={24}/></div><span className="eyebrow">{task.type==='choice'?'CHOOSE THE CORRECT ANSWER':task.type==='translate'?'TRANSLATION PRACTICE':'COMPLETE THE PHRASE'}</span><h2>{task.prompt}</h2><div className="answer-options">{task.options.map(opt=><button key={opt} disabled={checked} className={`answer-option ${answer===opt?'chosen':''} ${checked&&opt===task.answer?'is-correct':''} ${checked&&answer===opt&&!correct?'is-wrong':''}`} onClick={()=>setAnswer(opt)}><span className="option-radio">{answer===opt?'●':'○'}</span>{opt}</button>)}</div>{checked&&<div className={`feedback ${correct?'good':'bad'}`}><b>{correct?'Correct! Nicely done.':'Not quite — keep learning!'}</b><p>{correct?'You got it right.':`Correct answer: ${task.answer}.`} {task.hint}</p></div>}<div className="question-actions">{!checked?<button className="primary" disabled={!answer} onClick={checkAnswer}>Check answer <ChevronRight size={18}/></button>:<button className="primary" onClick={nextTask}>{index===lesson.tasks.length-1?'Complete lesson':'Continue'} <ChevronRight size={18}/></button>}</div></div><div className="lesson-note"><ShieldCheck size={16}/> Your progress is saved when you complete the lesson.</div></div>}
      {view==='complete'&&<div className="completion"><div className="completion-icon"><CheckCircle2 size={48}/></div><span className="eyebrow">LESSON FINISHED</span><h2>One more step forward.</h2><p>You completed every activity in this lesson. Your progress has been saved.</p><button className="primary" onClick={()=>{setView('course')}}>Back to course <ChevronRight size={18}/></button><button className="text-button" onClick={()=>{setSelected(null);setView('home')}}>Explore other languages</button></div>}
    </main>
  </div>
}
export default App
