import { useState } from 'react';
import type { DictionaryResult, Definition, Meaning } from '@shared/types';
import { splitDefinitionSegments, formatDefinition, formatQuote } from '@shared/utils';
import { CopyTextButton } from './CopyTextButton';

interface DefinitionListProps {
  result: DictionaryResult;
  maxInitialMeanings?: number;
  maxSynonyms?: number;
  onOpenWord?: (query: string, label: string) => void;
}

const DEFAULT_MAX_INITIAL_MEANINGS = 2;
const DEFAULT_MAX_SYNONYMS = 6;
const DEFAULT_MAX_EXAMPLES = 3;

function PartOfSpeechBadge({ partOfSpeech }: { partOfSpeech: Meaning['partOfSpeech'] }) {
  return <span className="etyr-definition__pos" aria-label={`Part of speech: ${partOfSpeech}`}>{partOfSpeech}</span>;
}

function DefinitionText({ def, onOpenWord }: { def: Definition; onOpenWord: DefinitionListProps['onOpenWord'] }) {
  const segments = splitDefinitionSegments(def.definition, def.linkedWords);
  return (
    <p className="etyr-definition__text">
      {segments.map((segment, idx) =>
        segment.type === 'link' ? (
          <button
            key={idx}
            type="button"
            className="etyr-definition__link"
            title={`Look up "${segment.text}"`}
            onClick={() => onOpenWord?.(segment.query, segment.text)}
          >
            {segment.text}
          </button>
        ) : (
          <span key={idx}>{segment.text}</span>
        ),
      )}
      {def.tags && def.tags.length > 0 && (
        <span className="etyr-definition__tags" aria-label="Sense tags">
          {def.tags.map(tag => (
            <span key={tag} className="etyr-definition__tag">{tag}</span>
          ))}
        </span>
      )}
    </p>
  );
}

