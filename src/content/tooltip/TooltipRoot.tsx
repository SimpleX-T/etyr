import { useEffect, useState } from 'react';
import type { DictionaryResult, TooltipState } from '@shared/types';
import { LoadingState } from './components/LoadingState';
import { DefinitionList } from './components/DefinitionList';
import { ErrorState } from './components/ErrorState';
import { SpeakerButton } from './components/SpeakerButton';
import { BookmarkButton } from './components/BookmarkButton';
import { CopyButton } from './components/CopyButton';
import { BackIcon, BanIcon, CopyIcon, CheckIcon, PanelRightIcon, SparklesIcon } from './components/icons';
import { copyTextToClipboard, formatResultForCopy } from '@shared/utils';
import type { TooltipNav } from '.';

type RenderState = Extract<TooltipState, 'loading' | 'showing' | 'error' | 'not-found'>;

export interface TooltipRootProps {
  query: string;
  result: DictionaryResult | null;
  state: RenderState;
  isSaved: boolean;
  errorMessage?: string;
  nav?: TooltipNav | null;
  showPronunciation?: boolean;
  onBookmark: () => void;
  onPronounce: () => void;
  onDismiss: () => void;
  onDisableSite: () => void;
  onOpenWord?: (query: string, label: string) => void;
  onBack?: () => void;
  onOpenSidePanel?: (word: string) => void;
}

function HeaderBreadcrumb({ nav, onBack }: { nav: TooltipNav; onBack?: () => void }) {
  const parent = nav.path.length > 0 ? nav.path[nav.path.length - 1] : null;
  return (
    <div className="etyr-tooltip__breadcrumb">
      {parent && (
        <button
          type="button"
          className="etyr-tooltip__back"
          onClick={onBack}
          title={`Back to "${parent.label}"`}
          aria-label={`Back to ${parent.label}`}
        >
          <BackIcon size={13} />
          <span className="etyr-tooltip__back-label">{parent.label}</span>
        </button>
      )}
      {nav.path.length > 1 && (
        <span className="etyr-tooltip__back-more" aria-label={`${nav.path.length - 1} more steps back`}>
          +{nav.path.length - 1}
        </span>
      )}
    </div>
  );
}

interface HeaderControlsProps {
  query: string;
  state: RenderState;
  onPronounce: () => void;
  onBookmark: () => void;
  isSaved: boolean;
  canPronounce: boolean;
  onOpenSidePanel?: (word: string) => void;
}

function HeaderControls({ query, state, onPronounce, onBookmark, isSaved, canPronounce, onOpenSidePanel }: HeaderControlsProps) {
  return (
    <div className="etyr-tooltip__controls">
      {state === 'showing' && canPronounce && (
        <SpeakerButton playing={false} onPlay={onPronounce} />
      )}
      {state === 'showing' && onOpenSidePanel && (
        <button
          type="button"
          className="etyr-icon-btn etyr-tooltip__sidepanel-btn"
          onClick={() => onOpenSidePanel(query)}
          title="Open in side panel"
          aria-label="Open in side panel"
        >
          <PanelRightIcon size={15} ariaHidden={true} />
        </button>
      )}
      <CopyButton text={query} />
      <BookmarkButton saved={isSaved} onToggle={onBookmark} disabled={state !== 'showing'} />
    </div>
  );
}

function displayWord(query: string, result: DictionaryResult | null, nav: TooltipNav | null): string {
  if (result?.word) return result.word;
  if (nav && nav.current.label) return nav.current.label;
  return query;
}

export function TooltipRoot({
  query,
  result,
  state,
  isSaved,
  errorMessage,
  nav = null,
  showPronunciation = true,
  onBookmark,
  onPronounce,
  onDismiss,
  onDisableSite,
  onOpenWord,
  onBack,
  onOpenSidePanel,
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

  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyEntry = async (): Promise<void> => {
    if (!result || copiedAll) return;
    if (await copyTextToClipboard(formatResultForCopy(result))) {
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 1400);
    }
  };

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
      content = result ? (
        <DefinitionList result={result} onOpenWord={onOpenWord} />
      ) : (
        <ErrorState notFound />
      );
      stateClass = 'etyr-tooltip--showing';
      break;
    case 'not-found':
      content = <ErrorState notFound />;
      stateClass = 'etyr-tooltip--error';
      break;
    case 'error':
      content = <ErrorState message={errorMessage || "Something went wrong. Check your connection."} />;
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
          {nav && <HeaderBreadcrumb nav={nav} onBack={onBack} />}
          <span className="etyr-tooltip__word">{displayWord(query, result, nav)}</span>
          {(state === 'showing' || state === 'error' || state === 'not-found') && result?.phonetic && (
            <span className="etyr-tooltip__phonetic">{result.phonetic}</span>
          )}
          {state === 'showing' && result?.source === 'ai' && (
            <div className="etyr-tooltip__ai-badge" title="Powered by advanced word search algorithm">
              <SparklesIcon size={12} />
              <span>AI Definition</span>
            </div>
          )}
        </div>
        <HeaderControls
          query={nav ? displayWord(query, result, nav) : query}
          state={state}
          onPronounce={onPronounce}
          onBookmark={onBookmark}
          isSaved={isSaved}
          canPronounce={canPronounce}
          onOpenSidePanel={onOpenSidePanel}
        />
      </div>

      <div className="etyr-tooltip__body">{content}</div>

      <div className="etyr-tooltip__footer">
        <div className="etyr-tooltip__footer-left">
        <button
          type="button"
          className="etyr-tooltip__action etyr-tooltip__copy-entry"
          aria-label={copiedAll ? 'Entry copied to clipboard' : 'Copy full entry'}
          title={copiedAll ? 'Entry copied to clipboard' : 'Copy full entry'}
          onClick={handleCopyEntry}
          disabled={!result}
        >
          {copiedAll ? <CheckIcon size={12} ariaHidden={true} /> : <CopyIcon size={12} ariaHidden={true} />}
          <span>{copiedAll ? 'Copied' : 'Copy'}</span>
        </button>
        <a
          href={`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(displayWord(query, result, nav))}&op=translate`}
          target="_blank"
          rel="noopener noreferrer"
          className="etyr-tooltip__action etyr-tooltip__translate"
          title="Translate word"
        >
          Translate
        </a>
        </div>
        <button
          type="button"
          className="etyr-tooltip__disable"
          aria-label="Disable Etyr on this site"
          title="Disable Etyr on this site"
          onClick={onDisableSite}
        >
          <BanIcon size={12} ariaHidden={true} />
          <span>Disable</span>
        </button>
      </div>
    </div>
  );
}