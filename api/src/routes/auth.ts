import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models";
import { signToken } from "../lib/jwt";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(["user", "admin"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/register", validateBody(registerSchema), async (req, res) => {
  const { name, email, password, role } = req.body as z.infer<typeof registerSchema>;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: "email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const adminCount = await User.countDocuments({ role: "admin" });
  // First user becomes admin automatically; otherwise honor requested role (defaults to "user").
  const finalRole = adminCount === 0 ? "admin" : role ?? "user";

  const user = await User.create({ name, email, passwordHash, role: finalRole });
  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user });
});

authRouter.post("/login", validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.sub);
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json({ user });
});
