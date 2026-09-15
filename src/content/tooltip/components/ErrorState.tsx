interface ErrorStateProps {
  message?: string;
  notFound?: boolean;
}

export function ErrorState({ message, notFound = false }: ErrorStateProps) {
  const title = notFound
    ? "Couldn't find a definition"
    : message ?? 'Something went wrong';

  return (
    <div className="etyr-error" role="alert">
      <p className="etyr-error__title">{title}</p>
      {notFound && <p className="etyr-error__hint">Try another selection</p>}
    </div>
  );
}