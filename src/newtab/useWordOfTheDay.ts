import { useState, useEffect } from 'react';
import type { SavedWord } from '@shared/types';
import { getAllSavedWords } from '@storage/bookmarks';
import { getStorageItem, setStorageItem } from '@storage/database';
import { STORAGE_KEYS } from '@shared/constants';
import { CURATED_WORDS } from '@shared/curated-words';

export function useWordOfTheDay() {
  const [word, setWord] = useState<SavedWord | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initWotd = async () => {
      try {
        const todayStr = new Date().toDateString();
        
        // 1. Process Streak Logic
        let currentStreak = await getStorageItem<number>(STORAGE_KEYS.STREAK_COUNT) || 0;
        const lastActiveStr = await getStorageItem<string>(STORAGE_KEYS.LAST_ACTIVE_DATE);
        
        if (lastActiveStr !== todayStr) {
          if (lastActiveStr) {
            const lastActiveDate = new Date(lastActiveStr);
            const todayDate = new Date(todayStr);
            const diffTime = Math.abs(todayDate.getTime() - lastActiveDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays === 1) {
              currentStreak += 1;
            } else {
              currentStreak = 1;
            }
          } else {
            currentStreak = 1;
          }
          await setStorageItem(STORAGE_KEYS.STREAK_COUNT, currentStreak);
          await setStorageItem(STORAGE_KEYS.LAST_ACTIVE_DATE, todayStr);
        }
        
        setStreak(currentStreak);

        // 2. Process WOTD Logic
        const storedWotdDate = await getStorageItem<string>(STORAGE_KEYS.WOTD_DATE);
        let storedWotdWord = await getStorageItem<SavedWord>(STORAGE_KEYS.WOTD_WORD);

        if (storedWotdDate !== todayStr || !storedWotdWord) {
          // Time to pick a new word!
          const savedWords = await getAllSavedWords();
          
          if (savedWords.length > 0) {
            // Pick a random saved word
            const randomIndex = Math.floor(Math.random() * savedWords.length);
            storedWotdWord = savedWords[randomIndex];
          } else {
            // Pick a random curated word
            const randomIndex = Math.floor(Math.random() * CURATED_WORDS.length);
            storedWotdWord = CURATED_WORDS[randomIndex];
          }
          
          await setStorageItem(STORAGE_KEYS.WOTD_WORD, storedWotdWord);
          await setStorageItem(STORAGE_KEYS.WOTD_DATE, todayStr);
        }

        setWord(storedWotdWord);
      } catch (err) {
        console.error('Failed to init WOTD:', err);
      } finally {
        setLoading(false);
      }
    };

    void initWotd();
  }, []);

  const refreshWord = async () => {
    try {
      const savedWords = await getAllSavedWords();
      let nextWord: SavedWord;
      
      if (savedWords.length > 1) {
        // Find a word that isn't the current one
        const others = savedWords.filter(w => w.id !== word?.id);
        const randomIndex = Math.floor(Math.random() * others.length);
        nextWord = others[randomIndex];
      } else if (savedWords.length === 1) {
        nextWord = savedWords[0];
      } else {
        const others = CURATED_WORDS.filter(w => w.id !== word?.id);
        const randomIndex = Math.floor(Math.random() * others.length);
        nextWord = others[randomIndex];
      }
      
      setWord(nextWord);
      await setStorageItem(STORAGE_KEYS.WOTD_WORD, nextWord);
    } catch (e) {
      console.error('Failed to refresh word', e);
    }
  };

  return { word, streak, loading, refreshWord };
}
