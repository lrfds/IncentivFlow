// Core - Authentication & JWT
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
export class AuthService {
    static async hashPassword(password) {
        return bcrypt.hash(password, 12);
    }
    static async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    static async validateUser(email, password) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { organization: true },
        });
        if (!user)
            return null;
        const isValid = await this.verifyPassword(password, user.passwordHash);
        if (!isValid)
            return null;
        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        return user;
    }
    static async createUser(data) {
        const passwordHash = await this.hashPassword(data.password);
        return prisma.user.create({
            data: {
                organizationId: data.organizationId,
                name: data.name,
                email: data.email,
                passwordHash,
                role: data.role || 'CONSULTOR',
            },
        });
    }
}
// Rate limiting helper (in-memory, production use Redis)
const loginAttempts = new Map();
export const rateLimitLogin = (ip) => {
    const now = Date.now();
    const attempt = loginAttempts.get(ip);
    if (!attempt) {
        loginAttempts.set(ip, { count: 1, lastAttempt: now });
        return true;
    }
    // Reset after 15 min
    if (now - attempt.lastAttempt > 15 * 60 * 1000) {
        loginAttempts.set(ip, { count: 1, lastAttempt: now });
        return true;
    }
    if (attempt.count >= 5)
        return false;
    attempt.count++;
    attempt.lastAttempt = now;
    return true;
};
