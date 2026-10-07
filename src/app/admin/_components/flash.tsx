import { Alert } from "@/components/ui";

/** Shows the one-off ?ok= / ?error= message left by a server action. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div className="mb-5">
      {ok && <Alert tone="success">{ok}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
