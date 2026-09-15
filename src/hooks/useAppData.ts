import { useEffect, useMemo, useState } from 'react';
import { emptyAppData, loadAppData, saveAppData } from '../services/storage/appStorage';
import type { AppData } from '../types/app';

export function useAppData() {
  const initial = useMemo(() => loadAppData(), []);
  const [data, setData] = useState<AppData>(initial.data);
  const [storageError, setStorageError] = useState<string | undefined>(initial.error);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const result = saveAppData(data);
    setStorageError(result.error);
  }, [data, isReady]);

  function replaceData(nextData: AppData): void {
    setData(nextData);
  }

  function resetData(): void {
    setData(emptyAppData);
  }

  return { data, setData, replaceData, resetData, storageError };
}
