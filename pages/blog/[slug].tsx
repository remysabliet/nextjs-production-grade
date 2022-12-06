import React, { FC } from 'react'
import hydrate from 'next-mdx-remote/hydrate'
import { majorScale, Pane, Heading, Spinner } from 'evergreen-ui'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Post } from '../../types'
import Container from '../../components/container'
import HomeNav from '../../components/homeNav'

// Server side libraries
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { posts } from '../../content'
import renderToString from 'next-mdx-remote/render-to-string'

const BlogPost: FC<Post> = ({ source, frontMatter }) => {
  const content = hydrate(source)
  const router = useRouter()

  // is the nextJs will tell us by the way of the router,  that someone is asking a static page not generated yet, meantime
  // show a loading spinner
  if (router.isFallback) {
    return (
      <Pane width="100%" height="100%">
        <Spinner size={48} />
      </Pane>
    )
  }
  return (
    <Pane>
      <Head>
        <title>{`Known Blog | ${frontMatter.title}`}</title>
        <meta name="description" content={frontMatter.summary} />
      </Head>
      <header>
        <HomeNav />
      </header>
      <main>
        <Container>
          <Heading fontSize="clamp(2rem, 8vw, 6rem)" lineHeight="clamp(2rem, 8vw, 6rem)" marginY={majorScale(3)}>
            {frontMatter.title}
          </Heading>
          <Pane>{content}</Pane>
        </Container>
      </main>
    </Pane>
  )
}

BlogPost.defaultProps = {
  source: '',
  frontMatter: { title: 'default title', summary: 'summary', publishedOn: '' },
}

// Return the Paths
export function getStaticPaths() {
  const postsPath = path.join(process.cwd(), 'posts')
  const filenames = fs.readdirSync(postsPath)
  const slugs = filenames.map((name) => {
    const filePath = path.join(postsPath, name)
    const file = fs.readFileSync(filePath, 'utf-8')
    const { data } = matter(file)
    return data
  })

  const paths = slugs.map((s) => ({ params: { slug: s.slug } }))
  console.log('getStaticPaths return paths:', paths)
  return {
    paths: slugs.map((s) => ({ params: { slug: s.slug } })),
    fallback: true, // on demande static generation for things we didnt bluid ahead of time
    // out of 100 000 blogs we could just generate the first 100 blogs and then for the remaining,
    // generate and cache them on demand
  }
}

/**
 * Need to get the paths here
 * then the the correct post for the matching path
 * Posts can come from the fs or our CMS
 */
export async function getStaticProps({ params, preview }) {
  console.log('getStaticProps START', params)
  let post
  try {
    const filesPath = path.join(process.cwd(), 'posts', `${params.slug}.mdx`)
    post = fs.readFileSync(filesPath, 'utf-8')
  } catch {
    console.log('Should match in the catch', params.slug)
    const cmsPosts = (preview ? posts.draft : posts.published).map((p) => {
      return matter(p)
    })

    const match = cmsPosts.find((p) => p.data.slug === params.slug)
    post = match.content
    console.log('post from catch', post)
  }
  const { data } = matter(post)
  const mdxSrc = await renderToString(post, { scope: data })

  console.log('data', data, 'mdxSource', mdxSrc)
  return {
    props: {
      source: mdxSrc,
      frontMatter: data,
    },
  }
}

export default BlogPost
