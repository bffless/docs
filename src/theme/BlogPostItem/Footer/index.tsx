import React from 'react';
import Footer from '@theme-original/BlogPostItem/Footer';
import type FooterType from '@theme/BlogPostItem/Footer';
import type {WrapperProps} from '@docusaurus/types';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import LikeButton from '@site/src/components/LikeButton';

type Props = WrapperProps<typeof FooterType>;

// Wraps the stock blog-post footer to append the like button on every
// full post page (not on the /blog list, where each item is a teaser).
// The slug matches what the blog_post_likes pipeline keys rows on: the
// post's explicit front-matter slug, falling back to the permalink tail.
export default function FooterWrapper(props: Props): React.ReactElement {
  const {metadata, isBlogPostPage} = useBlogPost();
  const slug =
    (metadata.frontMatter.slug as string | undefined) ??
    metadata.permalink.split('/').filter(Boolean).pop() ??
    metadata.permalink;

  return (
    <>
      <Footer {...props} />
      {isBlogPostPage && <LikeButton slug={slug} />}
    </>
  );
}
