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
    const iframe = document.createElement("iframe");
    iframe.id = this.iframeId;

    let src = `${this.host}/w/${this.scrapeId}?embed=true`;
    const customTags = this.getCustomTags();
    if (Object.keys(customTags).length > 0) {
      src += `&tags=${btoa(JSON.stringify(customTags))}`;
    }

    iframe.src = src;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.backgroundColor = "transparent";
    iframe.style.background = "transparent";
    iframe.allowTransparency = "true";
    iframe.style.opacity = "1";
    iframe.allow = "clipboard-write";

    const div = document.createElement("div");
    div.id = this.embedDivId;
    div.style.position = "fixed";
    div.style.top = "0px";
    div.style.left = "0px";
    div.style.width = "0px";
    div.style.height = "0px";
    div.style.border = "none";
    div.style.zIndex = "1000";
    div.style.transition = `opacity ${this.transitionDuration}ms ease`;
    div.style.opacity = "0";

    div.appendChild(iframe);
    document.body.appendChild(div);
    window.addEventListener("message", (e) => this.handleOnMessage(e));
  }

  getScrapeId() {
    const script = document.getElementById(this.scriptId);
    return script?.getAttribute("data-id");
  }

  show() {
    const div = document.getElementById(this.embedDivId);
    div.style.width = "100%";
    div.style.height = "100%";
    setTimeout(() => {
      div.style.opacity = "1";
    }, 0);
    this.lastScrollTop = window.scrollY;
    this.lastBodyStyle = document.body.style;
    document.body.style.position = "fixed";
    document.body.style.overflowY = "scroll";
    document.body.style.width = "100%";
    document.body.style.top = `-${this.lastScrollTop}px`;

    const iframe = document.getElementById(this.iframeId);
    iframe.contentWindow.postMessage("focus", "*");
  }

  async hide() {
    document.body.style = this.lastBodyStyle;
    window.scrollTo(0, this.lastScrollTop);

    const div = document.getElementById(this.embedDivId);
    div.style.opacity = "0";
    setTimeout(() => {
      div.style.width = "0px";
      div.style.height = "0px";
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
      await this.showAskAIButton();
    }
  }

  hideAskAIButton() {
    const button = document.getElementById(this.askAIButtonId);
    button.style.opacity = "0";
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
    const logoUrl = this.widgetConfig.logoUrl;

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
    div.style.position = "fixed";
    div.style.bottom = bottom;
    div.style.right = right;
    div.style.left = left;
    div.style.top = top;
    div.style.padding = "8px 20px";

    div.style.backgroundColor = backgroundColor;
    div.style.color = color;
    div.style.borderRadius = radius;
    div.style.cursor = "pointer";
    div.style.transition = "scale 0.1s ease, opacity 0.3s ease";
    div.style.fontSize = fontSize;

    div.style.scale = "1";
    div.style.boxShadow = "rgba(0, 0, 0, 0.2) 0px 2px 4px";

    div.style.display = "flex";
    div.style.flexDirection = "column";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";

    div.addEventListener("mouseover", function () {
      div.style.scale = "1.05";
    });

    div.addEventListener("mouseout", function () {
      div.style.scale = "1";
    });

    if (logoUrl && this.widgetConfig.showLogo) {
      const logo = document.createElement("img");
      logo.src = logoUrl;
      logo.style.width = "40px";
      logo.style.height = "40px";
      div.appendChild(logo);

      div.style.borderRadius = "10px";
      div.style.border = `1px solid ${color}`;
    }

    const span = document.createElement("span");
    span.innerText = text;
    div.appendChild(span);

    if (this.widgetConfig.tooltip) {
      div.appendChild(this.makeTooltip(this.widgetConfig.tooltip));
    }

    div.addEventListener("click", function () {
      window.crawlchatEmbed.show();
      div.style.opacity = "0";
    });

    document.body.appendChild(div);
  }

  makeTooltip(text) {
    const div = document.createElement("div");
    div.innerText = text;
    div.style.position = "absolute";
    div.style.top = "-10px";
    div.style.right = "0";
    div.style.transform = "translateY(-100%)";
    div.style.backgroundColor = "white";
    div.style.color = "black";
    div.style.padding = "10px 14px";
    div.style.borderRadius = "10px";
    div.style.border = "1px solid #e0e0e0";
    div.style.textAlign = "right";
    div.style.display = "flex";
    div.style.whiteSpace = "nowrap";
    div.style.fontSize = "14px";

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
