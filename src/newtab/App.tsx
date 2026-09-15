import { useEffect, useState } from 'react';
import type { SavedWord } from '@shared/types';
import { getSettings } from '@storage/settings';
import { getAllSavedWords } from '@storage/bookmarks';
import { PronunciationService } from '@dictionary/pronunciation';
import { Volume2 } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [word, setWord] = useState<SavedWord | null>(null);
  const pronunciationService = new PronunciationService();

  useEffect(() => {
    const init = async () => {
      try {
        const settings = await getSettings();
        if (!settings.enableNewTab) {
          // Bypass extension new tab
          window.location.href = 'chrome-search://local-ntp/local-ntp.html';
          return;
        }

        const words = await getAllSavedWords();
        if (words.length > 0) {
          // Pick a random word from their saved words as the Word of the Day
          const randomIndex = Math.floor(Math.random() * words.length);
          setWord(words[randomIndex]);
        }
      } catch (e) {
        console.error('Failed to load Word of the Day', e);
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

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

  if (loading) {
    return <div className="ntp-loading"></div>;
  }

  if (!word) {
    return (
      <div className="ntp-container">
        <div className="ntp-glass">
          <h2>Welcome to Etyr</h2>
          <p>Start saving words while you read to see them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ntp-container">
      <div className="ntp-glass">
        <div className="ntp-header">
          <span className="ntp-label">Word of the Day</span>
        </div>
        
        <h1 className="ntp-word">{word.word}</h1>
        
        {word.phonetic && (
          <div className="ntp-phonetic-row">
            <span className="ntp-phonetic">{word.phonetic}</span>
            <button className="ntp-audio-btn" onClick={handlePronounce} aria-label="Listen">
              <Volume2 size={16} />
            </button>
          </div>
        )}
        
        <div className="ntp-definition">
          {word.partOfSpeech && <span className="ntp-pos">{word.partOfSpeech}</span>}
          <p className="ntp-def-text">{word.definition}</p>
        </div>

        {word.example && (
          <p className="ntp-example">"{word.example}"</p>
        )}
      </div>
    </div>
  );
}
