class CrawlChatEmbed {
  constructor() {
    this.transitionDuration = 100;
    this.embedDivId = "crawlchat-embed";
    this.iframeId = "crawlchat-iframe";
    this.scriptId = "crawlchat-script";
    this.host = "{{VITE_APP_URL}}";
    this.scrapeId = this.getScrapeId();
    this.askAIButtonId = "crawlchat-ask-ai-button";
    this.lastScrollTop = 0;
    this.lastBodyStyle = {};
    this.originalTocMaxWidth = null;
    this.widgetConfig = {};
    this.sidepanelId = "crawlchat-sidepanel";
    this.tocSelector = "main .container .row .col:first-child";
  }

  getCustomTags() {
    const script = document.getElementById(this.scriptId);
    const allTags = script
      .getAttributeNames()
      .filter((name) => name.startsWith("data-tag-"))
      .map((name) => [
        name.replace("data-tag-", ""),
        script.getAttribute(name),
      ]);
    return Object.fromEntries(allTags);
  }

  isMobile() {
    return window.innerWidth < 700;
  }

  getScriptElem() {
    return document.getElementById(this.scriptId);
  }

  isSidePanel() {
    return (
      this.getCustomTags().sidepanel === "true" ||
      this.getScriptElem()?.dataset.sidepanel === "true"
    );
  }

  async mount() {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = `${this.host}/embed.css`;

    await new Promise((resolve, reject) => {
      style.onload = resolve;
      style.onerror = reject;
      document.head.appendChild(style);
    });

    window.addEventListener("message", (e) => this.handleOnMessage(e));

    if (!this.isMobile() && this.isSidePanel()) {
      this.mountSidePanel();
      if (this.getScriptElem()?.dataset.sidepanelOpen === "true") {
        setTimeout(() => {
          this.showSidePanel();
        }, 500);
      }
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.id = this.iframeId;

    const params = new URLSearchParams({
      embed: "true",
    });
    const customTags = this.getCustomTags();
    if (Object.keys(customTags).length > 0) {
      params.set("tags", btoa(JSON.stringify(customTags)));
    }
    if (this.isMobile()) {
      params.set("width", window.innerWidth.toString() + "px");
      params.set("height", window.innerHeight.toString() + "px");
      params.set("fullscreen", "true");
    }
    if (this.getScriptElem()?.dataset.noPrimaryColor === "true") {
      params.set("noPrimaryColor", "true");
    }
    const secret = this.getScriptElem()?.dataset.secret;
    if (secret) {
      params.set("secret", secret);
    }
    const theme = this.getScriptElem()?.dataset.theme;
    if (theme) {
      params.set("theme", theme);
    }
    const src = `${this.host}/w/${this.scrapeId}?${params.toString()}`;

    iframe.src = src;
    iframe.allowTransparency = "true";
    iframe.allow = "clipboard-write";
    iframe.className = "crawlchat-embed";

    const div = document.createElement("div");
    div.id = this.embedDivId;

    div.appendChild(iframe);
    document.body.appendChild(div);
  }

  getScrapeId() {
    const script = document.getElementById(this.scriptId);
    return script?.getAttribute("data-id");
  }

  getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
  }

  show() {
    const div = document.getElementById(this.embedDivId);
    div.classList.add("open");

    const overflowY = this.getScrollbarWidth() > 0 ? "scroll" : "hidden";

    this.lastScrollTop = window.scrollY;
    this.lastBodyStyle = document.body.style;
    document.body.style.position = "fixed";
    document.body.style.overflowY = overflowY;
    document.body.style.width = "100%";
    document.body.style.top = `-${this.lastScrollTop}px`;

    const iframe = document.getElementById(this.iframeId);
    iframe.contentWindow.postMessage("focus", "*");
  }

  async hide() {
    document.body.style = this.lastBodyStyle;
    window.scrollTo(0, this.lastScrollTop);

    const div = document.getElementById(this.embedDivId);
    div?.classList.remove("open");
    setTimeout(() => {
      window.focus();
    }, this.transitionDuration);

    await this.showAskAIButton();
  }

  isWidgetOpen() {
    const div = document.getElementById(this.embedDivId);
    return div.style.width === "100%";
  }

