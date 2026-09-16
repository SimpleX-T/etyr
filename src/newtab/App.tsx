import { useEffect, useState } from 'react';
import type { SavedWord } from '@shared/types';
import { getSettings } from '@storage/settings';
import { getAllSavedWords } from '@storage/bookmarks';
import { PronunciationService } from '@dictionary/pronunciation';
import { Volume2, X, RefreshCw, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<SavedWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [theme, setTheme] = useState<'notebook' | 'dark'>('notebook');
  const pronunciationService = new PronunciationService();

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('ntp_theme') as 'notebook' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme to body
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('ntp_theme', theme);
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      try {
        const settings = await getSettings();
        if (!settings.enableNewTab) {
          window.location.href = 'chrome-search://local-ntp/local-ntp.html';
          return;
        }

        const savedWords = await getAllSavedWords();
        if (savedWords.length > 0) {
          const randomIndex = Math.floor(Math.random() * savedWords.length);
          setWords(savedWords);
          setCurrentIndex(randomIndex);
        }
      } catch (e) {
        console.error('Failed to load Word of the Day', e);
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  const word = words[currentIndex];

  const handlePronounce = async () => {
    if (!word) return;
    try {
      await pronunciationService.speak(word.word, {
        word: word.word,
        query: word.query,
        phonetic: word.phonetic,
        audioUrl: word.audioUrl,
        source: word.source,
        meanings: [],
        timestamp: Date.now()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const nextWord = () => {
    if (words.length > 1) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * words.length);
      } while (nextIndex === currentIndex);
      setCurrentIndex(nextIndex);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'notebook' ? 'dark' : 'notebook'));
  };

  if (loading) {
    return <div className="ntp-loading"></div>;
  }

  return (
    <div className="ntp-container">
      <div className="ntp-header-meta">
        <span>Word of the Day</span>
        <span>{words.length > 0 ? `01/${String(words.length).padStart(2, '0')} words` : ''}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          className={`ntp-card ${!word ? 'ntp-card-empty' : ''}`}
          initial={{ opacity: 0, y: 40, scale: 0.95, rotate: theme === 'notebook' ? -2 : 0 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: theme === 'notebook' ? -1 : 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          key={word ? word.word + theme : 'empty' + theme}
        >
          {!word ? (
            <>
              <h1 className="ntp-card-empty-title">Nothing to see here.</h1>
              <p className="ntp-card-empty-subtitle">
                Keep reading. Save words to see them here.
              </p>
            </>
          ) : (
            <>
              <h1 className="ntp-word-title">{word.word}</h1>
              
              <div className="ntp-phonetic-row">
                {word.partOfSpeech && <span className="ntp-pos">{word.partOfSpeech}</span>}
                {word.phonetic && <span className="ntp-phonetic">[ {word.phonetic} ]</span>}
                <div className="ntp-listen-icon" onClick={handlePronounce} title="Pronounce">
                  <Volume2 size={18} />
                </div>
              </div>

              <div className="ntp-definitions-list">
                {word.definition.split(';').map((def, idx) => {
                  const cleanDef = def.trim();
                  if (!cleanDef) return null;
                  return (
                    <div className="ntp-def-item" key={idx}>
                      <span className="ntp-def-number">{idx + 1}.</span>
                      <div>
                        {cleanDef}
                        {idx === 0 && word.example && (
                          <div className="ntp-example">{word.example}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {word && (
        <motion.div 
          className="ntp-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
        >
          <button className="ntp-btn" aria-label="Close">
            <X size={24} strokeWidth={2.5} />
          </button>
          <button className="ntp-btn ntp-btn-primary" onClick={handlePronounce} aria-label="Pronounce">
            <Volume2 size={32} strokeWidth={2.5} />
          </button>
          <button className="ntp-btn" onClick={nextWord} aria-label="Next Word">
            <RefreshCw size={24} strokeWidth={2.5} />
          </button>
        </motion.div>
      )}

      {/* Theme Toggle Button */}
      <button 
        className="ntp-theme-toggle" 
        onClick={toggleTheme} 
        aria-label="Toggle Theme"
        title="Toggle Notebook/Dark Theme"
      >
        <Palette size={20} strokeWidth={2} />
      </button>
    </div>
  );
}
