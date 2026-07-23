import React, { useEffect, useState } from "react";
import { FullScreenLoader } from "@/components/Preloader";
import paths from "@/utils/paths";
import useQuery from "@/hooks/useQuery";
import System from "@/models/system";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";

export default function SimpleSSOPassthrough() {
  const query = useQuery();
  const redirectPath = query.get("redirectTo") || paths.home();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      if (!query.get("token")) throw new Error("No token provided.");

      // Note: we intentionally do NOT clear existing auth data here before the
      // exchange completes. AuthContext's refreshUser() effect runs concurrently
      // on this page and reads localStorage at fetch time - clearing early leaves
      // a window with no token, causing that request to 401 and force a logout
      // redirect that races with (and can beat) this SSO login.
      System.simpleSSOLogin(query.get("token"))
        .then((res) => {
          if (!res.valid) throw new Error(res.message);

          window.localStorage.setItem(AUTH_USER, JSON.stringify(res.user));
          window.localStorage.setItem(AUTH_TOKEN, res.token);
          window.localStorage.setItem(AUTH_TIMESTAMP, Number(new Date()));
          setReady(res.valid);
        })
        .catch((e) => {
          window.localStorage.removeItem(AUTH_USER);
          window.localStorage.removeItem(AUTH_TOKEN);
          window.localStorage.removeItem(AUTH_TIMESTAMP);
          setError(e.message);
        });
    } catch (e) {
      setError(e.message);
    }
  }, []);

  if (error)
    return (
      <div className="w-screen h-screen overflow-hidden bg-theme-bg-primary flex items-center justify-center flex-col gap-4">
        <p className="text-theme-text-primary font-mono text-lg">{error}</p>
        <p className="text-theme-text-secondary font-mono text-sm">
          Please contact the system administrator about this error.
        </p>
      </div>
    );
  if (ready) return window.location.replace(redirectPath);

  // Loading state by default
  return <FullScreenLoader />;
}
