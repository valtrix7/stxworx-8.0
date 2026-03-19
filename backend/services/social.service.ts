import { db } from "../db";
import { postLikes, socialPosts, users } from "@shared/schema";
import { desc, eq, and } from "drizzle-orm";

async function enrichPosts(
  posts: Array<{
    id: number;
    userId: number;
    content: string;
    imageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    authorStxAddress: string | null;
    authorUsername: string | null;
    authorAvatar: string | null;
  }>,
  viewerId?: number,
) {
  return Promise.all(
    posts.map(async (post) => {
      const likes = await db.select().from(postLikes).where(eq(postLikes.postId, post.id));
      const likedByViewer = viewerId ? likes.some((like) => like.userId === viewerId) : false;

      return {
        ...post,
        likesCount: likes.length,
        commentsCount: 0,
        likedByViewer,
      };
    }),
  );
}

export const socialService = {
  async getFeed(viewerId?: number, limit = 12) {
    const posts = await db
      .select({
        id: socialPosts.id,
        userId: socialPosts.userId,
        content: socialPosts.content,
        imageUrl: socialPosts.imageUrl,
        createdAt: socialPosts.createdAt,
        updatedAt: socialPosts.updatedAt,
        authorStxAddress: users.stxAddress,
        authorUsername: users.username,
        authorAvatar: users.avatar,
      })
      .from(socialPosts)
      .leftJoin(users, eq(socialPosts.userId, users.id))
      .orderBy(desc(socialPosts.createdAt))
      .limit(limit);

    return enrichPosts(posts, viewerId);
  },

  async getByUserId(userId: number, viewerId?: number) {
    const posts = await db
      .select({
        id: socialPosts.id,
        userId: socialPosts.userId,
        content: socialPosts.content,
        imageUrl: socialPosts.imageUrl,
        createdAt: socialPosts.createdAt,
        updatedAt: socialPosts.updatedAt,
        authorStxAddress: users.stxAddress,
        authorUsername: users.username,
        authorAvatar: users.avatar,
      })
      .from(socialPosts)
      .leftJoin(users, eq(socialPosts.userId, users.id))
      .where(eq(socialPosts.userId, userId))
      .orderBy(desc(socialPosts.createdAt));

    return enrichPosts(posts, viewerId);
  },

  async create(userId: number, content: string, imageUrl?: string) {
    const [result] = await db.insert(socialPosts).values({
      userId,
      content,
      imageUrl: imageUrl ?? null,
    });

    const [created] = await db
      .select({
        id: socialPosts.id,
        userId: socialPosts.userId,
        content: socialPosts.content,
        imageUrl: socialPosts.imageUrl,
        createdAt: socialPosts.createdAt,
        updatedAt: socialPosts.updatedAt,
        authorStxAddress: users.stxAddress,
        authorUsername: users.username,
        authorAvatar: users.avatar,
      })
      .from(socialPosts)
      .leftJoin(users, eq(socialPosts.userId, users.id))
      .where(eq(socialPosts.id, result.insertId));

    if (!created) {
      return null;
    }

    const [enriched] = await enrichPosts([created], userId);
    return enriched || null;
  },

  async toggleLike(postId: number, userId: number) {
    const [existing] = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));

    if (existing) {
      await db.delete(postLikes).where(eq(postLikes.id, existing.id));
    } else {
      await db.insert(postLikes).values({ postId, userId });
    }

    const likes = await db.select().from(postLikes).where(eq(postLikes.postId, postId));
    return {
      likesCount: likes.length,
      likedByViewer: !existing,
    };
  },

  async getUserIdByAddress(address: string) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.stxAddress, address));

    return user?.id ?? null;
  },
};
