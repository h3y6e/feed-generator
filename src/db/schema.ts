export type DatabaseSchema = {
  post: Post
  sub_state: SubState
}

export type Post = {
  uri: string
  repostUri: string | null
  cid: string
  replyParent: string | null
  replyRoot: string | null
  indexedAt: string
}

export type SubState = {
  service: string
  cursor: number
}
