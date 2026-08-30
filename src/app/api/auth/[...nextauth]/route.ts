import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { findUserByEmail } from "@/lib/db/clickhouse-store";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "AuthToken",
      credentials: {
        email: { label: "Email", type: "email" },
        authToken: { label: "Auth Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.authToken) return null;
        const user = await findUserByEmail(credentials.email);
        if (!user || user.authToken !== credentials.authToken) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as Record<string, unknown>).id = token.id;
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});

export { handler as GET, handler as POST };
