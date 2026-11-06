// Shown when the FastAPI backend isn't running or can't be reached.
export default function BackendDown() {
  return (
    <p className="rounded-lg bg-amber-50 p-4 text-amber-900">
      Can&apos;t reach the backend. Start it with{" "}
      <code className="font-mono">uvicorn app.main:app --reload</code> in
      /backend.
    </p>
  );
}
