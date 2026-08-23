import { defineConfig } from "vitepress";

const repo = "https://github.com/spcaeo/vb-inspired-folder-tabs";
const base = "/vb-inspired-folder-tabs/";
const site = "https://spcaeo.github.io/vb-inspired-folder-tabs/";

const description =
  "A tab control where the active tab IS the panel. Rebuilt from the Visual Basic 4 SSTab control: three fills in a fixed relationship, real trapezoid tabs, measured contrast, React and vanilla builds.";

export default defineConfig({
  title: "VB Folder Tabs",
  description,
  base,
  lastUpdated: true,
  appearance: true,

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` }],
    ["meta", { name: "theme-color", content: "#1a1f2b" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "VB Folder Tabs" }],
    ["meta", { property: "og:title", content: "VB Folder Tabs" }],
    ["meta", { property: "og:description", content: description }],
    ["meta", { property: "og:url", content: site }],
    ["meta", { name: "twitter:card", content: "summary" }],
    ["meta", { name: "twitter:title", content: "VB Folder Tabs" }],
    ["meta", { name: "twitter:description", content: description }],
  ],

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/", activeMatch: "/guide/" },
      { text: "API", link: "/api/css", activeMatch: "/api/" },
      { text: "Demo", link: `${repo}/blob/main/demo.html` },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Introduction", link: "/guide/" },
            { text: "Installation", link: "/guide/installation" },
            { text: "Quick Start", link: "/guide/quick-start" },
          ],
        },
        {
          text: "The Design",
          items: [
            { text: "The Mechanic", link: "/guide/the-mechanic" },
            { text: "Theming", link: "/guide/theming" },
            { text: "Accessibility", link: "/guide/accessibility" },
            { text: "Nesting", link: "/guide/nesting" },
            { text: "Overflow", link: "/guide/overflow" },
          ],
        },
        {
          text: "Project",
          items: [{ text: "Contributing", link: "/guide/contributing" }],
        },
      ],
      "/api/": [
        {
          text: "API Reference",
          items: [
            { text: "CSS", link: "/api/css" },
            { text: "React", link: "/api/react" },
            { text: "Vanilla JS", link: "/api/vanilla" },
          ],
        },
        {
          text: "Guide",
          items: [
            { text: "Introduction", link: "/guide/" },
            { text: "The Mechanic", link: "/guide/the-mechanic" },
            { text: "Theming", link: "/guide/theming" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: repo }],

    editLink: {
      pattern: `${repo}/edit/main/docs/:path`,
      text: "Edit this page on GitHub",
    },

    search: {
      provider: "local",
    },

    outline: { level: [2, 3], label: "On this page" },

    footer: {
      message: "Released under the MIT Licence.",
      copyright: "Copyright © 2026 spcaeo",
    },

    lastUpdated: {
      text: "Last updated",
    },
  },
});
