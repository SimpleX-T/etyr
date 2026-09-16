import { useState } from 'react';
import { CopyIcon, CheckIcon } from './icons';
import { copyTextToClipboard } from '@shared/utils';

export { copyTextToClipboard };

interface CopyButtonProps {
  text: string;
  disabled?: boolean;
  copiedLabel?: string;
  copyLabel?: string;
}

export function CopyButton({
  text,
  disabled = false,
  copiedLabel = 'Copied to clipboard',
  copyLabel = 'Copy selection',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    if (!text || copied) return;
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <button
      type="button"
      className={`etyr-icon-btn etyr-copy${copied ? ' etyr-copy--copied' : ''}`}
      aria-label={copied ? copiedLabel : copyLabel}
      aria-live="polite"
      disabled={disabled}
      onClick={handleCopy}
      title={copied ? copiedLabel : copyLabel}
    >
      {copied ? (
        <CheckIcon size={15} ariaHidden={true} />
      ) : (
        <CopyIcon size={15} ariaHidden={true} />
      )}
    </button>
  );
}