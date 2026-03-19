import { type Request, type Response } from "express";
import { z } from "zod";
import { socialService } from "../services/social.service";
import { saveSocialPostImage } from "../services/social-image.service";

const createPostSchema = z
  .object({
    content: z.string().max(4000).optional().default(""),
    imageDataUrl: z.string().optional(),
  })
  .refine((value) => value.content.trim().length > 0 || Boolean(value.imageDataUrl), {
    message: "Post content or image is required",
    path: ["content"],
  });

export const socialController = {
  async feed(req: Request, res: Response) {
    try {
      const posts = await socialService.getFeed(req.user?.id);
      return res.status(200).json(posts);
    } catch (error) {
      console.error("Feed posts error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async listByAddress(req: Request, res: Response) {
    try {
      const userId = await socialService.getUserIdByAddress(req.params.address);
      if (!userId) {
        return res.status(404).json({ message: "User not found" });
      }

      const posts = await socialService.getByUserId(userId, req.user?.id);
      return res.status(200).json(posts);
    } catch (error) {
      console.error("List posts error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const result = createPostSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      let imageUrl: string | undefined;

      if (result.data.imageDataUrl) {
        try {
          imageUrl = await saveSocialPostImage(result.data.imageDataUrl);
        } catch (error) {
          return res.status(400).json({
            message: error instanceof Error ? error.message : "Invalid image upload",
          });
        }
      }

      const created = await socialService.create(req.user!.id, result.data.content.trim(), imageUrl);
      return res.status(201).json(created);
    } catch (error) {
      console.error("Create post error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async toggleLike(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const result = await socialService.toggleLike(id, req.user!.id);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Toggle like error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
