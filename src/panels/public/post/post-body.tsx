import { blogHeadingId, type BlogBlock, type BlogPost } from "@/modules/public-site/content/blog";

function PostBlock({ block, first }: { block: BlogBlock; first: boolean }) {
  switch (block.type) {
    case "lead":
    case "h2":
      return (
        <h2 id={blogHeadingId(block.text)} className={first ? "post-body__heading post-body__heading--first" : "post-body__heading"}>
          {block.text}
        </h2>
      );
    case "h3":
      return <h3 className="post-body__subheading">{block.text}</h3>;
    case "list":
      return (
        <ul className="post-body__list">
          {block.items.map((item, index) => (
            <li key={index}className="post-body__list-item">{item}</li>
          ))}
        </ul>
      );
    case "sign":
      return <p className="post-body__sign">{block.text}</p>;
    case "p":
      return <p className="post-body__paragraph">{block.text}</p>;
  }
}

/** The article text of one blog post: section headings (linked from the sidebar), paragraphs, lists and the sign-off line. */
export function PostBody({ post }: { post: BlogPost }) {
  const firstHeading = post.blocks.findIndex((block) => block.type === "lead" || block.type === "h2");
  return (
    <div className="post-body">
      {post.blocks.map((block, index) => (
        <PostBlock key={index} block={block} first={index === firstHeading} />
      ))}
    </div>
  );
}
