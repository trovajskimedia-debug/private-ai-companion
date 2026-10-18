import Link from "next/link";
export default function NotFound() {
  return (
    <main className="gate">
      <div className="gate-card">
        <h1>A little off the path.</h1>
        <p>This page doesn’t exist.</p>
        <Link className="button primary" href="/">
          Back to your space
        </Link>
      </div>
    </main>
  );
}
