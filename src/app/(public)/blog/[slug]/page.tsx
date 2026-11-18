import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost } from "@/modules/public-site/content/blog";
import { BlogPostPage } from "@/panels/public/pages/blog-pages";
import { PublicArticleSkeleton } from "@/panels/public/components/public-skeletons";

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
    <Suspense fallback={<PublicArticleSkeleton />}>
      <Post params={params} />
    </Suspense>
  );
}
