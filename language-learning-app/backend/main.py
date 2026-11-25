from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3, hashlib, secrets, hmac, base64, json, time, os, urllib.request, urllib.error, tempfile
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from faster_whisper import WhisperModel

load_dotenv(Path(__file__).with_name(".env"))
DB = Path(__file__).with_name("linguapath.db")
SECRET = b"local-demo-secret-change-this-before-real-deployment"
app = FastAPI(title="LinguaPath API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)


LESSON_TITLES = [
    "Learn the key words", "Build useful phrases", "Ask and answer",
    "Listen and understand", "Make a sentence", "Everyday conversation",
    "Read in context", "Review and apply"
]
FR_LEVELS = [
 ("A1","Beginner",["Greetings and introductions","Numbers and time","Family and people","Food and drinks","At home","Daily routines","Places in town","Shopping basics","Getting around","Simple plans"]),
 ("A2","Elementary",["Past experiences","Travel and transport","Health and body","Work and study","Describing people","Weather and seasons","Invitations and plans","At a restaurant","Home and neighbourhood","Everyday problems"]),
 ("B1","Intermediate",["Tell a story","Opinions and preferences","News and media","Education and skills","Workplace communication","Travel experiences","Culture and traditions","Relationships","Environment","Plans and possibilities"]),
 ("B2","Upper intermediate",["Debate and argument","Society and change","Professional communication","Arts and literature","Science and technology","Current affairs","Nuanced opinions","Formal correspondence","Hypotheses and conditions","Complex narratives"]),
 ("C1","Advanced",["Abstract ideas","Rhetoric and persuasion","Idioms and register","Academic discussion","Professional negotiation","Literary expression","Critical analysis","Subtle disagreement","Complex social issues","Advanced writing"]),
 ("C2","Proficient",["Precision and nuance","Specialist discourse","Stylistic variation","Cultural references","Advanced rhetoric","Complex texts","Implicit meaning","Sophisticated debate","Editorial writing","Mastery review"])
]
JA_LEVELS = [
 ("N5","Beginner",["Hiragana foundations","Katakana foundations","Greetings and introductions","Numbers and time","Family and people","Food and drinks","Places and directions","Daily routines","Basic adjectives","Essential grammar"]),
 ("N4","Elementary",["Past and future","Giving directions","Shopping and services","Travel and transport","Health and feelings","Work and school","Comparisons","Requests and permission","Experiences","Connected sentences"]),
 ("N3","Intermediate",["Opinions and reasons","Plans and intentions","News and information","Social relationships","Workplace Japanese","Culture and customs","Possibility and change","Giving explanations","Everyday problems","Reading longer texts"]),
 ("N2","Upper intermediate",["Formal and casual register","Abstract topics","Media and society","Business communication","Complex grammar patterns","Written arguments","Nuance and implication","Public issues","Long-form reading","Advanced listening"]),
 ("N1","Advanced",["Subtle expressions","Academic language","Editorial and criticism","Specialist vocabulary","Complex written style","Idioms and allusions","Persuasive discourse","Implicit meaning","Advanced comprehension","Mastery and synthesis"])
]
FR_BANKS = [
 [("bonjour","hello"),("salut","hi"),("bonsoir","good evening"),("au revoir","goodbye"),("merci","thank you"),("s'il vous plaît","please"),("excusez-moi","excuse me"),("à bientôt","see you soon")],
 [("un","one"),("deux","two"),("trois","three"),("quatre","four"),("cinq","five"),("six","six"),("sept","seven"),("huit","eight")],
 [("la mère","mother"),("le père","father"),("la sœur","sister"),("le frère","brother"),("l'ami","friend"),("la famille","family"),("les parents","parents"),("l'enfant","child")],
 [("le pain","bread"),("l'eau","water"),("le lait","milk"),("le fromage","cheese"),("la pomme","apple"),("le café","coffee"),("le thé","tea"),("le repas","meal")],
 [("la maison","house"),("la chambre","bedroom"),("la cuisine","kitchen"),("la porte","door"),("la fenêtre","window"),("la table","table"),("la chaise","chair"),("le jardin","garden")],
 [("se lever","to get up"),("se laver","to wash"),("prendre le petit-déjeuner","to have breakfast"),("travailler","to work"),("étudier","to study"),("déjeuner","to have lunch"),("rentrer","to return home"),("dormir","to sleep")],
 [("la rue","street"),("la gare","station"),("la banque","bank"),("la pharmacie","pharmacy"),("le marché","market"),("le musée","museum"),("la place","square"),("l'école","school")],
 [("combien","how much/how many"),("le prix","price"),("cher","expensive"),("bon marché","inexpensive"),("la taille","size"),("payer","to pay"),("acheter","to buy"),("essayer","to try on")],
 [("à gauche","to the left"),("à droite","to the right"),("tout droit","straight ahead"),("près de","near"),("loin de","far from"),("le billet","ticket"),("le train","train"),("le bus","bus")],
 [("demain","tomorrow"),("aujourd'hui","today"),("ce soir","tonight"),("la semaine","week"),("le week-end","weekend"),("vouloir","to want"),("pouvoir","to be able to"),("aller","to go")]
]
JA_BANKS = [
 [("こんにちは","hello"),("おはようございます","good morning"),("こんばんは","good evening"),("ありがとう","thank you"),("すみません","excuse me"),("さようなら","goodbye"),("はい","yes"),("いいえ","no")],
 [("いち","one"),("に","two"),("さん","three"),("よん","four"),("ご","five"),("ろく","six"),("なな","seven"),("はち","eight")],
 [("はは","mother"),("ちち","father"),("あね","older sister"),("あに","older brother"),("ともだち","friend"),("かぞく","family"),("こども","child"),("せんせい","teacher")],
 [("みず","water"),("ごはん","rice/meal"),("パン","bread"),("ぎゅうにゅう","milk"),("りんご","apple"),("おちゃ","tea"),("コーヒー","coffee"),("さかな","fish")],
 [("いえ","house"),("へや","room"),("だいどころ","kitchen"),("ドア","door"),("まど","window"),("つくえ","desk"),("いす","chair"),("にわ","garden")],
 [("おきます","get up"),("あらいます","wash"),("たべます","eat"),("のみます","drink"),("はたらきます","work"),("べんきょうします","study"),("かえります","return"),("ねます","sleep")],
 [("みち","road"),("えき","station"),("ぎんこう","bank"),("びょういん","hospital"),("スーパー","supermarket"),("としょかん","library"),("がっこう","school"),("こうえん","park")],
 [("いくら","how much"),("たかい","expensive/high"),("やすい","cheap"),("おおきい","big"),("ちいさい","small"),("かいます","buy"),("みせ","shop"),("おかね","money")],
 [("ひだり","left"),("みぎ","right"),("まっすぐ","straight"),("ちかく","nearby"),("とおい","far"),("きっぷ","ticket"),("でんしゃ","train"),("バス","bus")],
 [("きょう","today"),("あした","tomorrow"),("きのう","yesterday"),("こんしゅう","this week"),("しゅうまつ","weekend"),("いきます","go"),("できます","can do"),("よてい","plan")]
]
def make_tasks(lang, level, topic, bank, lesson_no):
    # Each lesson uses a different starting point and a different learning prompt.
    a = bank[(lesson_no * 3) % len(bank)]
    b = bank[(lesson_no * 3 + 1) % len(bank)]
    c = bank[(lesson_no * 3 + 2) % len(bank)]
    if lang == "fr":
        prompts = [
          (f"What does “{a[0]}” mean?", a[1], [a[1], b[1], c[1]], f"“{a[0]}” is a useful expression for {topic.lower()}."),
          (f"Choose the French expression for “{b[1]}”.", b[0], [b[0], a[0], c[0]], f"Remember: {b[0]} = {b[1]}."),
          (f"Translate “{c[0]}” into English.", c[1], [c[1], a[1], b[1]], f"This word or phrase is used when talking about {topic.lower()}.")
        ]
    else:
        prompts = [
          (f"What does “{a[0]}” mean?", a[1], [a[1], b[1], c[1]], f"“{a[0]}” is useful vocabulary for {topic.lower()}."),
          (f"Choose the Japanese expression for “{b[1]}”.", b[0], [b[0], a[0], c[0]], f"Remember: {b[0]} = {b[1]}."),
          (f"Translate “{c[0]}” into English.", c[1], [c[1], a[1], b[1]], f"This expression is used when talking about {topic.lower()}.")
        ]
    tasks=[]
    for k,(prompt,answer,options,hint) in enumerate(prompts):
        # Deterministic option order, with one unambiguous correct answer.
        tasks.append({"id":f"{lang}-{level.lower()}-{lesson_no}-{k+1}","type":"choice" if k != 1 else "translate","prompt":prompt,"options":options,"answer":answer,"hint":hint})
    return tasks

def build_course(lang, name, native, flag, description, levels, banks):
    units=[]
    lesson_counter=0
    for level, level_name, topics in levels:
        for unit_index, topic in enumerate(topics):
            lessons=[]
            bank=banks[unit_index % len(banks)]
            for lesson_index, title in enumerate(LESSON_TITLES):
                lesson_counter += 1
                lesson_id=f"{lang}-{level.lower()}-u{unit_index+1}-l{lesson_index+1}"
                # Preserve the original starter IDs so existing completion records remain valid.
                if lang=="fr" and level=="A1" and unit_index==0 and lesson_index==0: lesson_id="fr-l1"
                if lang=="fr" and level=="A1" and unit_index==0 and lesson_index==1: lesson_id="fr-l2"
                if lang=="fr" and level=="A1" and unit_index==1 and lesson_index==0: lesson_id="fr-l3"
                if lang=="ja" and level=="N5" and unit_index==0 and lesson_index==0: lesson_id="ja-l1"
                if lang=="ja" and level=="N5" and unit_index==0 and lesson_index==1: lesson_id="ja-l2"
                if lang=="ja" and level=="N5" and unit_index==1 and lesson_index==0: lesson_id="ja-l3"
                lessons.append({"id":lesson_id,"title":title,"tasks":make_tasks(lang,level,topic,bank,lesson_index+unit_index*2)})
            units.append({"id":f"{lang}-{level.lower()}-u{unit_index+1}","level":level,"level_name":level_name,"title":topic,"description":f"{level_name} · {topic}","lessons":lessons})
    return {"id":lang,"name":name,"native":native,"flag":flag,"description":description,"levels":len(levels),"units":units}

COURSES = [
    build_course("fr","French","Français","🇫🇷","A complete French learning path from beginner to proficient.",FR_LEVELS,FR_BANKS),
    build_course("ja","Japanese","日本語","🇯🇵","A structured Japanese learning path from beginner to advanced.",JA_LEVELS,JA_BANKS)
]

def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    with conn() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
            salt TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
        c.execute("""CREATE TABLE IF NOT EXISTS progress(
            user_id INTEGER NOT NULL, lesson_id TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY(user_id, lesson_id),
            FOREIGN KEY(user_id) REFERENCES users(id))""")

@app.on_event("startup")
def startup():
    init_db()

class RegisterIn(BaseModel):
    name: str
    email: str
    password: str

class LoginIn(BaseModel):
    email: str
    password: str

def hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 180000).hex()

