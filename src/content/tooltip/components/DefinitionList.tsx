import { useState } from 'react';
import type { DictionaryResult, Meaning } from '@shared/types';

interface DefinitionListProps {
  result: DictionaryResult;
  maxInitialMeanings?: number;
  maxSynonyms?: number;
}

const DEFAULT_MAX_INITIAL_MEANINGS = 2;
const DEFAULT_MAX_SYNONYMS = 3;

function PartOfSpeechBadge({ partOfSpeech }: { partOfSpeech: Meaning['partOfSpeech'] }) {
  return <span className="etyr-definition__pos" aria-label={`Part of speech: ${partOfSpeech}`}>{partOfSpeech}</span>;
}

function MeaningGroup({ meaning, maxSynonyms }: { meaning: Meaning; maxSynonyms: number }) {
  const hasSynonyms = meaning.definitions.some(def => def.synonyms && def.synonyms.length > 0);
  const synonyms = hasSynonyms
    ? Array.from(
        new Set(meaning.definitions.flatMap(def => def.synonyms ?? [])),
      ).slice(0, maxSynonyms)
    : [];

  const hasAntonyms = meaning.definitions.some(def => def.antonyms && def.antonyms.length > 0);
  const antonyms = hasAntonyms
    ? Array.from(
        new Set(meaning.definitions.flatMap(def => def.antonyms ?? [])),
      ).slice(0, maxSynonyms)
    : [];

  return (
    <div className="etyr-definition__meaning">
      <PartOfSpeechBadge partOfSpeech={meaning.partOfSpeech} />
      <ol className="etyr-definition__list">
        {meaning.definitions.map((def, idx) => (
          <li key={idx} className="etyr-definition__item">
            <p className="etyr-definition__text">{def.definition}</p>
            {def.example && (
              <p className="etyr-definition__example" aria-label="Example">
                "{def.example}"
              </p>
            )}
          </li>
        ))}
      </ol>
      {synonyms.length > 0 && (
        <p className="etyr-definition__synonyms">
          <span className="etyr-definition__synonyms-label">Synonyms: </span>
          {synonyms.join(', ')}
        </p>
      )}
      {antonyms.length > 0 && (
        <p className="etyr-definition__antonyms">
          <span className="etyr-definition__synonyms-label">Antonyms: </span>
          {antonyms.join(', ')}
        </p>
      )}
    </div>
  );
}

export function DefinitionList({
  result,
  maxInitialMeanings = DEFAULT_MAX_INITIAL_MEANINGS,
  maxSynonyms = DEFAULT_MAX_SYNONYMS,
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
          <MeaningGroup key={idx} meaning={meaning} maxSynonyms={maxSynonyms} />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="etyr-definition__more"
          onClick={() => setShowAll(true)}
        >
          Show {meanings.length - maxInitialMeanings} more
        </button>
      )}
    </div>
  );
}