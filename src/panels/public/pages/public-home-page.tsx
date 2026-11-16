import Link from "next/link";

export function PublicHomePage() {
  return (
    <section className="public-home">
      <h1 className="public-home__title">AFhomes</h1>
      <p className="public-home__description">
        Welcome to the AFhomes Platform.
      </p>
      <nav className="public-home__links" aria-label="Get started">
        <Link href="/login/sales" className="public-home__link">
          Sales Sign-In
        </Link>
        <Link href="/verify" className="public-home__link">
          Verify Accreditation
        </Link>
      </nav>
    </section>
  );
}
