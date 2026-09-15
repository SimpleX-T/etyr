import type { DictionaryResult } from '../shared/types';
import { MESSAGE_ACTIONS } from '../shared/constants';
import { getBrowserAPI, isExtensionContext } from '../browser/types';

let currentAudio: HTMLAudioElement | null = null;

function stopCurrent(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
}

export class PronunciationService {
  async playAudio(audioUrl: string): Promise<void> {
    stopCurrent();

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    return new Promise((resolve, reject) => {
      audio.addEventListener('ended', () => {
        if (currentAudio === audio) currentAudio = null;
        resolve();
      });

      audio.addEventListener('error', () => {
        if (currentAudio === audio) currentAudio = null;
        reject(new Error(`Failed to play audio: ${audioUrl}`));
      });

      audio.play().catch(err => {
        if (currentAudio === audio) currentAudio = null;
        reject(err);
      });
    });
  }

  async speakWithSynthesis(word: string, lang: string = 'en-US'): Promise<void> {
    stopCurrent();

    if (isExtensionContext()) {
      try {
        await getBrowserAPI().runtime.sendMessage({
          action: MESSAGE_ACTIONS.PRONUNCIATION_SPEAK,
          payload: { query: word },
        });
        return;
      } catch (err) {
        // Fall back to local synthesis if message fails
      }
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = lang;
      utterance.rate = 0.9;

      utterance.addEventListener('end', () => resolve());
      utterance.addEventListener('error', (e) => {
        reject(new Error(`Speech synthesis failed: ${e.error || 'unknown'}`));
      });

      window.speechSynthesis.speak(utterance);
    });
  }

  getAudioResult(query: string, result: DictionaryResult): {
    audioUrl: string | null;
    speechWord: string;
    lang: string;
  } {
    return {
      audioUrl: result.audioUrl || null,
      speechWord: result.word || query,
      lang: 'en-US',
    };
  }

  async speak(query: string, result: DictionaryResult): Promise<void> {
    const { audioUrl, speechWord, lang } = this.getAudioResult(query, result);

    if (audioUrl) {
      try {
        await this.playAudio(audioUrl);
        return;
      } catch {
        await this.speakWithSynthesis(speechWord, lang);
      }
    } else {
      await this.speakWithSynthesis(speechWord, lang);
    }
  }

  stop(): void {
    stopCurrent();
  }
}
