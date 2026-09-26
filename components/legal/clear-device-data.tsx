'use client';

import { Trash2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { buttonClass } from '@/components/ui/button';

/**
 * Removes everything the store kept in this browser, then reloads so the
 * page (and the saved-items count) starts fresh.
 */
export function ClearDeviceData() {
  const cleared = useSearchParams().get('cleared') === '1';
  const clear = () => {
    try {
      for (const key of Object.values(STORAGE_KEYS))
        localStorage.removeItem(key);
    } catch {
      // Storage blocked (private mode): there was nothing stored to clear.
    }
    window.location.replace('/cookies?cleared=1#your-choices');
  };

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={clear}
        className={buttonClass('secondary', 'lg', 'justify-center sm:w-fit')}
      >
        <Trash2 aria-hidden="true" className="size-4" /> Clear saved items and
        PC build on this device
      </button>
      <output className="block text-sm text-ok">
        {cleared
          ? 'Done: nothing from this store is stored in this browser.'
          : ''}
      </output>
    </div>
  );
}
