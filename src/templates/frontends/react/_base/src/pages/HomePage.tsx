import { useHelloQuery } from '@/lib/queries';
// {{EXTRA_HOME_IMPORTS}}

export function HomePage() {
  const { data, isLoading } = useHelloQuery();

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{{PROJECT_NAME}}</h1>
        <p className="text-muted-foreground text-sm">React + NestJS template</p>
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Connecting to API...</p>
      )}

      {data && (
        <div className="bg-muted rounded-md px-4 py-2 font-mono text-xs">
          API: {data.message}
        </div>
      )}
      {/* {{EXTRA_HOME_LINKS}} */}
    </div>
  );
}
