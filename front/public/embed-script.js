class CrawlChatEmbed {
  constructor() {
    this.transitionDuration = 100;
    this.embedDivId = "crawlchat-embed";
    this.iframeId = "crawlchat-iframe";
    this.scriptId = "crawlchat-script";
    this.host = "https://crawlchat.app";
    this.scrapeId = this.getScrapeId();
  }

  mount() {
    const iframe = document.createElement("iframe");
    iframe.id = this.iframeId;
    iframe.src = `${this.host}/w/${this.scrapeId}?embed=true`;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.backgroundColor = "transparent";
    iframe.style.background = "transparent";
    iframe.allowTransparency = "true";
    iframe.style.opacity = "1";

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
    window.addEventListener("message", this.handleOnMessage);
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
    const iframe = document.getElementById(this.iframeId);
    iframe.contentWindow.postMessage("focus", "*");
  }

  hide() {
    const div = document.getElementById(this.embedDivId);
    div.style.opacity = "0";
    setTimeout(() => {
      div.style.width = "0px";
      div.style.height = "0px";
    }, this.transitionDuration);
  }

  handleOnMessage(event) {
    if (event.data === "close") {
      window.crawlchatEmbed.hide();
    }
  }
}

window.crawlchatEmbed = new CrawlChatEmbed();
window.crawlchatEmbed.mount();
