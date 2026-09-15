import { SpeakerIcon } from './icons';

interface SpeakerButtonProps {
  playing?: boolean;
  disabled?: boolean;
  onPlay(): void;
}

export function SpeakerButton({
  playing = false,
  disabled = false,
  onPlay,
}: SpeakerButtonProps) {
  return (
    <button
      type="button"
      className={`etyr-icon-btn etyr-speaker${playing ? ' etyr-speaker--playing' : ''}`}
      aria-label={playing ? 'Stop pronunciation' : 'Play pronunciation'}
      aria-pressed={playing}
      disabled={disabled}
      onClick={onPlay}
      title={playing ? 'Stop pronunciation' : 'Play pronunciation'}
    >
      <SpeakerIcon size={16} ariaHidden={true} />
      {playing && (
        <span className="etyr-speaker__bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
    </button>
  );
}