import { useEffect } from "react";

export default function HomeRedirect() {
  useEffect(() => {
    window.location.href = "/medvision-landing.html";
  }, []);

  return null;
}