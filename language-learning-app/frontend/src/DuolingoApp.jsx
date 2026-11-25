import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { BookOpen, Check, ChevronRight, Flame, Heart, Home, LockKeyhole, Mic, Settings, Star, Trophy, Volume2, X, Zap } from 'lucide-react'
import VoiceTutor from './VoiceTutor'

const API = 'http://127.0.0.1:8000/api'
const api = axios.create({ baseURL: API })
api.interceptors.request.use(config => {
  const token = localStorage.getItem('linguapath_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const body = mode === 'login' ? { email, password } : { name, email, password }
      const { data } = await api.post(mode === 'login' ? '/login' : '/register', body)
      localStorage.setItem('linguapath_token', data.token)
      onAuth(data.user)
    } catch (e) { setError(e.response?.data?.detail || 'Unable to connect to LinguaPath.') }
    finally { setBusy(false) }
  }
  return <div className="lp-auth"><section className="lp-auth-hero"><div className="lp-logo light"><span>L</span> LinguaPath</div><div className="lp-auth-copy"><small>YOUR DAILY LANGUAGE JOURNEY</small><h1>Learn a language.<br/><em>Open a world.</em></h1><p>Build real confidence with bite-sized lessons, guided speaking, and a learning path made for every level.</p></div><div className="lp-auth-dots"><span>Bonjour</span><span>こんにちは</span><span>Hola</span></div></section>
    <main className="lp-auth-form"><div className="lp-logo mobile"><span>L</span> LinguaPath</div><div className="lp-form-box"><small>WELCOME TO LINGUAPATH</small><h2>{mode === 'login' ? 'Ready for another lesson?' : 'Start your journey'}</h2><p>{mode === 'login' ? 'Sign in and keep your streak growing.' : 'Create an account to save your progress.'}</p>
      <form onSubmit={submit}>{mode === 'register' && <label>Name<input value={name} onChange={e => setName(e.target.value)} minLength="2" required placeholder="What should we call you?" /></label>}<label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required placeholder="At least 6 characters" /></label>{error && <div className="lp-error">{error}</div>}<button className="lp-primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<ChevronRight size={18}/></button></form>
      <p className="lp-switch">{mode === 'login' ? 'New to LinguaPath?' : 'Already learning?' } <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></p></div></main></div>
}

