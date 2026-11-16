import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost } from "@/modules/public-site/content/blog";
import { BlogPostPage } from "@/panels/public/pages/blog-pages";
import { PublicLayout } from "@/panels/public/layouts/public-layout";
import { Skeleton } from "@/shared/ui/skeleton";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = getBlogPost((await params).slug);
  return post ? { title: `${post.title} | AFhomes`, description: post.excerpt } : {};
}

async function Post({ params }: { params: Params }) {
  const post = getBlogPost((await params).slug);
  if (!post) notFound();
  return <BlogPostPage post={post} />;
}

export default function Page({ params }: { params: Params }) {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div role="status" aria-busy="true" className="site-post">
            <span className="tw:sr-only">Loading…</span>
            <Skeleton className="tw:h-10 tw:w-3/4" />
            <Skeleton className="tw:mt-6 tw:h-64 tw:w-full" />
          </div>
        }
      >
        <Post params={params} />
      </Suspense>
    </PublicLayout>
  );
}
