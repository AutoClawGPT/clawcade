import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "CLAWCADE Auth",
      credentials: {
        email: { label: "Email", type: "email" },
        authToken: { label: "Auth Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.authToken) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1);

        if (!user || user.authToken !== credentials.authToken) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fetch full user data on sign-in
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.walletAddress = dbUser.walletAddress;
          token.authToken = dbUser.authToken;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const u = session.user as Record<string, unknown>;
        u.id = token.id;
        u.role = token.role;
        u.walletAddress = token.walletAddress;
        u.authToken = token.authToken;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
