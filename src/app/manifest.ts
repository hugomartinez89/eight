import { type MetadataRoute } from "next";

// Makes "Install app" in Chrome produce a real Android WebAPK that shares
// Chrome's cookie jar, instead of a loose home-screen shortcut.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Hugo's Pod Hub",
    short_name: "Pod Hub",
    description: "Smart scheduling & controls for your Eight Sleep pod",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#020617",
    categories: ["health", "lifestyle", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
