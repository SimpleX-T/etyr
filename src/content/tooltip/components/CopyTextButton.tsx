import { useState } from 'react';
import { CopyIcon, CheckIcon } from './icons';
import { copyTextToClipboard } from '@shared/utils';

interface CopyTextButtonProps {
  text: string;
  className?: string;
  title?: string;
  copiedTitle?: string;
}

export function CopyTextButton({
  text,
  className = '',
  title = 'Copy',
  copiedTitle = 'Copied to clipboard',
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    if (!text || copied) return;
    if (await copyTextToClipboard(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <button
      type="button"
      className={`etyr-copy-text${copied ? ' is-copied' : ''}${className ? ` ${className}` : ''}`}
      aria-label={copied ? copiedTitle : title}
      aria-live="polite"
      title={copied ? copiedTitle : title}
      onClick={handleCopy}
    >
      {copied ? <CheckIcon size={13} ariaHidden={true} /> : <CopyIcon size={13} ariaHidden={true} />}
    </button>
  );
}