  async handleOnMessage(event) {
    if (event.data === "close") {
      window.crawlchatEmbed.hide();
      window.crawlchatEmbed.hideSidePanel();
      return;
    }
    if (event.origin !== this.host) {
      return;
    }
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      return;
    }
    if (data.type === "embed-ready") {
      this.widgetConfig = data.widgetConfig;
      await this.showAskAIButton();
      if (this.widgetConfig.currentPageContext) {
        this.watchNavigation();
      }
    }
  }

  hideAskAIButton() {
    const button = document.getElementById(this.askAIButtonId);
    button.classList.add("hidden");
  }

  async showAskAIButton() {
    const script = document.getElementById(this.scriptId);

    if (!script || script?.getAttribute("data-hide-ask-ai") === "true") return;

    if (document.getElementById(this.askAIButtonId)) {
      const button = document.getElementById(this.askAIButtonId);
      button.classList.remove("hidden");
      return;
    }

    const text =
      this.widgetConfig.buttonText ??
      script.getAttribute("data-ask-ai-text") ??
      "💬 Ask AI";
    const backgroundColor =
      this.widgetConfig.primaryColor ||
      script.getAttribute("data-ask-ai-background-color") ||
      "#7b2cbf";
    const color =
      this.widgetConfig.buttonTextColor ||
      script.getAttribute("data-ask-ai-color") ||
      "white";
    const logoUrl =
      this.widgetConfig.buttonLogoUrl ||
      script.getAttribute("data-ask-ai-logo-url");

    const position = script.getAttribute("data-ask-ai-position") ?? "br";
    const marginX = script.getAttribute("data-ask-ai-margin-x") ?? "20px";
    const marginY = script.getAttribute("data-ask-ai-margin-y") ?? "20px";
    const radius = script.getAttribute("data-ask-ai-radius") ?? undefined;
    const fontSize = script.getAttribute("data-ask-ai-font-size");

    let bottom = undefined;
    let right = undefined;
    let left = undefined;
    let top = undefined;

    if (position === "bl") {
      bottom = marginY;
      left = marginX;
    } else if (position === "br") {
      bottom = marginY;
      right = marginX;
    } else if (position === "tl") {
      top = marginY;
      left = marginX;
    } else if (position === "tr") {
      top = marginY;
      right = marginX;
    }

    const div = document.createElement("div");
    div.id = this.askAIButtonId;
    div.style.bottom = bottom;
    div.style.right = right;
    div.style.left = left;
    div.style.top = top;

    div.style.backgroundColor = backgroundColor;
    div.style.color = color;
    div.style.borderRadius = radius;
    div.style.fontSize = fontSize;

    if (logoUrl) {
      div.classList.add("square");
      const img = document.createElement("img");
      img.src = logoUrl;
      img.className = "logo";
      div.appendChild(img);
    }

    const span = document.createElement("span");
    span.innerText = text;
    div.appendChild(span);

    if (this.widgetConfig.tooltip) {
      div.appendChild(this.makeTooltip(this.widgetConfig.tooltip));
    }

    div.addEventListener("click", () => {
      if (this.isSidePanel()) {
        this.toggleSidePanel();
      } else {
        this.show();
      }
      div.classList.add("hidden");
    });

    document.body.appendChild(div);
  }

  makeTooltip(text) {
    const div = document.createElement("div");
    div.innerText = text;
    div.className = "tooltip";
    return div;
  }

  positionSidePanel() {
    const sidepanel = document.getElementById(this.sidepanelId);
    if (sidepanel) {
      sidepanel.style.position = "fixed";
      sidepanel.style.right = "0px";
      sidepanel.style.top = "0px";
      sidepanel.style.width = "400px";
      sidepanel.style.height = `${window.innerHeight}px`;

      if (isDocusaurus()) {
        const navBar = getDocusaurusNavBar();
        if (navBar) {
          const rect = navBar.getBoundingClientRect();
          sidepanel.style.top = `${rect.height}px`;
          sidepanel.style.height = `${window.innerHeight - rect.height}px`;
        }

        const { elem: container, col } = getDocusaurusMainContainer();
        if (container) {
          const rect = container.getBoundingClientRect();
          const scroll = this.getScrollbarWidth();
          const pad = col ? 10 : 20;
          sidepanel.style.width = `${window.innerWidth - rect.right - scroll - pad}px`;
        }
      } else if (isMintlify()) {
        const navBar = getMintlifyNavBar();
        if (navBar) {
          const rect = navBar.getBoundingClientRect();
          sidepanel.style.top = `${rect.height}px`;
          sidepanel.style.height = `${window.innerHeight - rect.height}px`;
        }

        const container = getMintlifyMainContainer();
        if (container) {
          const rect = container.getBoundingClientRect();
          const scroll = this.getScrollbarWidth();
          const pad = 30;
          sidepanel.style.width = `${window.innerWidth - rect.right - scroll - pad}px`;
        }
      }
    }
  }

  showSidePanel() {
    const sidepanel = document.getElementById(this.sidepanelId);
    if (sidepanel) {
      this.positionSidePanel();
      sidepanel.classList.remove("hidden");
    }

    this.hideAskAIButton();
    const iframe = document.getElementById(this.iframeId);
    iframe.contentWindow.postMessage("focus", "*");
  }

  hideSidePanel() {
    document.getElementById(this.sidepanelId)?.classList.add("hidden");
    this.showAskAIButton();
  }

  mountSidePanel() {
    if (!isDocusaurus() && !isMintlify()) {
      console.warn("CrawlChat sidepanel is not supported");
      return;
    }

    document
      .getElementById("__docusaurus")
      ?.classList.add("crawlchat-with-sidepanel");

    const sidepanel = document.createElement("div");
    sidepanel.id = this.sidepanelId;
    sidepanel.classList.add("hidden");

    if (isDocusaurus()) {
      sidepanel.classList.add("docusaurus");
    }
    if (isMintlify()) {
      sidepanel.classList.add("mintlify");
    }

    const params = new URLSearchParams({
      embed: "true",
      fullscreen: "true",
      sidepanel: "true",
    });
    if (this.getScriptElem()?.dataset.noPrimaryColor === "true") {
      params.set("noPrimaryColor", "true");
    }
    const secret = this.getScriptElem()?.dataset.secret;
    if (secret) {
      params.set("secret", secret);
    }
    const theme = this.getScriptElem()?.dataset.theme;
    if (theme) {
      params.set("theme", theme);
    }

    const iframe = document.createElement("iframe");
    iframe.src = `${this.host}/w/${this.scrapeId}?${params.toString()}`;
    iframe.allowTransparency = "true";
    iframe.allow = "clipboard-write";
    iframe.className = "crawlchat-embed";
    iframe.id = this.iframeId;

    sidepanel.appendChild(iframe);

    document.body.appendChild(sidepanel);
    this.positionSidePanel();

    const handleKeyDown = (e) => {
      if (e.metaKey && e.key === "i") {
        this.toggleSidePanel();
      }
    };

    const handleNavigate = (e) => {
      setTimeout(() => {
        this.positionSidePanel();
      }, 50);
    };

    document.removeEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleKeyDown);

    window.navigation.removeEventListener("navigate", handleNavigate);
    window.navigation.addEventListener("navigate", handleNavigate);
  }

  toggleSidePanel() {
    if (this.isSidePanelOpen()) {
      this.hideSidePanel();
    } else {
      this.showSidePanel();
    }
  }

  isSidePanelOpen() {
    const sidepanel = document.getElementById(this.sidepanelId);
    return !sidepanel?.classList.contains("hidden");
  }

  open(options = {}) {
    if (this.isSidePanel()) {
      this.showSidePanel();
    } else {
      this.show();
    }

    if (options.query) {
      const iframe = document.getElementById(this.iframeId);
      iframe.contentWindow.postMessage(
        JSON.stringify({
          type: "query",
          query: options.query,
        }),
        "*"
      );
    }
  }

  watchNavigation() {
    const notify = async (url) => {
      const iframe = document.getElementById(this.iframeId);
      await new Promise((resolve) => setTimeout(resolve, 100));
      iframe?.contentWindow?.postMessage(
        JSON.stringify({
          type: "host-navigation",
          url: url ?? window.location.href,
          title: document.title,
        }),
        "*"
      );
    };

    const hasNavigationApi =
      typeof window.navigation !== "undefined" &&
      typeof window.navigation.addEventListener === "function";
    if (hasNavigationApi) {
      window.navigation.addEventListener("navigate", (e) => {
        notify(e.destination.url);
      });
    }

    notify(window.location.href);
  }
}

