import { BLOG_POSTS, type BlogPost } from "@/modules/public-site/content/blog";
import { Section } from "../site/blocks";
import { PostHero } from "../post/post-hero";
import { PostBody } from "../post/post-body";
import { PostSidebar } from "../post/post-sidebar";
import { PostClosing } from "../post/post-closing";
import { PostNav } from "../post/post-nav";
import { PostRelated } from "../post/post-related";
import { PostCta } from "../post/post-cta";
import "../post/post-layout.css";
import "../post/post-hero.css";
import "../post/post-body.css";
import "../post/post-sidebar.css";
import "../post/post-closing.css";
import "../post/post-related.css";
import { BlogHero } from "../blog/blog-hero";
import { BlogBrowser } from "../blog/blog-browser";
import "../blog/blog-hero.css";
import "../blog/blog-browser.css";
import "../blog/blog-featured.css";
import "../blog/blog-card.css";
import "../blog/blog-meta.css";

/**
 * Blog index, laid out from the owner's Blog reference design.
 * The wrapper reuses the Home page styling (`site-home`); `site-blog-page` marks this page for its own tweaks and the header's "Blog" underline.
 */
export function BlogPage() {
  return (
    <div className="site-home site-blog-page">
      <BlogHero />
      <BlogBrowser posts={BLOG_POSTS} />
    </div>
  );
}

/**
 * One blog post, laid out from the owner's blog post reference design: hero, the article with a sidebar,
 * the closing contact card, older/newer links, related stories and a closing band.
 * The wrapper reuses the Home page styling (`site-home`); `site-post-page` marks it for the header's "Blog" underline.
 */
export function BlogPostPage({ post }: { post: BlogPost }) {
  return (
    <div className="site-home site-post-page">
      <PostHero post={post} />
      <Section className="post-layout">
        <div className="post-layout__grid">
          <PostBody post={post} />
          <PostSidebar post={post} />
        </div>
        {post.closing ? <PostClosing post={post} /> : null}
        <PostNav post={post} />
        <PostRelated post={post} />
      </Section>
      <PostCta />
    </div>
  );
}
