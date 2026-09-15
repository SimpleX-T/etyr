export function LoadingState() {
  return (
    <div className="etyr-loading etyr-shimmer-container" role="status" aria-live="polite" aria-busy="true">
      <div className="etyr-shimmer etyr-shimmer-badge" aria-hidden="true" />
      <div className="etyr-shimmer etyr-shimmer-line" aria-hidden="true" style={{ width: '80%' }} />
      <div className="etyr-shimmer etyr-shimmer-line" aria-hidden="true" style={{ width: '60%' }} />
    </div>
  );
}