import { Volume2, Bookmark, BookmarkCheck, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { DictionaryResult, Definition } from '@shared/types';
import { MESSAGE_ACTIONS } from '@shared/constants';
import { sendMessage } from '@shared/messaging';
import { sourceLabel, splitDefinitionSegments, formatDefinition, formatQuote, formatResultForCopy, copyTextToClipboard } from '@shared/utils';
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

function PopupCopy({ text, className = '', title = 'Copy', copiedTitle = 'Copied' }: {
  text: string;
  className?: string;
  title?: string;
  copiedTitle?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    if (!text || copied) return;
    if (await copyTextToClipboard(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <button
      type="button"
      className={`popup-copy${copied ? ' is-copied' : ''}${className ? ` ${className}` : ''}`}
      aria-label={copied ? copiedTitle : title}
      title={copied ? copiedTitle : title}
      onClick={handleCopy}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export interface SearchResultProps {
  result: DictionaryResult;
  isSaved: boolean;
  onSpeak: (result: DictionaryResult) => void;
  onToggleBookmark: () => void;
  onOpenWord?: (query: string) => void;
}

function DefinitionBlock({ def, depth = 0, onOpenWord }: { def: Definition; depth?: number; onOpenWord?: (query: string) => void }) {
  const segments = splitDefinitionSegments(def.definition, def.linkedWords);
  const examples = def.examples ?? (def.example ? [def.example] : []);

  return (
    <li className={`definition-item${depth > 0 ? ' definition-item--sub' : ''}`}>
      <div className="definition-item-row">
        <span className="definition-text">
          {segments.map((segment, idx) =>
            segment.type === 'link' ? (
              <button
                key={idx}
                type="button"
                className="definition-link"
                title={`Look up "${segment.text}"`}
                onClick={() => onOpenWord?.(segment.query)}
              >
                {segment.text}
              </button>
            ) : (
              <span key={idx}>{segment.text}</span>
            ),
          )}
        </span>
        <PopupCopy text={formatDefinition(def)} title="Copy definition" copiedTitle="Definition copied" />
      </div>
      {def.tags && def.tags.length > 0 && (
        <span className="sense-tags">
          {def.tags.map(tag => (
            <span key={tag} className="sense-tag">{tag}</span>
          ))}
        </span>
      )}
      {examples.length > 0 && (
        <span className="definition-examples">
          {examples.slice(0, 3).map((example, i) => (
            <span key={i} className="definition-example">&ldquo;{example}&rdquo;</span>
          ))}
          {examples.length > 3 && (
            <span className="definition-more-note">+{examples.length - 3} more</span>
          )}
        </span>
      )}
      {(def.synonyms?.length || def.antonyms?.length) && (
        <span className="definition-wordlists">
          {def.synonyms && def.synonyms.length > 0 && (
            <span className="definition-wordlist">
              <span className="definition-wordlist-label">Synonyms: </span>
              {def.synonyms.slice(0, 6).map((word) => (
                <button
                  key={word}
                  type="button"
                  className="definition-chip"
                  title={`Look up "${word}"`}
                  onClick={() => onOpenWord?.(word)}
                >
                  {word}
                </button>
              ))}
              {def.synonyms.length > 6 && (
                <span className="definition-more-note">+{def.synonyms.length - 6} more</span>
              )}
            </span>
          )}
          {def.antonyms && def.antonyms.length > 0 && (
            <span className="definition-wordlist">
              <span className="definition-wordlist-label">Antonyms: </span>
              {def.antonyms.slice(0, 6).map((word) => (
                <button
                  key={word}
                  type="button"
                  className="definition-chip"
                  title={`Look up "${word}"`}
                  onClick={() => onOpenWord?.(word)}
                >
                  {word}
                </button>
              ))}
              {def.antonyms.length > 6 && (
                <span className="definition-more-note">+{def.antonyms.length - 6} more</span>
              )}
            </span>
          )}
        </span>
      )}
      {def.subsenses && def.subsenses.length > 0 && (
        <ul className="definition-subsenses">
          {def.subsenses.slice(0, 3).map((sub, i) => (
            <DefinitionBlock key={i} def={sub} depth={depth + 1} onOpenWord={onOpenWord} />
          ))}
          {def.subsenses.length > 3 && (
            <span className="definition-subsenses-more">+{def.subsenses.length - 3} more related senses</span>
          )}
        </ul>
      )}
      {def.quotes && def.quotes[0] && (
        <div className="definition-quote-row">
          <blockquote className="definition-quote" cite={def.quotes[0].reference}>
            <p className="definition-quote-text">&ldquo;{def.quotes[0].text}&rdquo;</p>
            {def.quotes[0].reference && (
              <cite className="definition-quote-ref">{def.quotes[0].reference}</cite>
            )}
          </blockquote>
          <PopupCopy text={formatQuote(def.quotes[0])} title="Copy citation" copiedTitle="Citation copied" className="definition-quote-copy" />
        </div>
      )}
    </li>
  );
}

export default function SearchResult({
  result,
  isSaved,
  onSpeak,
  onToggleBookmark,
  onOpenWord,
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
          <div className="search-result-pos-row">
            <span className="pos-badge">{primary.partOfSpeech}</span>
            {primary.forms && primary.forms.length > 0 && (
              <span className="search-result-forms">
                {primary.forms.map(form => (
                  <span key={form.word + (form.tags?.[0] ?? '')} className="form-chip">
                    {form.tags?.[0] && <span className="form-chip-tag">{form.tags[0]}</span>}
                    {form.word}
                  </span>
                ))}
              </span>
            )}
          </div>
          {defs.length > 0 && (
            <ul className="definition-list">
              {defs.map((d, i) => (
                <DefinitionBlock key={i} def={d} onOpenWord={onOpenWord} />
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
        <div className="search-result-foot-left">
          <span className="source-tag">{sourceLabel(result.source)}</span>
        </div>
        <PopupCopy
          text={formatResultForCopy(result)}
          title="Copy full entry"
          copiedTitle="Entry copied"
          className="search-result-copy-entry"
        />
      </footer>
    </article>
  );
}