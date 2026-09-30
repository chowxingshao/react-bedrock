/* eslint-disable react/jsx-no-literals -- Developer-facing, dev-only screen shown before i18n can be trusted (spec §4). */

interface ConfigErrorScreenProps {
  issues: readonly string[];
}

/** Full-screen error shown in development when environment validation fails (spec §4). */
export function ConfigErrorScreen({ issues }: ConfigErrorScreenProps) {
  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div role="alert">
        <h1 className="text-2xl font-semibold text-destructive">Invalid configuration</h1>
        <p className="mt-2 text-muted-foreground">
          Fix these variables in <code>.env.local</code> (see <code>.env.example</code>) or in the
          runtime <code>config.js</code>, then reload.
        </p>
        <ul className="mt-6 list-disc space-y-2 pl-6 font-mono text-sm">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
