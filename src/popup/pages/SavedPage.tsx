import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Volume2,
  Trash2,
  Download,
  Upload,
  BookmarkCheck,
  Search as SearchIcon,
} from 'lucide-react';
import type { DictionaryResult, SavedWord } from '@shared/types';
import { MESSAGE_ACTIONS } from '@shared/constants';
import { sendMessage } from '@shared/messaging';
import { truncate } from '@shared/utils';
import { speakPronunciation } from '../components/SearchResult';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function downloadBlob(content: string, fileName: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SavedPage() {
  const [words, setWords] = useState<SavedWord[]>([]);
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* -- load -------------------------------------------------------- */

  const loadWords = useCallback(async () => {
    const res = await sendMessage<SavedWord[]>({
      action: MESSAGE_ACTIONS.BOOKMARK_GET_ALL,
    });
    if (res?.ok === true && Array.isArray(res.data)) {
      setWords(res.data);
    }
  }, []);

  useEffect(() => {
    void loadWords();
  }, [loadWords]);

  /* -- derived ----------------------------------------------------- */

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return words;
    return words.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q),
    );
  }, [words, filter]);

  /* -- actions ----------------------------------------------------- */

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await sendMessage({
        action: MESSAGE_ACTIONS.BOOKMARK_REMOVE,
        payload: { id },
      });
      if (res?.ok === true) {
        setWords((prev) => prev.filter((w) => w.id !== id));
      }
    },
    [],
  );

  const handleSpeak = useCallback((word: SavedWord) => {
    const asResult: DictionaryResult = {
      query: word.query,
      word: word.word,
      audioUrl: word.audioUrl,
      phonetic: word.phonetic,
      source: word.source,
      meanings: [],
      timestamp: word.savedAt,
    };
    void speakPronunciation(word.query, asResult);
  }, []);

  const exportJSON = useCallback(async () => {
    setStatus('Exporting\u2026');
    const res = await sendMessage<{ json: string; count: number }>({
      action: MESSAGE_ACTIONS.EXPORT_SAVED,
    });
    if (res?.ok === true && res.data) {
      downloadBlob(res.data.json, `etyr-saved-words.json`, 'application/json');
      setStatus(`Exported ${res.data.count} words as JSON.`);
    } else {
      setStatus('Export failed.');
    }
  }, []);

  const exportCSV = useCallback(async () => {
    setStatus('Exporting\u2026');
    const res = await sendMessage<{ csv: string; count: number }>({
      action: MESSAGE_ACTIONS.EXPORT_SAVED,
    });
    if (res?.ok === true && res.data) {
      downloadBlob(res.data.csv, 'etyr-saved-words.csv', 'text/csv');
      setStatus(`Exported ${res.data.count} words as CSV.`);
    } else {
      setStatus('Export failed.');
    }
  }, []);

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      setStatus('Importing\u2026');
      try {
        const text = await file.text();
        const parsed: unknown = JSON.parse(text);
        const data = Array.isArray(parsed)
          ? parsed
          : Array.isArray((parsed as Record<string, unknown>).words)
            ? (parsed as { words: unknown[] }).words
            : null;

        if (!data) {
          throw new Error('Unrecognised file format. Expected a JSON array.');
        }

        const res = await sendMessage<{ imported: number; total: number }>({
          action: MESSAGE_ACTIONS.IMPORT_SAVED,
          payload: { data },
        });

        if (res?.ok === true && res.data) {
          setStatus(
            `Imported ${res.data.imported} words (${res.data.total} total).`,
          );
          void loadWords();
        } else {
          setStatus(res?.error?.message ?? 'Import failed.');
        }
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Import failed.');
      }
    },
    [loadWords],
  );

  /* -- render ----------------------------------------------------- */

  return (
    <div className="saved">
      <div className="filter-bar">
        <SearchIcon size={14} className="search-icon" />
        <input
          className="filter-input"
          type="text"
          placeholder="Filter saved words\u2026"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      <div className="saved-toolbar">
        <button className="btn" onClick={() => void exportJSON()}>
          <Download size={13} /> JSON
        </button>
        <button className="btn" onClick={() => void exportCSV()}>
          <Download size={13} /> CSV
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          <Upload size={13} /> Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden-input"
          onChange={handleImportFile}
        />
      </div>

      {status && <div className="status">{status}</div>}

      {words.length === 0 && (
        <div className="empty-state">
          <BookmarkCheck size={28} className="empty-icon" />
          <p>No saved words yet.</p>
        </div>
      )}

      {words.length > 0 && filtered.length === 0 && (
        <div className="empty-state">
          <p>No matches for &ldquo;{filter}&rdquo;.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="saved-list">
          {filtered.map((w) => (
            <li key={w.id} className="saved-item">
              <div className="saved-body">
                <div className="saved-head">
                  <span className="saved-word">{w.word}</span>
                  {w.partOfSpeech && (
                    <span className="pos-badge">{w.partOfSpeech}</span>
                  )}
                </div>
                <p className="saved-snippet">
                  {truncate(w.definition, 120)}
                </p>
              </div>

              <div className="saved-actions">
                <button
                  className="icon-btn"
                  onClick={() => handleSpeak(w)}
                  aria-label={`Pronounce ${w.word}`}
                >
                  <Volume2 size={14} />
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => void handleDelete(w.id)}
                  aria-label={`Remove ${w.word}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}