function ExpandableExamples({ examples }: { examples: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? examples : examples.slice(0, DEFAULT_MAX_EXAMPLES);
  const hidden = examples.length - visible.length;

  if (examples.length === 0) return null;

  return (
    <div className="etyr-definition__examples">
      {visible.map((example, idx) => (
        <p key={idx} className="etyr-definition__example" aria-label="Example">
          &ldquo;{example}&rdquo;
        </p>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          className="etyr-definition__more"
          onClick={() => setShowAll(true)}
        >
          Show {hidden} more example{hidden > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

function ExpandableQuotes({ def }: { def: Definition }) {
  const [showAll, setShowAll] = useState(false);
  if (!def.quotes || def.quotes.length === 0) return null;

  const visible = showAll ? def.quotes : def.quotes.slice(0, 1);
  const hidden = def.quotes.length - visible.length;

  return (
    <div className="etyr-definition__quotes">
      {visible.map((quote, idx) => (
        <div key={idx} className="etyr-definition__quote-row">
          <blockquote className="etyr-definition__quote" cite={quote.reference}>
            <p className="etyr-definition__quote-text" title={quote.text}>
              &ldquo;{quote.text}&rdquo;
            </p>
            {quote.reference && (
              <cite className="etyr-definition__quote-ref">{quote.reference}</cite>
            )}
          </blockquote>
          <CopyTextButton
            text={formatQuote(quote)}
            title="Copy quote and source"
            copiedTitle="Quote copied"
            className="etyr-definition__copy-quote"
          />
        </div>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          className="etyr-definition__more"
          onClick={() => setShowAll(true)}
        >
          Show {hidden} more quote{hidden > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

function SenseItem({
  def,
  depth,
  onOpenWord,
}: {
  def: Definition;
  depth: number;
  onOpenWord: DefinitionListProps['onOpenWord'];
}) {
  return (
    <li className={`etyr-definition__item etyr-definition__item--depth-${depth}`}>
      <div className="etyr-definition__sense-row">
        <DefinitionText def={def} onOpenWord={onOpenWord} />
        <CopyTextButton
          text={formatDefinition(def)}
          title="Copy definition"
          copiedTitle="Definition copied"
          className="etyr-definition__copy-sense"
        />
      </div>
      <ExpandableExamples examples={def.examples ?? (def.example ? [def.example] : [])} />
      <ExpandableQuotes def={def} />
      {def.subsenses && def.subsenses.length > 0 && (
        <ul className="etyr-definition__subsenses">
          {def.subsenses.map((sub, idx) => (
            <SenseItem key={idx} def={sub} depth={depth + 1} onOpenWord={onOpenWord} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ChipRow({
  label,
  words,
  max,
  onOpenWord,
}: {
  label: string;
  words: string[];
  max: number;
  onOpenWord: DefinitionListProps['onOpenWord'];
}) {
  const [showAll, setShowAll] = useState(false);
  if (words.length === 0) return null;

  const visible = showAll ? words : words.slice(0, max);
  const hidden = words.length - visible.length;

  return (
    <p className={`etyr-definition__wordlist etyr-definition__wordlist--${label.toLowerCase()}`}>
      <span className="etyr-definition__wordlist-label">{label}: </span>
      {visible.map((word) => (
        <button
          key={word}
          type="button"
          className="etyr-definition__chip"
          title={`Look up "${word}"`}
          onClick={() => onOpenWord?.(word, word)}
        >
          {word}
        </button>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          className="etyr-definition__more etyr-definition__more--inline"
          onClick={() => setShowAll(true)}
        >
          +{hidden} more
        </button>
      )}
    </p>
  );
}

function MeaningGroup({ meaning, maxSynonyms, onOpenWord }: { meaning: Meaning; maxSynonyms: number; onOpenWord: DefinitionListProps['onOpenWord'] }) {
  const collect = (field: 'synonyms' | 'antonyms'): string[] => {
    const collected: string[] = [];
    if (meaning[field] && meaning[field].length > 0) collected.push(...(meaning[field] as string[]));
    const walk = (defs: Definition[]): void => {
      for (const def of defs) {
        if (def[field] && (def[field] as string[]).length > 0) collected.push(...(def[field] as string[]));
        if (def.subsenses && def.subsenses.length > 0) walk(def.subsenses);
      }
    };
    walk(meaning.definitions);
    return Array.from(new Set(collected));
  };

  const synonyms = collect('synonyms');
  const antonyms = collect('antonyms');

  return (
    <div className="etyr-definition__meaning">
      <div className="etyr-definition__meaning-head">
        <PartOfSpeechBadge partOfSpeech={meaning.partOfSpeech} />
        {meaning.forms && meaning.forms.length > 0 && (
          <span className="etyr-definition__forms" aria-label="Word forms">
            {meaning.forms.map(form => (
              <span key={form.word + (form.tags?.[0] ?? '')} className="etyr-definition__form">
                {form.tags?.[0] && <span className="etyr-definition__form-tag">{form.tags[0]}</span>}
                {form.word}
              </span>
            ))}
          </span>
        )}
      </div>

      <ol className="etyr-definition__list">
        {meaning.definitions.map((def, idx) => (
          <SenseItem key={idx} def={def} depth={0} onOpenWord={onOpenWord} />
        ))}
      </ol>

      <ChipRow label="Synonyms" words={synonyms} max={maxSynonyms} onOpenWord={onOpenWord} />
      <ChipRow label="Antonyms" words={antonyms} max={maxSynonyms} onOpenWord={onOpenWord} />
    </div>
  );
}

export function DefinitionList({
  result,
  maxInitialMeanings = DEFAULT_MAX_INITIAL_MEANINGS,
  maxSynonyms = DEFAULT_MAX_SYNONYMS,
  onOpenWord,
}: DefinitionListProps) {
  const [showAll, setShowAll] = useState(false);
  const meanings = result.meanings;
  const visibleMeanings = showAll ? meanings : meanings.slice(0, maxInitialMeanings);
  const hasMore = !showAll && meanings.length > maxInitialMeanings;

  if (meanings.length === 0) {
    return null;
  }

  return (
    <div className="etyr-definition">
      <div className="etyr-definition__meanings">
        {visibleMeanings.map((meaning, idx) => (
          <MeaningGroup key={idx} meaning={meaning} maxSynonyms={maxSynonyms} onOpenWord={onOpenWord} />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="etyr-definition__more"
          onClick={() => setShowAll(true)}
        >
          Show {meanings.length - maxInitialMeanings} more sense{meanings.length - maxInitialMeanings > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}