import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { dids } from './members'

const isMember = (author: string) => {
  return dids.some((did) => author === did)
}

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    // posts
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        return isMember(create.author)
      })
      .map((create) => {
        return {
          uri: create.uri,
          cid: create.cid,
          replyParent: create.record?.reply?.parent.uri ?? null,
          replyRoot: create.record?.reply?.root.uri ?? null,
          indexedAt: new Date().toISOString(),
        }
      })
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }

    // reposts
    const repostsToCreate = ops.reposts.creates
      .filter((create) => {
        return isMember(create.author)
      })
      .map((create) => {
        return {
          uri: create.record.subject.uri,
          repostUri: create.uri,
          cid: create.cid,
          indexedAt: new Date().toISOString(),
        }
      })
    if (repostsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(repostsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }

    const repostsToDelete = ops.reposts.deletes.map((del) => del.uri)
    if (repostsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('repostUri', 'in', repostsToDelete)
        .execute()
    }
  }
}
