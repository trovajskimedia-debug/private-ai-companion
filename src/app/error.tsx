"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="gate">
      <div className="gate-card">
        <h1>Let’s try that again.</h1>
        <p>
          The page could not load. Your saved companions are still in your
          database.
        </p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
