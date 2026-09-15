import { useState, useEffect } from 'react';
import type { SavedWord, Stats } from '@shared/types';
import { sendMessage } from '@shared/messaging';
import { MESSAGE_ACTIONS } from '@shared/constants';
import { Flame, CheckCircle, Brain, RefreshCw } from 'lucide-react';
import SearchResult from '../components/SearchResult';
import '../styles/popup.css'; // Relies on existing popup styles or we can add new ones

export default function VocabPage() {
  const [dueWords, setDueWords] = useState<SavedWord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Flashcard state
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wordsRes, statsRes] = await Promise.all([
        sendMessage<SavedWord[]>({ action: MESSAGE_ACTIONS.BOOKMARK_GET_ALL }),
        sendMessage<Stats>({ action: MESSAGE_ACTIONS.STATS_GET })
      ]);
      
      if (statsRes?.ok && statsRes.data) {
        setStats(statsRes.data);
      }
      
      if (wordsRes?.ok && wordsRes.data) {
        const now = Date.now();
        const due = wordsRes.data.filter(w => (w.nextReviewDate || 0) <= now);
        // Sort by how overdue they are
        due.sort((a, b) => (a.nextReviewDate || 0) - (b.nextReviewDate || 0));
        setDueWords(due);
      }
    } catch (e) {
      console.error('Failed to load vocab data', e);
    } finally {
      setLoading(false);
      setIsRevealed(false);
      setCurrentWordIndex(0);
    }
  };

  const handleReview = async (rating: number) => {
    const currentWord = dueWords[currentWordIndex];
    if (!currentWord) return;

    try {
      const statsRes = await sendMessage<Stats>({
        action: MESSAGE_ACTIONS.STATS_RECORD_REVIEW,
        payload: { 
          id: currentWord.id, 
          rating, 
          currentLevel: currentWord.reviewLevel || 0 
        }
      });
      
      if (statsRes?.ok && statsRes.data) {
        setStats(statsRes.data);
      }

      // Move to next word
      if (currentWordIndex < dueWords.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        setIsRevealed(false);
      } else {
        // Finished queue
        loadData(); // Re-fetch to see if anything else is due, or just show completion screen
      }
    } catch (e) {
      console.error('Failed to record review', e);
    }
  };

  if (loading) {
    return (
      <div className="page vocab-page centered">
        <RefreshCw size={24} className="spin text-muted" />
      </div>
    );
  }

  const currentWord = dueWords[currentWordIndex];
  const isFinished = dueWords.length === 0 || !currentWord;

  return (
    <div className="page vocab-page">
      {/* Header Stats */}
      <div className="vocab-stats">
        <div className="stat-pill">
          <Flame size={16} color="var(--accent-color, #ff6b6b)" />
          <span className="stat-value">{stats?.streakDays || 0}</span>
          <span className="stat-label">Day Streak</span>
        </div>
        <div className="stat-pill">
          <Brain size={16} color="var(--primary-color, #4dabf7)" />
          <span className="stat-value">{stats?.wordsReviewedToday || 0}</span>
          <span className="stat-label">Reviewed Today</span>
        </div>
      </div>

      <div className="vocab-content">
        {isFinished ? (
          <div className="vocab-finished">
            <CheckCircle size={48} className="text-success" style={{ color: '#51cf66', marginBottom: 16 }} />
            <h2 className="vocab-title">You're all caught up!</h2>
            <p className="vocab-text">Check back tomorrow for more reviews.</p>
            <button className="vocab-btn-secondary" onClick={loadData}>
              Refresh
            </button>
          </div>
        ) : (
          <div className="vocab-flashcard">
            <div className="vocab-progress">
              Reviewing {currentWordIndex + 1} of {dueWords.length}
            </div>
            
            <div className="flashcard-front">
              <h2 className="flashcard-word">{currentWord.word}</h2>
              {currentWord.context ? (
                <p className="flashcard-context">
                  "{currentWord.context}"
                </p>
              ) : (
                <p className="flashcard-no-context">No context saved</p>
              )}
            </div>

            {isRevealed ? (
              <div className="flashcard-back">
                <SearchResult
                  result={{
                    query: currentWord.query,
                    word: currentWord.word,
                    phonetic: currentWord.phonetic,
                    audioUrl: currentWord.audioUrl,
                    source: currentWord.source,
                    meanings: [
                      {
                        partOfSpeech: currentWord.partOfSpeech || 'unknown',
                        definitions: [
                          { definition: currentWord.definition, example: currentWord.example }
                        ]
                      }
                    ],
                    timestamp: currentWord.savedAt,
                  }}
                  isSaved={true}
                  onToggleBookmark={() => {}} // Disabled in review mode
                  onSpeak={() => {}} // Disabled in review mode
                />
                
                <div className="flashcard-actions">
                  <button className="srs-btn srs-hard" onClick={() => handleReview(0)}>
                    Hard
                    <small>Soon</small>
                  </button>
                  <button className="srs-btn srs-good" onClick={() => handleReview(1)}>
                    Good
                    <small>Later</small>
                  </button>
                  <button className="srs-btn srs-easy" onClick={() => handleReview(2)}>
                    Easy
                    <small>Much Later</small>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flashcard-reveal-area">
                <button className="vocab-btn-primary" onClick={() => setIsRevealed(true)}>
                  Reveal Definition
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