export default function DuolingoApp() {
  const [user, setUser] = useState(null), [courses, setCourses] = useState([]), [progress, setProgress] = useState({}), [stats, setStats] = useState({ xp: 0, hearts: 5, streak: 0 })
  const [loading, setLoading] = useState(true), [view, setView] = useState('learn'), [selectedCourse, setSelectedCourse] = useState(null)
  const [lesson, setLesson] = useState(null), [taskIndex, setTaskIndex] = useState(0), [answer, setAnswer] = useState(''), [checked, setChecked] = useState(false), [hearts, setHearts] = useState(5)
  const [dailyXp, setDailyXp] = useState(0), [error, setError] = useState('')

  async function load() {
    try {
      const [me, cs, pr] = await Promise.all([api.get('/me'), api.get('/courses'), api.get('/progress')])
      setUser(me.data.user); setCourses(cs.data); setProgress(pr.data)
      try { const { data } = await api.get('/stats'); setStats(data); setHearts(data.hearts) } catch (_) {}
    } catch (_) { localStorage.removeItem('linguapath_token'); setUser(null) }
    finally { setLoading(false) }
  }
  useEffect(() => { const token = localStorage.getItem('linguapath_token'); if (token) load(); else setLoading(false) }, [])

  async function refresh() {
    const [cs, pr] = await Promise.all([api.get('/courses'), api.get('/progress')]); setCourses(cs.data); setProgress(pr.data)
    try { const { data } = await api.get('/stats'); setStats(data); setHearts(data.hearts) } catch (_) {}
  }
  function logout() { localStorage.removeItem('linguapath_token'); setUser(null); setView('learn'); setLesson(null) }
  async function openLesson(id) {
    setError('')
    try { const { data } = await api.get(`/lessons/${id}`); setLesson(data); setTaskIndex(0); setAnswer(''); setChecked(false); setView('lesson') } catch (e) { setError(e.response?.data?.detail || 'Could not open that lesson.') }
  }
  const task = lesson?.tasks?.[taskIndex]
  const isCorrect = answer === task?.answer
  function checkAnswer() { if (!answer || checked) return; setChecked(true); if (!isCorrect) setHearts(h => Math.max(0, h - 1)) }
  async function nextTask() {
    if (!checked) return
    if (taskIndex < lesson.tasks.length - 1) { setTaskIndex(i => i + 1); setAnswer(''); setChecked(false); return }
    const gained = lesson.tasks.length * 10
    try { const { data } = await api.post('/activity/complete', { lesson_id: lesson.id, xp: gained }); setStats({ xp: data.xp, hearts: data.hearts, streak: data.streak }); setDailyXp(v => v + gained) } catch (_) {}
    setLesson(null); setView('complete'); await refresh()
  }

  if (loading) return <div className="lp-loading"><div className="lp-loader">L</div><span>Preparing your language journey…</span></div>
  if (!user) return <Auth onAuth={u => { setUser(u); load() }} />

  const activeCourse = courses.find(c => c.id === selectedCourse)
  const completedPct = progress.total_lessons ? Math.round(progress.completed_count / progress.total_lessons * 100) : 0

  return <div className="lp-app"><aside className="lp-sidebar"><div className="lp-logo"><span>L</span> LinguaPath</div><nav><button className={view === 'learn' ? 'active' : ''} onClick={() => setView('learn')}><Home/>Learn</button><button className={view === 'practice' ? 'active' : ''} onClick={() => setView('practice')}><Zap/>Practice</button><button className={view === 'voice' ? 'active' : ''} onClick={() => setView('voice')}><Mic/>AI Tutor</button><button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}><Trophy/>Profile</button></nav><button className="lp-logout" onClick={logout}>Sign out</button></aside>
    <main className="lp-main"><header className="lp-topbar"><div><small>{view === 'lesson' ? 'LESSON' : 'YOUR JOURNEY'}</small><h1>{view === 'lesson' ? lesson?.title : view === 'voice' ? 'AI conversation' : view === 'practice' ? 'Practice' : view === 'profile' ? 'Your profile' : 'Good to see you'}</h1></div><div className="lp-stats"><span className="streak"><Flame/> {stats.streak || 0}</span><span className="xp"><Zap/> {stats.xp || 0} XP</span><span className="hearts"><Heart/> {hearts}</span></div></header>
      {error && <div className="lp-error banner"><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
      {view === 'learn' && !activeCourse && <><section className="lp-welcome"><div><small>DAILY GOAL · 20 XP</small><h2>Today is a good day<br/>to learn something.</h2><p>Choose a language and continue exactly where you left off.</p><div className="lp-daily"><span><b>{dailyXp || Math.min(stats.xp || 0, 20)}</b> / 20 XP</span><div><i style={{ width: `${Math.min(100, (dailyXp || stats.xp || 0) * 5)}%` }}/></div></div></div><div className="lp-globe"><span>あ</span><i>Bonjour</i><b>Hola</b></div></section>
        <section className="lp-section-title"><div><small>YOUR COURSES</small><h2>Choose a learning path</h2></div><span>{progress.completed_count || 0} completed</span></section><div className="lp-courses">{courses.map(course => <button key={course.id} onClick={() => { setSelectedCourse(course.id); setView('learn') }}><div className="lp-course-head"><span>{course.flag}</span><small>{course.levels} LEVELS</small></div><h3>{course.name}</h3><p>{course.native}</p><div className="lp-course-progress"><i style={{ width: `${course.units.flatMap(u => u.lessons).length ? course.units.flatMap(u => u.lessons).filter(l => l.completed).length / course.units.flatMap(u => u.lessons).length * 100 : 0}%` }}/></div><div className="lp-course-foot"><span><BookOpen/> {course.units.length} units</span><b>Continue <ChevronRight/></b></div></button>)}</div>
      </>}
      {view === 'learn' && activeCourse && <section className="lp-path"><button className="lp-back" onClick={() => setSelectedCourse(null)}>← All courses</button><div className="lp-path-banner"><span>{activeCourse.flag}</span><div><small>{activeCourse.native}</small><h2>{activeCourse.name} learning path</h2><p>{activeCourse.description}</p></div></div>{activeCourse.units.map((unit, unitIndex) => <div className="lp-unit" key={unit.id}><header><span>UNIT {unitIndex + 1}</span><div><h3>{unit.title}</h3><p>{unit.level_name}</p></div></header><div className="lp-node-row">{unit.lessons.map((lessonRow, lessonIndex) => { const previous = unitIndex === 0 && lessonIndex === 0 ? true : unit.lessons[lessonIndex - 1]?.completed || lessonRow.completed; return <button key={lessonRow.id} className={`${lessonRow.completed ? 'done' : previous ? 'current' : 'locked'}`} onClick={() => previous && openLesson(lessonRow.id)} title={lessonRow.title}>{lessonRow.completed ? <Check/> : previous ? <Star/> : <LockKeyhole/>}<span>{lessonRow.title}</span></button> })}</div></div>)}</section>}
      {view === 'practice' && <section className="lp-practice"><div className="lp-practice-hero"><div><small>SMART REVIEW</small><h2>Practice makes progress.</h2><p>Review your completed lessons and strengthen vocabulary you have already learned.</p></div><Zap/></div><div className="lp-practice-grid">{courses.map(course => <button key={course.id} onClick={() => { setSelectedCourse(course.id); setView('learn') }}><span>{course.flag}</span><div><h3>{course.name} practice</h3><p>Refresh recently learned words</p></div><ChevronRight/></button>)}</div></section>}
      {view === 'voice' && <VoiceTutor api={api} onBack={() => setView('learn')}/>} 
      {view === 'profile' && <section className="lp-profile"><div className="lp-avatar">{user.name[0]?.toUpperCase()}</div><h2>{user.name}</h2><p>{user.email}</p><div className="lp-profile-grid"><div><Flame/><strong>{stats.streak || 0}</strong><span>day streak</span></div><div><Zap/><strong>{stats.xp || 0}</strong><span>total XP</span></div><div><BookOpen/><strong>{progress.completed_count || 0}</strong><span>lessons</span></div><div><Trophy/><strong>{completedPct}%</strong><span>overall</span></div></div></section>}
      {view === 'lesson' && lesson && task && <section className="lp-lesson"><div className="lp-lesson-head"><button onClick={() => { setLesson(null); setView('learn') }}><X/></button><div><i style={{ width: `${((taskIndex + (checked ? 1 : 0)) / lesson.tasks.length) * 100}%` }}/></div><span>{taskIndex + 1}/{lesson.tasks.length}</span></div><div className="lp-question"><small>{task.type === 'translate' ? 'TRANSLATE' : 'SELECT THE MEANING'}</small><h2>{task.prompt}</h2><button className="lp-sound" onClick={() => { if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(task.prompt)) }}><Volume2/> Listen</button><div className="lp-options">{task.options.map(option => <button key={option} disabled={checked} onClick={() => setAnswer(option)} className={`${answer === option ? 'chosen' : ''} ${checked && option === task.answer ? 'correct' : ''} ${checked && answer === option && answer !== task.answer ? 'wrong' : ''}`}><span>{option}</span>{checked && option === task.answer && <Check/>}</button>)}</div></div><footer className={checked ? (isCorrect ? 'correct' : 'wrong') : ''}>{checked && <div><strong>{isCorrect ? 'Excellent!' : 'Keep going!'}</strong><p>{isCorrect ? 'That answer is correct.' : `Correct answer: ${task.answer}`} — {task.hint}</p></div>}<button className="lp-primary" disabled={!answer && !checked} onClick={checked ? nextTask : checkAnswer}>{checked ? (taskIndex === lesson.tasks.length - 1 ? 'Finish lesson' : 'Continue') : 'Check'}<ChevronRight/></button></footer></section>}
      {view === 'complete' && <section className="lp-complete"><div className="lp-complete-badge"><Trophy/></div><small>LESSON COMPLETE</small><h2>Great work, {user.name}!</h2><p>You kept learning and moved closer to your goal.</p><div className="lp-results"><span><Zap/><b>+XP</b><small>Lesson reward</small></span><span><Flame/><b>{stats.streak || 0}</b><small>day streak</small></span><span><Star/><b>{progress.completed_count || 0}</b><small>lessons</small></span></div><button className="lp-primary" onClick={() => setView('learn')}>Continue <ChevronRight/></button></section>}
    </main></div>
}
