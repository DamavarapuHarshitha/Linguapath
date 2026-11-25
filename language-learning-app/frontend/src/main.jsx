import React from 'react'
import { createRoot } from 'react-dom/client'
import DuolingoApp from './DuolingoApp'
import './style.css'
import './duolingo.css'
createRoot(document.getElementById('root')).render(<React.StrictMode><DuolingoApp/></React.StrictMode>)
