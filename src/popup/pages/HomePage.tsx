import { useCallback, useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, History as HistoryIcon } from 'lucide-react';
import type { DictionaryResult, HistoryEntry } from '@shared/types';
import { MESSAGE_ACTIONS } from '@shared/constants';
import { sendMessage } from '@shared/messaging';
import { formatRelativeTime } from '@shared/utils';
import SearchResult, { speakPronunciation } from '../components/SearchResult';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [recents, setRecents] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSeq = useRef(0);

  /* -- load recents ------------------------------------------------ */

  const loadRecents = useCallback(async () => {
    const res = await sendMessage<HistoryEntry[]>({
      action: MESSAGE_ACTIONS.HISTORY_GET_RECENT,
      payload: { limit: 10 },
    });
    if (res?.ok === true && Array.isArray(res.data)) {
      setRecents(res.data);
    }
  }, []);

  useEffect(() => {
    void loadRecents();
    inputRef.current?.focus();
  }, [loadRecents]);

  /* -- resolve ----------------------------------------------------- */

  const resolveWord = useCallback(
    async (rawQuery: string) => {
      const trimmed = rawQuery.trim();
      if (!trimmed) return;

      const seq = ++requestSeq.current;
      setResult(null);
      setIsSaved(false);
      setError(null);
      setIsLoading(true);

      const res = await sendMessage<DictionaryResult | null>({
        action: MESSAGE_ACTIONS.DICTIONARY_RESOLVE,
        payload: { query: trimmed },
      });

      if (seq !== requestSeq.current) return;
      setIsLoading(false);

      if (res?.ok === true && res.data && res.data.meanings.length > 0) {
        const found = res.data;
        setResult(found);

        const savedRes = await sendMessage<boolean>({
          action: MESSAGE_ACTIONS.BOOKMARK_IS_SAVED,
          payload: { query: found.query },
        });
        if (seq === requestSeq.current) {
          setIsSaved(savedRes?.ok === true ? savedRes.data === true : false);
        }

        void loadRecents();
      } else {
        setResult(null);
        const code = res?.ok === false ? res?.error?.code : undefined;
        setError(
          code === 'NETWORK_ERROR'
            ? "Couldn't reach the dictionary. Check your connection and try again."
            : code === 'NOT_FOUND'
              ? 'Not found. Try another word or spelling.'
              : 'Not found. Try another word or spelling.',
        );
      }
    },
    [loadRecents],
  );

  /* -- bookmark toggle -------------------------------------------- */

  const toggleBookmark = useCallback(async () => {
    if (!result) return;
    const res = isSaved
      ? await sendMessage({
          action: MESSAGE_ACTIONS.BOOKMARK_REMOVE,
          payload: { query: result.query },
        })
      : await sendMessage({
          action: MESSAGE_ACTIONS.BOOKMARK_SAVE,
          payload: { result },
        });
    if (res?.ok === true) setIsSaved((prev) => !prev);
  }, [result, isSaved]);

  /* -- handlers --------------------------------------------------- */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void resolveWord(query);
  };

  const handleRecentClick = (entry: HistoryEntry) => {
    setQuery(entry.query);
    void resolveWord(entry.query);
  };

  const handleSpeak = (r: DictionaryResult) => void speakPronunciation(r.query, r);

  /* -- render ----------------------------------------------------- */

  return (
    <div className="home">
      <form className="search-form" onSubmit={handleSubmit}>
        <SearchIcon size={15} className="search-icon" />
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Search a word..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        {isLoading && <span className="spinner" />}
      </form>

      {isLoading && !result && (
        <div className="status">Looking it up&hellip;</div>
      )}

      {result && (
        <SearchResult
          result={result}
          isSaved={isSaved}
          onSpeak={handleSpeak}
          onToggleBookmark={() => void toggleBookmark()}
        />
      )}

      {!result && !isLoading && error && (
        <div className="status error">{error}</div>
      )}

      {!result && !isLoading && !error && (
        <section className="recent">
          <h3 className="section-title">
            <HistoryIcon size={13} /> Recent
          </h3>

          {recents.length > 0 ? (
            <ul className="recent-list">
              {recents.map((entry) => (
                <li key={entry.id}>
                  <button
                    className="recent-item"
                    onClick={() => handleRecentClick(entry)}
                  >
                    <span className="recent-word">
                      {entry.word || entry.query}
                    </span>
                    {entry.partOfSpeech && (
                      <span className="pos-badge">{entry.partOfSpeech}</span>
                    )}
                    <span className="recent-time">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-hint">
              Select text on any page, or search above to look up a word.
            </p>
          )}
        </section>
      )}
    </div>
  );
}