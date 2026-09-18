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

    let finalUrl = audioUrl;

    if (isExtensionContext() && audioUrl.startsWith('http')) {
      try {
        const response = await getBrowserAPI().runtime.sendMessage({
          action: MESSAGE_ACTIONS.PRONUNCIATION_FETCH,
          payload: { url: audioUrl }
        });
        if (response && response.ok && response.data && (response.data as any).dataUrl) {
          finalUrl = (response.data as any).dataUrl;
        } else {
          throw new Error('Proxy failed');
        }
      } catch (err) {
        throw new Error(`Failed to proxy audio: ${err}`);
      }
    }

    const audio = new Audio(finalUrl);
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
        void err;
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

  getAudioUrls(query: string, result: DictionaryResult): {
    urls: string[];
    speechWord: string;
    lang: string;
  } {
    const speechWord = result.word || query;
    const urls: string[] = [];

    // 1. Dictionary API's original audio (highest quality, human curated)
    if (result.audioUrl) {
      urls.push(result.audioUrl);
    }

    // 2. Google Translate TTS (supports phrases, names, and any word - 80% success rate)
    if (speechWord) {
      urls.push(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-us&q=${encodeURIComponent(speechWord)}`);
    }

    // 3. Speecher API (Free TTS Fallback)
    if (speechWord) {
      urls.push(`https://speecher.org/index.php?action=tts&preview=1&text=${encodeURIComponent(speechWord)}&tl=en-us&slow=0`);
    }

    // 4. Google Dictionary CDN (fallback for specific single words)
    if (speechWord) {
      const sanitized = speechWord.toLowerCase().replace(/[^a-z]/g, '');
      if (sanitized) {
        urls.push(`https://ssl.gstatic.com/dictionary/static/sounds/20250617/${sanitized}--_gb_1.mp3`);
      }
    }

    return {
      urls,
      speechWord,
      lang: 'en-US',
    };
  }

  async speak(query: string, result: DictionaryResult): Promise<void> {
    const { urls, speechWord, lang } = this.getAudioUrls(query, result);

    for (const url of urls) {
      try {
        await this.playAudio(url);
        return; // Success, exit
      } catch {
        // Failed, try the next URL in the list
      }
    }

    // If all audio URLs fail or the array is empty, fall back to native synthesis
    await this.speakWithSynthesis(speechWord, lang);
  }

  stop(): void {
    stopCurrent();
  }
}
