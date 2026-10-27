import Link from "next/link";
import "./not-found.css";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <h1 className="not-found-page__title">Page not found</h1>
      <p className="not-found-page__description">
        The page you requested does not exist or is not available.
      </p>
      <div className="not-found-page__actions">
        <Link href="/" className="not-found-page__action-link">
          Return home
        </Link>
        <Link href="/admin" className="not-found-page__action-link">
          Administration
        </Link>
      </div>
    </main>
  );
}
