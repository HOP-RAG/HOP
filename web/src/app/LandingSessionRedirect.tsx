"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser } from "@/lib/user";
import { useUser } from "@/providers/UserProvider";

const APP_ROUTE = "/app";
const WAITING_ON_VERIFICATION_ROUTE = "/auth/waiting-on-verification";

function getRedirectPath(
  requiresVerification: boolean,
  isVerified: boolean | undefined
) {
  if (requiresVerification && !isVerified) {
    return WAITING_ON_VERIFICATION_ROUTE;
  }

  return APP_ROUTE;
}

export default function LandingSessionRedirect() {
  const router = useRouter();
  const fallbackCheckStartedRef = useRef(false);
  const { user, authTypeMetadata } = useUser();

  useEffect(() => {
    const authenticatedUser =
      user?.is_active && !user.is_anonymous_user ? user : null;

    if (authenticatedUser) {
      router.replace(
        getRedirectPath(
          authTypeMetadata.requiresVerification,
          authenticatedUser.is_verified
        )
      );
      return;
    }

    if (fallbackCheckStartedRef.current) {
      return;
    }
    fallbackCheckStartedRef.current = true;

    let cancelled = false;

    void (async () => {
      const currentUser = await getCurrentUser();
      if (
        cancelled ||
        !currentUser?.is_active ||
        currentUser.is_anonymous_user
      ) {
        return;
      }

      router.replace(
        getRedirectPath(
          authTypeMetadata.requiresVerification,
          currentUser.is_verified
        )
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [authTypeMetadata.requiresVerification, router, user]);

  return null;
}
