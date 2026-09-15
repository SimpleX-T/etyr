export function LoadingState() {
  return (
    <div className="etyr-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="etyr-loading__spinner-wrap">
        <div className="etyr-loading__spinner" aria-hidden="true" />
      </div>
      <div className="etyr-loading__content">
        <span className="etyr-loading__title">Finding it…</span>
      </div>
    </div>
  );
}