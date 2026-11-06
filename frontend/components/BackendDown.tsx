// Shown when the FastAPI backend can't be reached.
// Locally that usually means it isn't running; once deployed on Render's free
// tier, it usually means the server is waking up after sleeping.
export default function BackendDown() {
  const local = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").includes("localhost");
  return (
    <p className="rounded-lg bg-amber-50 p-4 text-amber-900">
      {local ? (
        <>
          Can&apos;t reach the backend. Start it with{" "}
          <code className="font-mono">uvicorn app.main:app --reload</code> in /backend.
        </>
      ) : (
        <>The server is waking up. This takes about a minute; refresh the page shortly.</>
      )}
    </p>
  );
}
