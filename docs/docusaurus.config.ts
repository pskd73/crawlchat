import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'CrawlChat',
  tagline: 'AI chatbot for your technical documentation',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.crawlchat.app',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  // organizationName: 'crawlchat', // Usually your GitHub org/user name.
  // projectName: 'crawlchat', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        pages: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  headTags: [
    {
      "tagName": "script",
      "attributes": {
        "src": "https://cdn.vemetric.com/main.js",
        "data-token": "MGxpZaWDYdxwChu5"
      },
    },
    {
      "tagName": "script",
      "attributes": {
        "src": "https://datafa.st/js/script.js",
        "data-domain": "crawlchat.app",
        "data-website-id": "dfid_JIKHGZEDxmQtWQODXf6zA"
      },
    },
    {
      "tagName": "script",
      "attributes": {
        "type": "text/javascript"
      },
      "innerHTML": `
        window.vmtrcq = window.vmtrcq || [];
        window.vmtrc = window.vmtrc || function (){window.vmtrcq.push(Array.prototype.slice.call(arguments))};
      `
    },
  ],
  

  themeConfig: {
    // Replace with your project's social card
    image: 'img/og-1.png',
    navbar: {
      title: 'CrawlChat',
      logo: {
        alt: 'CrawlChat Logo',
        src: 'img/logo.png',
        srcDark: 'img/logo-white.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://crawlchat.app',
          label: 'Website',
          position: 'right',
        },
        {
          href: 'https://crawlchat.app/app',
          label: 'Dashboard',
          position: 'right',
        },
        {
          type: 'html',
          position: 'right',
          value: `<button 
          class="crawlchat-nav-askai" 
          onclick="window.crawlchatEmbed.toggleSidePanel()">
            Ask AI
            <span class="keyboard-keys">
              <kbd>⌘</kbd>
              <kbd>I</kbd>
            </span>
          </button>`,
        },
      ],
    },
    footer: {
      style: 'dark',
      // links: [
      //   {
      //     title: 'Docs',
      //     items: [
      //       {
      //         label: 'Tutorial',
      //         to: '/docs/intro',
      //       },
      //     ],
      //   },
      //   {
      //     title: 'Community',
      //     items: [
      //       {
      //         label: 'Stack Overflow',
      //         href: 'https://stackoverflow.com/questions/tagged/docusaurus',
      //       },
      //       {
      //         label: 'Discord',
      //         href: 'https://discordapp.com/invite/docusaurus',
      //       },
      //       {
      //         label: 'X',
      //         href: 'https://x.com/docusaurus',
      //       },
      //     ],
      //   },
      //   {
      //     title: 'More',
      //     items: [
      //       {
      //         label: 'Blog',
      //         to: '/blog',
      //       },
      //       {
      //         label: 'GitHub',
      //         href: 'https://github.com/facebook/docusaurus',
      //       },
      //     ],
      //   },
      // ],
      copyright: `Copyright © ${new Date().getFullYear()} CrawlChat, Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
