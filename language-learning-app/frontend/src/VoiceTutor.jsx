import React, { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, Volume2, Bot, User, LoaderCircle, AlertCircle, Square } from 'lucide-react'

const GREETINGS = {
  fr: { A1: 'Bonjour ! Comment tu t’appelles ?', A2: 'Salut ! Comment se passe ta journée ?', B1: 'Bonjour ! Raconte-moi quelque chose que tu as fait cette semaine.', B2: 'Bonjour ! Quel sujet aimerais-tu discuter aujourd’hui ?', C1: 'Bonjour ! J’aimerais connaître ton point de vue sur un sujet qui t’intéresse.', C2: 'Bonjour ! Explorons une idée complexe et défendons nos points de vue.' },
  ja: { N5: 'こんにちは！お名前は何ですか？', N4: 'こんにちは！今日はどうですか？', N3: 'こんにちは！最近したことについて話してください。', N2: 'こんにちは！今日はどんなテーマについて話しましょうか？', N1: 'こんにちは！興味のあるテーマについて、詳しく意見を聞かせてください。' }
}

export default function VoiceTutor({ api, onBack }) {
  const [language, setLanguage] = useState('fr')
  const [level, setLevel] = useState('A1')
  const [status, setStatus] = useState('idle')
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const [lastCorrection, setLastCorrection] = useState(null)
  const mediaRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const messagesEndRef = useRef(null)
  const messagesRef = useRef([])

  useEffect(() => { messagesRef.current = messages; messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => () => { stopMic(); window.speechSynthesis?.cancel() }, [])

  function speak(text, lang) {
    if (!text || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang === 'fr' ? 'fr-FR' : 'ja-JP'
    utterance.rate = language === 'ja' ? 0.88 : 0.92
    const voices = window.speechSynthesis.getVoices()
    const prefix = lang === 'fr' ? 'fr' : 'ja'
    const voice = voices.find(v => v.lang?.toLowerCase().startsWith(prefix))
    if (voice) utterance.voice = voice
    window.speechSynthesis.speak(utterance)
  }

  function addMessage(role, text) {
    if (!text?.trim()) return
    setMessages(prev => [...prev, { role, text: text.trim(), id: `${Date.now()}-${Math.random()}` }])
  }

  function stopMic() {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') { mediaRef.current.onstop = null; mediaRef.current.stop() }
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop()
  }

  function startConversation() {
    setError('')
    setMessages([])
    setLastCorrection(null)
    setStatus('connected')
    const greeting = GREETINGS[language][level]
    setMessages([{ role: 'assistant', text: greeting, id: `${Date.now()}-welcome` }])
    speak(greeting, language)
  }

  async function startRecording() {
    setError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Your browser does not support microphone recording. Please use the latest Chrome or Edge.')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t))
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      mediaRef.current = recorder
      recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }); stream.getTracks().forEach(t => t.stop()); streamRef.current = null; if (blob.size) sendAudio(blob) }
      recorder.start()
      setStatus('recording')
    } catch (e) {
      setError(e.message?.toLowerCase().includes('permission') ? 'Please allow microphone access in your browser.' : e.message || 'Could not access the microphone.')
    }
  }

  async function sendAudio(blob) {
    setStatus('thinking')
    try {
      const form = new FormData()
      form.append('audio', blob, language === 'ja' ? 'speech-ja.webm' : 'speech-fr.webm')
      form.append('language', language)
      form.append('level', level)
      const history = messagesRef.current.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }))
      form.append('history', JSON.stringify(history))
      const { data } = await api.post('/voice/chat', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 })
      addMessage('user', data.transcript)
      if (data.correction) setLastCorrection({ correction: data.correction, explanation: data.explanation || '' })
      else setLastCorrection(null)
      if (data.correction) addMessage('assistant', `Correction: ${data.correction}${data.explanation ? ` — ${data.explanation}` : ''}`)
      addMessage('assistant', data.reply)
      const spoken = [data.correction, data.explanation, data.reply].filter(Boolean).join('. ')
      speak(spoken, language)
      setStatus('connected')
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'The local tutor could not process your speech. Check that Ollama is running.')
      setStatus('connected')
    }
  }

  function endConversation() {
    stopMic()
    window.speechSynthesis?.cancel()
    setStatus('idle')
  }

  const levels = language === 'fr' ? ['A1','A2','B1','B2','C1','C2'] : ['N5','N4','N3','N2','N1']
  const isActive = status !== 'idle'
  return <section className="voice-page">
    <button className="back-link" onClick={() => { endConversation(); onBack() }}>← Back to courses</button>
    <div className="voice-hero">
      <div className="voice-hero-icon"><Bot size={30}/></div>
      <span className="eyebrow">LINGUAPATH LOCAL AI SPEAKING PARTNER</span>
      <h2>Speak. Listen. Improve.</h2>
      <p>Practice aloud with a local AI tutor. Your speech is processed on this computer; no paid AI API is used.</p>
    </div>
    <div className="voice-controls">
      <label>Learning language<select value={language} disabled={isActive} onChange={e => { setLanguage(e.target.value); setLevel(e.target.value === 'fr' ? 'A1' : 'N5') }}><option value="fr">🇫🇷 French</option><option value="ja">🇯🇵 Japanese</option></select></label>
      <label>Learning level<select value={level} disabled={isActive} onChange={e => setLevel(e.target.value)}>{levels.map(x => <option key={x}>{x}</option>)}</select></label>
    </div>
    <div className="voice-chat-card">
      <div className="voice-chat-head"><div><b>Your conversation</b><small>{status === 'recording' ? 'Recording your voice…' : status === 'thinking' ? 'Local AI is thinking…' : isActive ? 'Conversation active · Speak when ready' : 'Ready when you are'}</small></div><span className={`voice-status ${status}`}>{status === 'recording' ? 'RECORDING' : status === 'thinking' ? 'THINKING' : isActive ? 'ACTIVE' : 'OFFLINE'}</span></div>
      <div className="voice-messages">
        {messages.length === 0 && <div className="voice-empty"><Volume2 size={28}/><b>Your tutor will speak first</b><span>Choose French or Japanese and your level, then start a conversation.</span></div>}
        {messages.map(m => <div className={`voice-message ${m.role}`} key={m.id}><span className="voice-message-icon">{m.role === 'assistant' ? <Bot size={17}/> : <User size={17}/>}</span><div><small>{m.role === 'assistant' ? 'LINGUAPATH AI' : 'YOU'}</small><p>{m.text}</p></div></div>)}
        <div ref={messagesEndRef}/>
      </div>
      {lastCorrection && <div className="voice-correction"><b>Learning tip</b><p>{lastCorrection.correction}</p>{lastCorrection.explanation && <small>{lastCorrection.explanation}</small>}</div>}
      {error && <div className="voice-error"><AlertCircle size={16}/>{error}</div>}
      <div className="voice-actions">
        {!isActive ? <button className="voice-start" onClick={startConversation}><Mic size={19}/> Start conversation</button> : status === 'recording' ? <button className="voice-stop" onClick={stopRecording}><Square size={17}/> Stop recording & send</button> : <button className="voice-start" disabled={status === 'thinking'} onClick={startRecording}>{status === 'thinking' ? <LoaderCircle size={18} className="spin"/> : <Mic size={19}/>} {status === 'thinking' ? 'Processing locally…' : 'Speak to your tutor'}</button>}
        {isActive && <button className="voice-stop" onClick={endConversation}><PhoneOff size={17}/> End session</button>}
      </div>
      <p className="voice-disclaimer"><MicOff size={14}/> Local speech recognition uses Whisper + Ollama. Spoken replies use your browser’s installed French/Japanese voice. First-time model downloads require internet; conversations are processed locally.</p>
    </div>
  </section>
}
