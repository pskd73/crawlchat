export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 max-w-md">
      {icon && <div className="text-8xl opacity-50">{icon}</div>}
      <h1 className="text-2xl font-bold text-center">{title}</h1>
      <p className="text-sm text-gray-500 mb-2 text-center">{description}</p>
      {children}
    </div>
  );
}
