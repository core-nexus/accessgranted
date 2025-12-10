import { convexAuth } from "@convex-dev/auth/server";
import Resend from "@auth/core/providers/resend";
import Password from "@auth/core/providers/credentials"; // Use credentials/password

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Resend, Password],
});