async function setupCrawlChat() {
  window.crawlchatEmbed = new CrawlChatEmbed();
  await window.crawlchatEmbed.mount();
}

if (document.readyState === "complete" || window.frameElement) {
  setupCrawlChat();
} else {
  window.addEventListener("load", setupCrawlChat);
}

function getDocusaurusMainContainer() {
  let elem = document.querySelector(".breadcrumbs");

  while (elem.parentElement) {
    const classListStr = elem.classList.toString();
    if (elem.classList.contains("col")) {
      return { elem, col: true };
    }
    if (classListStr.includes("generatedIndexPage_")) {
      return { elem, col: false };
    }
    elem = elem.parentElement;
  }
}

function isDocusaurus() {
  return document.getElementById("__docusaurus") !== null;
}

function getDocusaurusTocCol() {
  let elem = document.querySelector(".table-of-contents");
  while (elem?.parentElement) {
    if (elem.classList.contains("col")) {
      return elem;
    }
    elem = elem.parentElement;
  }
}

function getDocusaurusNavBar() {
  return document.querySelector("nav.navbar");
}

function isMintlify() {
  return (
    document
      .querySelector("meta[name='generator']")
      .getAttribute("content")
      .toLowerCase() === "mintlify"
  );
}

function getMintlifyNavBar() {
  return document.getElementById("navbar-transition-maple");
}

function getMintlifyMainContainer() {
  return document.getElementById("content-area");
}
