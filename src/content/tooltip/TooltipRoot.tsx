import { useEffect } from 'react';
import type { DictionaryResult, TooltipState } from '@shared/types';
import { LoadingState } from './components/LoadingState';
import { DefinitionList } from './components/DefinitionList';
import { ErrorState } from './components/ErrorState';
import { SpeakerButton } from './components/SpeakerButton';
import { BookmarkButton } from './components/BookmarkButton';
import { BanIcon } from './components/icons';

type RenderState = Extract<TooltipState, 'loading' | 'showing' | 'error' | 'not-found'>;

export interface TooltipRootProps {
  query: string;
  result: DictionaryResult | null;
  state: RenderState;
  isSaved: boolean;
  showPronunciation?: boolean;
  onBookmark: () => void;
  onPronounce: () => void;
  onDismiss: () => void;
  onDisableSite: () => void;
}

interface HeaderControlsProps {
  state: RenderState;
  onPronounce: () => void;
  onBookmark: () => void;
  isSaved: boolean;
  canPronounce: boolean;
}

function HeaderControls({ state, onPronounce, onBookmark, isSaved, canPronounce }: HeaderControlsProps) {
  return (
    <div className="etyr-tooltip__controls">
      {state === 'showing' && canPronounce && (
        <SpeakerButton playing={false} onPlay={onPronounce} />
      )}
      <BookmarkButton saved={isSaved} onToggle={onBookmark} disabled={state !== 'showing'} />
    </div>
  );
}

function displayWord(query: string, result: DictionaryResult | null): string {
  if (result?.word) return result.word;
  return query;
}

export function TooltipRoot({
  query,
  result,
  state,
  isSaved,
  showPronunciation = true,
  onBookmark,
  onPronounce,
  onDismiss,
  onDisableSite,
}: TooltipRootProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onDismiss]);

  // Pronunciation falls back to speech synthesis, so it works for any word
// even when the dictionary source provides no audio file.
const canPronounce = Boolean(showPronunciation);

  let content: React.ReactNode | null = null;
  let stateClass = '';

  switch (state) {
    case 'loading':
      content = <LoadingState />;
      stateClass = 'etyr-tooltip--loading';
      break;
    case 'showing':
      content = result ? <DefinitionList result={result} /> : <ErrorState notFound />;
      stateClass = 'etyr-tooltip--showing';
      break;
    case 'not-found':
      content = <ErrorState notFound />;
      stateClass = 'etyr-tooltip--error';
      break;
    case 'error':
      content = <ErrorState message="Something went wrong. Check your connection." />;
      stateClass = 'etyr-tooltip--error';
      break;
  }

  return (
    <div
      role="tooltip"
      id="etyr-tooltip"
      className={`etyr-tooltip etyr-glass ${stateClass}`}
      tabIndex={-1}
    >
      <div className="etyr-tooltip__header">
        <div className="etyr-tooltip__title">
          <span className="etyr-tooltip__word">{displayWord(query, result)}</span>
          {(state === 'showing' || state === 'error' || state === 'not-found') && result?.phonetic && (
            <span className="etyr-tooltip__phonetic">{result.phonetic}</span>
          )}
        </div>
        <HeaderControls
          state={state}
          onPronounce={onPronounce}
          onBookmark={onBookmark}
          isSaved={isSaved}
          canPronounce={canPronounce}
        />
      </div>

      <div className="etyr-tooltip__body">{content}</div>

      <div className="etyr-tooltip__footer">
        <button
          type="button"
          className="etyr-tooltip__disable"
          aria-label="Disable Etyr on this site"
          title="Disable Etyr on this site"
          onClick={onDisableSite}
        >
          <BanIcon size={12} ariaHidden={true} />
          <span>Disable on this site</span>
        </button>
      </div>
    </div>
  );
}