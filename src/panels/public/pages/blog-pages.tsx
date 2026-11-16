import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BLOG_POSTS, formatBlogDate, type BlogBlock, type BlogPost } from "@/modules/public-site/content/blog";
import { OFFICES, SITE } from "@/modules/public-site/content/site";
import { PUBLIC_SUPPORT_INFO } from "@/modules/public-site/support-info";
import { Photo, SiteButton } from "../site/blocks";
import { BlogIndex } from "../site/blog-index";

export function BlogPage() {
  return (
    <>
      <section className="site-hero">
        <div className="site-hero__inner site-hero__inner--center">
          <div className="site-hero__text">
            <p className="site-eyebrow">Your complete guide to resort living, updates and exclusive offers</p>
            <h1 className="site-hero__title">AFhomes Lifestyle Blog</h1>
            <p className="site-hero__lede">News from our team, our events and our resort, in one place.</p>
          </div>
        </div>
      </section>
      <section className="site-section">
        <div className="site-section__inner">
          <BlogIndex posts={BLOG_POSTS} />
        </div>
      </section>
    </>
  );
}

function renderBlock(block: BlogBlock, index: number) {
  switch (block.type) {
    case "h2": return <h2 key={index}>{block.text}</h2>;
    case "h3": return <h3 key={index}>{block.text}</h3>;
    case "lead": return <p key={index} className="site-prose__lead">{block.text}</p>;
    case "sign": return <p key={index} className="site-prose__sign">{block.text}</p>;
    case "list": return <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
    default: return <p key={index}>{block.text}</p>;
  }
}

function PostClosing({ kind }: { kind: NonNullable<BlogPost["closing"]> }) {
  const info = PUBLIC_SUPPORT_INFO;
  const heading = kind === "experience" ? "Experience AFhomes" : kind === "vip" ? "Ready to begin your VIP journey?" : "Visit or contact us today";
  const text =
    kind === "experience" ? "Discover the beauty, comfort, and hospitality that make AFhomes truly special."
    : kind === "vip" ? "Get in touch with us through any of these convenient channels."
    : "We would love to hear from you.";
  const office = OFFICES[0];
  return (
    <aside className="site-post-closing" aria-label={heading}>
      <h2>{heading}</h2>
      <p>{text}</p>
      <ul>
        <li><strong>Visit our office:</strong> {office.name}, {office.lines.join(", ")}. {office.landmark}.</li>
        <li><strong>Mobile:</strong> <a href={info.phoneHref}>{info.phone}</a></li>
        <li><strong>Email:</strong> <a href={`mailto:${info.email}`}>{info.email}</a></li>
        <li><a href={SITE.facebookUrl} target="_blank" rel="noopener noreferrer">Send us a message on our Facebook page</a></li>
      </ul>
      {kind === "vip" ? <p className="site-prose__sign">Discover your perfect homestyle vacation at AFhomes with the VIP Privilege Loyalty Program.</p> : null}
      {kind === "experience" ? <p className="site-prose__sign">{SITE.slogan}.</p> : null}
    </aside>
  );
}

export function BlogPostPage({ post }: { post: BlogPost }) {
  const index = BLOG_POSTS.findIndex((item) => item.slug === post.slug);
  const newer = index > 0 ? BLOG_POSTS[index - 1] : null;
  const older = index < BLOG_POSTS.length - 1 ? BLOG_POSTS[index + 1] : null;
  return (
    <article className="site-post">
      <header className="site-post__header">
        <Link href="/blog" className="site-post__back"><ArrowLeft aria-hidden="true" className="site-post__back-icon" />All posts</Link>
        <p className="site-post__meta">
          <time dateTime={post.date}>{formatBlogDate(post.date)}</time> · {post.categories.join(", ")} · By AFhomes
        </p>
        <h1 className="site-post__title">{post.title}</h1>
      </header>
      <Photo image={post.cover} ratio="16 / 9" priority className="site-post__cover" sizes="(min-width: 1024px) 900px, 100vw" />
      <div className="site-prose site-prose--post">
        {post.blocks.map(renderBlock)}
      </div>
      {post.closing ? <PostClosing kind={post.closing} /> : null}
      <nav className="site-post__nav" aria-label="More posts">
        {older ? <Link href={`/blog/${older.slug}`} className="site-post__nav-link"><span>Older post</span>{older.title}</Link> : <span />}
        {newer ? <Link href={`/blog/${newer.slug}`} className="site-post__nav-link site-post__nav-link--next"><span>Newer post</span>{newer.title}</Link> : <span />}
      </nav>
      <div className="site-center"><SiteButton href="/blog" variant="outline">Back to the blog</SiteButton></div>
    </article>
  );
}
