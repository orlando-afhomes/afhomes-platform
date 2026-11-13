import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header__content">
        <span className="public-header__brand">AFhomes</span>
        <nav className="public-header__nav" aria-label="Public">
          <Link href="/" className="public-header__nav-link">
            Home
          </Link>
          <Link href="/login" className="public-header__nav-link">
            Login
          </Link>
          <Link href="/login/sales" className="public-header__nav-link">
            Sales sign-in
          </Link>
          <Link href="/verify" className="public-header__nav-link">
            Verify accreditation
          </Link>
        </nav>
      </div>
    </header>
  );
}
