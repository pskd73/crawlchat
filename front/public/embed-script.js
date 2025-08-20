class CrawlChatEmbed {
  constructor() {
    this.transitionDuration = 100;
    this.embedDivId = "crawlchat-embed";
    this.iframeId = "crawlchat-iframe";
    this.scriptId = "crawlchat-script";
    this.host = "https://crawlchat.app";
    this.scrapeId = this.getScrapeId();
    this.askAIButtonId = "crawlchat-ask-ai-button";
    this.lastScrollTop = 0;
    this.lastBodyStyle = {};
    this.widgetConfig = {};
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

  async mount() {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = `${this.host}/embed.css`;
    document.head.appendChild(style);

    const iframe = document.createElement("iframe");
    iframe.id = this.iframeId;

    const params = new URLSearchParams({
      embed: "true",
    });
    const customTags = this.getCustomTags();
    if (Object.keys(customTags).length > 0) {
      params.set("tags", btoa(JSON.stringify(customTags)));
    }
    if (window.innerWidth < 700) {
      params.set("width", window.innerWidth.toString() + "px");
      params.set("height", window.innerHeight.toString() + "px");
      params.set("fullscreen", "true");
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
    window.addEventListener("message", (e) => this.handleOnMessage(e));
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
    div.classList.remove("open");
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
      return window.crawlchatEmbed.hide();
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

      const script = document.getElementById(this.scriptId);
      if (!script.getAttribute("data-hide-ask-ai")) {
        await this.showAskAIButton();
      }
    }
  }

  hideAskAIButton() {
    const button = document.getElementById(this.askAIButtonId);
    button.classList.add("hidden");
  }

  async showAskAIButton() {
    const script = document.getElementById(this.scriptId);

    if (!script) {
      return;
    }

    const text =
      this.widgetConfig.buttonText ??
      script.getAttribute("data-ask-ai-text") ??
      "💬 Ask AI";
    const backgroundColor =
      this.widgetConfig.primaryColor ??
      script.getAttribute("data-ask-ai-background-color") ??
      "#7b2cbf";
    const color =
      this.widgetConfig.buttonTextColor ??
      script.getAttribute("data-ask-ai-color") ??
      "white";
    const position = script.getAttribute("data-ask-ai-position") ?? "br";
    const marginX = script.getAttribute("data-ask-ai-margin-x") ?? "20px";
    const marginY = script.getAttribute("data-ask-ai-margin-y") ?? "20px";
    const radius = script.getAttribute("data-ask-ai-radius") ?? "20px";
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