def make_token(user_id: int) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"uid":user_id,"exp":int(time.time())+86400}).encode()).decode().rstrip("=")
    sig = hmac.new(SECRET, payload.encode(), hashlib.sha256).hexdigest()
    return payload + "." + sig

def current_user(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Please log in.")
    token = authorization[7:]
    try:
        payload, sig = token.split(".", 1)
        expected = hmac.new(SECRET, payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            raise ValueError()
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if data["exp"] < time.time():
            raise ValueError()
        with conn() as c:
            user = c.execute("SELECT id,name,email FROM users WHERE id=?", (data["uid"],)).fetchone()
        if not user: raise ValueError()
        return dict(user)
    except Exception:
        raise HTTPException(401, "Session expired. Please log in again.")


# Local voice tutor configuration. Ollama and faster-whisper run on this computer.
WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            _whisper_model = WhisperModel(WHISPER_MODEL_NAME, device=WHISPER_DEVICE, compute_type="int8" if WHISPER_DEVICE == "cpu" else "float16")
        except Exception as exc:
            raise HTTPException(503, f"Could not load local Whisper model: {exc}. Check backend dependencies and available memory.")
    return _whisper_model

def local_tutor_reply(language: str, level: str, transcript: str, history: list):
    language_name = "French" if language == "fr" else "Japanese"
    level_description = {"A1":"beginner", "A2":"elementary", "B1":"intermediate", "B2":"upper-intermediate", "C1":"advanced", "C2":"proficient", "N5":"JLPT N5 beginner", "N4":"JLPT N4 elementary", "N3":"JLPT N3 intermediate", "N2":"JLPT N2 upper-intermediate", "N1":"JLPT N1 advanced"}[level]
    system = (
        f"You are LinguaPath, a friendly and skilled {language_name} conversation tutor. "
        f"The learner's level is {level} ({level_description}). Speak naturally and keep language suitable for that level. "
        f"The main conversation must be in {language_name}. Ask one short follow-up question. "
        "Notice meaningful grammar, vocabulary, word-choice, and sentence-structure errors in the learner's last message. "
        "If there is an error, provide a corrected natural version and a short explanation in simple English. "
        "If the learner's sentence is already correct, set correction and explanation to empty strings. "
        "For Japanese, use natural Japanese script (kanji/kana) appropriate to the level; do not use romaji unless asked. "
        "For French, use standard natural French. Be encouraging, never invent a mistake, and do not give formal proficiency scores. "
        "Return ONLY a valid JSON object with exactly these string keys: reply, correction, explanation. "
        "reply is the next spoken tutor turn in the target language; correction is the corrected learner phrase; explanation is in simple English."
    )
    messages = [{"role":"system", "content":system}]
    for item in history[-10:]:
        role = item.get("role")
        content = str(item.get("content", ""))[:1200]
        if role in ("user", "assistant") and content:
            messages.append({"role":role, "content":content})
    messages.append({"role":"user", "content":transcript[:2000]})
    payload = {"model":OLLAMA_MODEL, "messages":messages, "stream":False, "format":"json", "options":{"temperature":0.55}}
    req = urllib.request.Request(OLLAMA_URL, data=json.dumps(payload, ensure_ascii=False).encode("utf-8"), headers={"Content-Type":"application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))
        content = result.get("message", {}).get("content", "{}")
        parsed = json.loads(content)
        return {"reply":str(parsed.get("reply", "")), "correction":str(parsed.get("correction", "")), "explanation":str(parsed.get("explanation", ""))}
    except urllib.error.URLError as exc:
        raise HTTPException(503, f"Cannot reach Ollama at {OLLAMA_URL}. Start Ollama and download model '{OLLAMA_MODEL}'.") from exc
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(502, "The local language model returned an unreadable response. Please try again.") from exc

@app.get("/api/voice/status")
def voice_status(user=Depends(current_user)):
    ollama_ok = False
    try:
        with urllib.request.urlopen(OLLAMA_URL.replace("/api/chat", "/api/tags"), timeout=2):
            ollama_ok = True
    except Exception:
        pass
    return {"ollama_connected":ollama_ok, "ollama_model":OLLAMA_MODEL, "whisper_model":WHISPER_MODEL_NAME, "speech_recognition":"local"}

@app.post("/api/voice/chat")
async def voice_chat(
    language: str = Form(...),
    level: str = Form(...),
    history: str = Form("[]"),
    audio: UploadFile = File(...),
    user=Depends(current_user)
):
    language = language.strip().lower()
    level = level.strip().upper()
    allowed_levels = {"fr":{"A1","A2","B1","B2","C1","C2"}, "ja":{"N5","N4","N3","N2","N1"}}
    if language not in allowed_levels or level not in allowed_levels[language]:
        raise HTTPException(400, "Choose a valid language and learning level.")
    if audio.content_type and not (audio.content_type.startswith("audio/") or audio.content_type == "application/octet-stream"):
        raise HTTPException(415, "Please record audio using your browser microphone.")
    raw = await audio.read()
    if not raw or len(raw) > 20 * 1024 * 1024:
        raise HTTPException(400, "Audio is empty or too large. Please record a shorter message (maximum 20 MB).")
    suffix = ".webm" if "webm" in (audio.filename or "") or "webm" in (audio.content_type or "") else ".audio"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp.write(raw)
            temp_path = temp.name
        model = get_whisper_model()
        segments, _info = model.transcribe(temp_path, language=language, beam_size=3, vad_filter=True)
        transcript = " ".join(segment.text.strip() for segment in segments).strip()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(422, f"Could not transcribe this recording. Try speaking clearly for 2–15 seconds. Details: {str(exc)[:180]}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
    if not transcript:
        raise HTTPException(422, "I could not hear any speech. Please try again, speaking a little louder and closer to the microphone.")
    try:
        parsed_history = json.loads(history)
        if not isinstance(parsed_history, list): parsed_history = []
    except Exception:
        parsed_history = []
    result = local_tutor_reply(language, level, transcript, parsed_history)
    if not result["reply"]:
        raise HTTPException(502, "The local tutor did not produce a reply. Please try again.")
    return {"transcript":transcript, **result}

@app.get("/")
def health():
    return {"message":"LinguaPath API is running"}

@app.post("/api/register")
def register(body: RegisterIn):
    name, email, password = body.name.strip(), body.email.strip().lower(), body.password
    if len(name) < 2: raise HTTPException(400, "Please enter your name.")
    if "@" not in email or "." not in email: raise HTTPException(400, "Enter a valid email address.")
    if len(password) < 6: raise HTTPException(400, "Password must contain at least 6 characters.")
    salt = secrets.token_hex(16)
    ph = hash_password(password, salt)
    try:
        with conn() as c:
            cur = c.execute("INSERT INTO users(name,email,password_hash,salt) VALUES(?,?,?,?)",(name,email,ph,salt))
            uid = cur.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "An account with this email already exists.")
    return {"token":make_token(uid),"user":{"id":uid,"name":name,"email":email}}

@app.post("/api/login")
def login(body: LoginIn):
    with conn() as c:
        user = c.execute("SELECT * FROM users WHERE email=?", (body.email.strip().lower(),)).fetchone()
    if not user or not hmac.compare_digest(hash_password(body.password, user["salt"]), user["password_hash"]):
        raise HTTPException(401, "Incorrect email or password.")
    return {"token":make_token(user["id"]),"user":{"id":user["id"],"name":user["name"],"email":user["email"]}}

@app.get("/api/me")
def me(user=Depends(current_user)):
    return {"user":user}

@app.get("/api/courses")
def courses(user=Depends(current_user)):
    with conn() as c:
        rows = c.execute("SELECT lesson_id FROM progress WHERE user_id=? AND completed=1",(user["id"],)).fetchall()
    completed = {r["lesson_id"] for r in rows}
    result = []
    for course in COURSES:
        item = {k:v for k,v in course.items() if k != "units"}
        item["units"] = []
        for unit in course["units"]:
            u = {k:v for k,v in unit.items() if k != "lessons"}
            u["lessons"] = []
            for lesson in unit["lessons"]:
                u["lessons"].append({
                    "id":lesson["id"], "title":lesson["title"],
                    "task_count":len(lesson["tasks"]),
                    "completed":lesson["id"] in completed
                })
            item["units"].append(u)
        result.append(item)
    return result

@app.get("/api/lessons/{lesson_id}")
def lesson_detail(lesson_id: str, user=Depends(current_user)):
    for course in COURSES:
        for unit in course["units"]:
            for lesson in unit["lessons"]:
                if lesson["id"] == lesson_id:
                    return {"id":lesson["id"],"title":lesson["title"],"tasks":lesson["tasks"]}
    raise HTTPException(404, "Lesson not found.")

class CompleteIn(BaseModel):
    lesson_id: str

@app.post("/api/progress/complete")
def complete(body: CompleteIn, user=Depends(current_user)):
    valid = any(l["id"] == body.lesson_id for co in COURSES for un in co["units"] for l in un["lessons"])
    if not valid: raise HTTPException(404, "Lesson not found.")
    with conn() as c:
        c.execute("INSERT INTO progress(user_id,lesson_id,completed) VALUES(?,?,1) ON CONFLICT(user_id,lesson_id) DO UPDATE SET completed=1",(user["id"],body.lesson_id))
    return {"message":"Lesson completed","lesson_id":body.lesson_id,"completed":True}

@app.get("/api/progress")
def get_progress(user=Depends(current_user)):
    with conn() as c:
        rows = c.execute("SELECT lesson_id FROM progress WHERE user_id=? AND completed=1",(user["id"],)).fetchall()
    completed = [r["lesson_id"] for r in rows]
    total = sum(len(u["lessons"]) for co in COURSES for u in co["units"])
    return {"completed_lessons":completed,"completed_count":len(completed),"total_lessons":total}
