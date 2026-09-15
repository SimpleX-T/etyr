import { Volume2, Bookmark, BookmarkCheck } from 'lucide-react';
import type { DictionaryResult } from '@shared/types';
import { MESSAGE_ACTIONS } from '@shared/constants';
import { sendMessage } from '@shared/messaging';
import { PronunciationService } from '@dictionary/pronunciation';

/* ------------------------------------------------------------------ */
/*  Pronunciation helper (reused by pages)                              */
/* ------------------------------------------------------------------ */

export async function speakPronunciation(
  query: string,
  result?: DictionaryResult,
): Promise<void> {
  const response = await sendMessage<{ played?: boolean }>({
    action: MESSAGE_ACTIONS.PRONUNCIATION_SPEAK,
    payload: result ? { query, result } : { query },
  });

  if (response?.ok === false) return; // explicit rejection (disabled / unavailable)

  if (response?.ok === true && (response.data as { played?: boolean })?.played) {
    return;
  }

  const pronunciation = new PronunciationService();
  try {
    if (result) {
      await pronunciation.speak(query, result);
    } else {
      await pronunciation.speakWithSynthesis(query);
    }
  } catch {
    /* swallow – best-effort */
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface SearchResultProps {
  result: DictionaryResult;
  isSaved: boolean;
  onSpeak: (result: DictionaryResult) => void;
  onToggleBookmark: () => void;
}

export default function SearchResult({
  result,
  isSaved,
  onSpeak,
  onToggleBookmark,
}: SearchResultProps) {
  const primary = result.meanings[0];
  const defs = primary ? primary.definitions.slice(0, 3) : [];

  return (
    <article className="search-result">
      <div className="search-result-head">
        <div className="search-result-title">
          <h2 className="search-result-word">{result.word}</h2>
          {result.phonetic && (
            <span className="search-result-phonetic">{result.phonetic}</span>
          )}
        </div>

        <div className="search-result-actions">
          <button
            className="icon-btn"
            onClick={() => onSpeak(result)}
            aria-label="Pronounce word"
          >
            <Volume2 size={15} />
          </button>
          <button
            className={`icon-btn${isSaved ? ' is-saved' : ''}`}
            onClick={onToggleBookmark}
            aria-label={isSaved ? 'Remove from saved words' : 'Save word'}
          >
            {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </button>
        </div>
      </div>

      {primary && (
        <div className="search-result-body">
          <span className="pos-badge">{primary.partOfSpeech}</span>
          {defs.length > 0 && (
            <ul className="definition-list">
              {defs.map((d, i) => (
                <li key={i} className="definition-item">
                  {d.definition}
                  {d.example && (
                    <span className="definition-example">&ldquo;{d.example}&rdquo;</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!primary && (
        <div className="search-result-body">
          <p className="empty-hint">No meanings available.</p>
        </div>
      )}

      <footer className="search-result-foot">
        <span className="source-tag">{result.source}</span>
      </footer>
    </article>
  );
}