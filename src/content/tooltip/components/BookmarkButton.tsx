import { HeartIcon } from './icons';

interface BookmarkButtonProps {
  saved?: boolean;
  disabled?: boolean;
  onToggle(): void;
}

export function BookmarkButton({
  saved = false,
  disabled = false,
  onToggle,
}: BookmarkButtonProps) {
  return (
    <button
      type="button"
      className={`etyr-icon-btn etyr-bookmark${saved ? ' etyr-bookmark--saved' : ''}`}
      aria-label={saved ? 'Remove from saved words' : 'Save word'}
      aria-pressed={saved}
      disabled={disabled}
      onClick={onToggle}
      title={saved ? 'Remove from saved words' : 'Save word'}
    >
      <HeartIcon
        size={16}
        ariaHidden={true}
        fill={saved ? 'currentColor' : 'none'}
      />
    </button>
  );
}