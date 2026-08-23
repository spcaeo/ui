import { defineConfig } from "vitepress";

const repo = "https://github.com/spcaeo/ui";
const base = "/ui/";
const site = "https://spcaeo.github.io/ui/";

const description =
  "A small collection of interface components built to a measured bar: contrast computed from the stylesheet and enforced in CI, state that survives greyscale, the full keyboard and ARIA pattern, and no build step.";

// One block per component. Adding a component means adding an entry here and a
// matching section to the sidebar below — nothing else in this file changes.
const folderTabsSidebar = [
  {
    text: "Folder Tabs",
    items: [
      { text: "Overview", link: "/components/folder-tabs/" },
      { text: "Installation", link: "/components/folder-tabs/installation" },
      { text: "Quick Start", link: "/components/folder-tabs/quick-start" },
    ],
  },
  {
    text: "Folder Tabs — the design",
    items: [
      { text: "The Mechanic", link: "/components/folder-tabs/the-mechanic" },
      { text: "Theming", link: "/components/folder-tabs/theming" },
      { text: "Accessibility", link: "/components/folder-tabs/accessibility" },
      { text: "Nesting", link: "/components/folder-tabs/nesting" },
      { text: "Overflow", link: "/components/folder-tabs/overflow" },
    ],
  },
  {
    text: "Folder Tabs — API",
    items: [
      { text: "CSS", link: "/components/folder-tabs/api-css" },
      { text: "React", link: "/components/folder-tabs/api-react" },
      { text: "Vanilla JS", link: "/components/folder-tabs/api-vanilla" },
    ],
  },
];

const collectionSidebar = [
  {
    text: "The collection",
    items: [
      { text: "What this is", link: "/guide/" },
      { text: "House Rules", link: "/guide/house-rules" },
      { text: "Contributing", link: "/guide/contributing" },
    ],
  },
];

export default defineConfig({
  title: "spcaeo/ui",
  description,
  base,
  lastUpdated: true,
  appearance: true,

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` }],
    ["meta", { name: "theme-color", content: "#1a1f2b" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "spcaeo/ui" }],
    ["meta", { property: "og:title", content: "spcaeo/ui" }],
    ["meta", { property: "og:description", content: description }],
    ["meta", { property: "og:url", content: site }],
    ["meta", { name: "twitter:card", content: "summary" }],
    ["meta", { name: "twitter:title", content: "spcaeo/ui" }],
    ["meta", { name: "twitter:description", content: description }],
  ],

  themeConfig: {
    nav: [
      {
        text: "Components",
        link: "/components/",
        activeMatch: "/components/",
      },
      { text: "The Collection", link: "/guide/", activeMatch: "/guide/" },
      { text: "House Rules", link: "/guide/house-rules" },
    ],

    sidebar: {
      "/components/folder-tabs/": [
        {
          text: "Components",
          items: [{ text: "All components", link: "/components/" }],
        },
        ...folderTabsSidebar,
        ...collectionSidebar,
      ],
      "/components/": [
        {
          text: "Components",
          items: [{ text: "All components", link: "/components/" }],
        },
        ...folderTabsSidebar,
      ],
      "/guide/": [...collectionSidebar, ...folderTabsSidebar],
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
