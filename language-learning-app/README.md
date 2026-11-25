# LinguaPath — local language-learning app

LinguaPath includes French and Japanese courses, login/registration, local progress storage, and a local AI voice conversation tutor. The voice tutor uses **Ollama** for local text generation, **faster-whisper** for local speech recognition, and the browser/operating-system speech voices for spoken replies. No paid API key is required.

## Requirements (Windows)

1. Python 3.10–3.12 (64-bit).
2. Node.js 20 or later.
3. Ollama for Windows: https://ollama.com/download
4. A microphone and a modern browser such as Chrome or Edge.
5. Recommended: 8 GB RAM minimum for the small models; 16 GB or more is preferable. A GPU is optional; CPU mode works but can be slower.

## 1. Install the local language model

Install Ollama, open PowerShell, then run:

```powershell
ollama pull qwen2.5:3b
```

Ollama normally runs as a background service. Confirm it is available:

```powershell
ollama list
```

For a more capable tutor, if your computer has enough memory, use `ollama pull qwen2.5:7b` and set `OLLAMA_MODEL=qwen2.5:7b` in `backend/.env`.

## 2. Start the backend

Open PowerShell in the project folder:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload
```

The first time the voice tutor is used, faster-whisper downloads the selected speech-recognition model (`base`) once. This download is free; after it is cached, transcription runs locally. The first transcription can take longer while the model loads.

If PowerShell blocks environment activation, run this in that same terminal and retry activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## 3. Start the frontend

Open a **second** PowerShell window:

```powershell
cd path\to\language-learning-app\frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## 4. Use the voice tutor

1. Sign in or create an account.
2. Open **AI voice tutor**.
3. Choose French (A1–C2) or Japanese (N5–N1).
4. Select **Start conversation**.
5. Select **Speak to your tutor**, allow microphone access, speak for a few seconds, then select **Stop recording & send**.
6. The local Whisper model transcribes your speech. Ollama generates a level-aware reply and correction. Your browser reads the reply aloud using an installed French or Japanese system voice.

Use Chrome or Edge and allow microphone access. Browser speech voices depend on the voices installed in Windows. If no suitable French/Japanese voice is installed, the text conversation still works; install the corresponding Windows language speech pack for spoken output.

## Local processing and costs

- No OpenAI API key, paid voice API, or per-message charge is used.
- Audio is sent from the browser to your own local FastAPI server, transcribed locally by faster-whisper, and the transcript is sent to your own local Ollama service.
- Browser speech synthesis uses voices installed on your computer.
- Internet is needed for the initial Ollama and Whisper model downloads. After downloads, the tutor can run offline as long as the local services and models are available.
- The app does not promise human-level pronunciation scoring. Whisper provides speech transcription; the language model gives conversational corrections based on that transcript.

## Optional performance settings

Edit `backend/.env`:

```env
OLLAMA_URL=http://127.0.0.1:11434/api/chat
OLLAMA_MODEL=qwen2.5:3b
WHISPER_MODEL=base
WHISPER_DEVICE=cpu
```

For a lighter Whisper model on a slower computer, use `WHISPER_MODEL=tiny`. For better transcription quality, use `small` (more memory and processing time). Restart the backend after changing settings.

## Troubleshooting

- **Cannot reach Ollama:** Start the Ollama application and run `ollama list` in PowerShell.
- **Model not found:** Run `ollama pull qwen2.5:3b`.
- **Microphone denied:** Allow microphone access for `localhost` in browser site settings.
- **No French/Japanese audio:** Install the matching Windows speech language/voice pack; available voices vary by Windows version.
- **Slow response:** Try `qwen2.5:3b` and `WHISPER_MODEL=tiny`; CPU inference speed depends on your computer.
- **Whisper installation issue:** Use 64-bit Python 3.10–3.12, recreate the virtual environment, and reinstall `requirements.txt`.

## Existing app features

The project retains the existing React/Vite frontend, FastAPI backend, SQLite user accounts, course structure, lesson exercises, and lesson progress tracking.
