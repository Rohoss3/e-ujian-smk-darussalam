import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SessionUser } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET || "smk-eujian-super-secret-jwt-token-2026-vocational";
const TOKEN_COOKIE_NAME = "smk_eujian_token";

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function createToken(user: SessionUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      nisn: user.nisn,
      nip: user.nip,
      kelas: user.kelas,
      kelasId: user.kelasId,
      jurusan: user.jurusan,
      jurusanId: user.jurusanId,
      foto: user.foto,
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionUser;
    return decoded;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { TOKEN_COOKIE_NAME };
