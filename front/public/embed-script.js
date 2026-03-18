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

    if (
      !script ||
      script?.getAttribute("data-hide-ask-ai") === "true" ||
      (this.isSidePanel() && !this.isMobile())
    )
      return;

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

    div.addEventListener("click", function () {
      window.crawlchatEmbed.show();
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

  showSidePanel() {
    document
      .getElementById("__docusaurus")
      ?.classList.add("crawlchat-sidepanel-open");
    document.getElementById(this.sidepanelId)?.classList.remove("hidden");

    const iframe = document.getElementById(this.iframeId);
    iframe.contentWindow.postMessage("focus", "*");
    if (this.getScriptElem()?.dataset.hideToc === "true") {
      this.hideDocusaurusToc();
    }
  }

  hideSidePanel() {
    document
      .getElementById("__docusaurus")
      ?.classList.remove("crawlchat-sidepanel-open");
    document.getElementById(this.sidepanelId)?.classList.add("hidden");
    if (this.getScriptElem()?.dataset.hideToc === "true") {
      this.showDocusaurusToc();
    }
  }

  mountSidePanel() {
    document
      .getElementById("__docusaurus")
      ?.classList.add("crawlchat-with-sidepanel");

    const sidepanel = document.createElement("div");
    sidepanel.id = this.sidepanelId;
    sidepanel.classList.add("hidden");

    sidepanel.appendChild(this.makeResizeDiv());

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

    const handleKeyDown = (e) => {
      if (e.metaKey && e.key === "i") {
        window.crawlchatEmbed.toggleSidePanel();
      }
    };
    document.removeEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleKeyDown);
  }

  toggleSidePanel() {
    if (this.isSidePanelOpen()) {
      this.hideSidePanel();
    } else {
      this.showSidePanel();
    }
  }

  makeResizeDiv() {
    const resize = document.createElement("div");
    resize.classList.add("crawlchat-sidepanel-resize");

    const handleMouseMove = (e) => {
      const width = Math.max(Math.min(window.innerWidth - e.clientX, 560), 400);
      document.documentElement.style.setProperty(
        "--crawlchat-sidepanel-width",
        `${width}px`
      );
      e.preventDefault();
      e.stopPropagation();
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.getElementById(this.sidepanelId).style.pointerEvents = "auto";
    };

    const handleMouseDown = (e) => {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.getElementById(this.sidepanelId).style.pointerEvents = "none";
      e.preventDefault();
      e.stopPropagation();
    };

    resize.addEventListener("mousedown", handleMouseDown);

    return resize;
  }

  isSidePanelOpen() {
    const sidepanel = document.getElementById(this.sidepanelId);
    return !sidepanel?.classList.contains("hidden");
  }

  hideDocusaurusToc() {
    const toc = document.querySelector(".theme-doc-toc-desktop");
    if (!toc) return;
    toc.parentElement.style.display = "none";

    const mainCol = document.querySelector(this.tocSelector);
    if (this.originalTocMaxWidth === null) {
      this.originalTocMaxWidth =
        mainCol.style.maxWidth || getComputedStyle(mainCol).maxWidth;
    }
    mainCol.style.setProperty("max-width", "100%", "important");
  }

  showDocusaurusToc() {
    const toc = document.querySelector(".theme-doc-toc-desktop");
    if (!toc) return;
    toc.parentElement.style.display = "block";

    const mainCol = document.querySelector(this.tocSelector);
    if (this.originalTocMaxWidth) {
      mainCol.style.setProperty(
        "max-width",
        this.originalTocMaxWidth,
        "important"
      );
    } else {
      mainCol.style.setProperty("max-width", "75%", "important");
    }
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
