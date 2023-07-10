import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'

type SkeletonItem = {
  post: string
  reason?: ReasonRepost
}

type ReasonRepost = {
  $type: 'app.bsky.feed.defs#skeletonReasonRepost'
  repost: string // repost URI
}
// max 15 chars
const shortname = 'camphor-members'

const handler = async (ctx: AppContext, params: QueryParams) => {
  let builder = ctx.db
    .selectFrom('post')
    .selectAll()
    .orderBy('indexedAt', 'desc')
    .orderBy('cid', 'desc')
    .limit(params.limit)

  if (params.cursor) {
    const [indexedAt, cid] = params.cursor.split('::')
    if (!indexedAt || !cid) {
      throw new InvalidRequestError('malformed cursor')
    }
    const timeStr = new Date(parseInt(indexedAt, 10)).toISOString()
    builder = builder
      .where('post.indexedAt', '<', timeStr)
      .orWhere((qb) => qb.where('post.indexedAt', '=', timeStr))
      .where('post.cid', '<', cid)
  }

  const res = await builder.execute()
  const feed = res.map((row) => {
    const feedItem: SkeletonItem = { post: row.uri }

    if (row.repostUri !== null) {
      feedItem.reason = {
        $type: 'app.bsky.feed.defs#skeletonReasonRepost',
        repost: row.repostUri,
      }
    }
    return feedItem
  })

  let cursor: string | undefined
  const last = res.at(-1)
  if (last) {
    cursor = `${new Date(last.indexedAt).getTime()}::${last.cid}`
  }

  return { cursor, feed }
}

export { shortname, handler }
