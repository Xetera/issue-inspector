const REACTIONS_PARENT_CLASS = ".user-has-reacted";
const REACTION_CLASS = ".timeline-comment";
const APPENDER_PARENT_CONTAINER = "#js-repo-pjax-container";
import "./style.css";

const SIDE_ISSUE = "__side-issue";
const SCROLLED_HEADER_HEIGHT = 60;

const selectAll =
  (e: Element | Document) =>
  (query: string): NodeListOf<Element> =>
    e.querySelectorAll(query);
const select =
  (e: Element | Document) =>
  (query: string): Element =>
    e.querySelector(query);

const $ = select(document);
const $$ = selectAll(document);

const weights = {
  THUMBS_UP: 1,
  HOORAY: 0.8,
  HEART: 0.7,
  ROCKET: 0.5,
  CONFUSED: 0.1,
  THUMBS_DOWN: -1,
};

const reactionLabels = Object.keys(weights);

const issueParent = `
    <div id="__issue-parent">
      <span class="__issue-header" id="__issue-header">
        <div id="__issue-toggle-wrapper" title="Toggle issue visibility">
        </div>
      </span>
      <div id="__issue-wrapper"></div>
    </div>
`;

const backTopButton = `
    <button class="btn-link reaction-summary-item __back-top-btn">Back up</button>
`;

const scrollToElement = (
  elem: Element,
  opts: Omit<ScrollOptions, "top"> = {}
) => {
  const destination = elem.getBoundingClientRect().top;
  const { pageYOffset } = window;
  window.scrollTo({
    top: destination + pageYOffset - SCROLLED_HEADER_HEIGHT,
    ...opts,
  });
};

const lookFor = /^https:\/\/github.com\/.+\/.+\/issues\/\d+/;
chrome.runtime.onMessage.addListener((msg) => {
  const isIssue = lookFor.test(msg.url);
  const alreadyMounted = $("#__issue-parent");
  if (isIssue) {
    if (!alreadyMounted) {
      main();
    }
  } else {
    $("#__issue-parent").remove();
  }
});

const createAppendableIssue = (html: Element): Node => {
  const copy = html.cloneNode(true) as Element;
  copy.classList.add(SIDE_ISSUE);
  const overlay = document.createElement("div");
  overlay.classList.add("__issue-reaction-overlay");
  copy.appendChild(overlay);
  const $c = select(copy);
  const body = $c("td.comment-body");
  const children = Array.from(body.childNodes).slice(0, 5);
  body.innerHTML = "";
  children.forEach((child) => body.appendChild(child));

  const author = $c(".author").textContent;
  $c(".timeline-comment-header").innerHTML = author;
  const label = $c(".timeline-comment-label");
  if (label) {
    label.remove();
  }
  // $c(".timeline-comment-action").remove();
  $c(".new-reactions-dropdown").remove();
  const summary = $c("summary.add-reaction-btn");
  if (summary) summary.remove();
  const details = $c("details.details-overlay");
  if (details) {
    details.remove();
  }
  copy.addEventListener("click", () => {
    if (!html.querySelector(".__back-top-btn")) {
      const target = html.querySelector(".comment-reactions-options");
      const back = document.createElement("button");
      back.classList.add("btn-link", "reaction-summary-item", "__back-top-btn");
      back.textContent = "Jump back";
      back.addEventListener("click", () => {
        scrollToElement(copy as Element);
      });
      target.appendChild(back);
    }
    scrollToElement(html);
  });
  return copy;
};

const hasReactions = (elem: HTMLElement) =>
  select(elem)(REACTIONS_PARENT_CLASS) !== null;

const reactions = (elem: HTMLElement) =>
  select(elem)(`${REACTIONS_PARENT_CLASS} > button`);

const weigh = (elem: Element): number => {
  return reactionLabels.reduce((all, label) => {
    // fragile selector, could break at any point probably
    const reaction = elem.querySelector(`button[value="${label} react"]`);
    if (!reaction) {
      return all;
    }
    // reactions with only 1 vote don't have text so we know it's 1 by default
    const [countStr] = reaction.textContent.match(/(\d+)/) || [1];
    const count = Number(countStr);
    const diff = weights[label] * count;
    return all + diff;
  }, 0);
};

const createHeader = (count: number): Node => {
  const img = document.createElement("img");
  img.src = chrome.extension.getURL("magnifying_glass.png");
  img.classList.add("__issue-toggle");
  $("#__issue-toggle-wrapper").addEventListener("click", () => {
    console.log("clicked");
    $("#__issue-toggle-wrapper").classList.toggle("__hidden-toggle");
    $(`#__issue-wrapper`).classList.toggle("__hidden-issue");
  });
  return img;
};

const main = () => {
  console.log("main running");
  // exclude original comment
  const comments = Array.from($$(REACTION_CLASS)).slice(1);
  if (!comments.length) {
    return;
  }
  const appender = $(APPENDER_PARENT_CONTAINER);
  appender.insertAdjacentHTML("beforebegin", issueParent);

  const relevantComments = comments.filter(hasReactions);
  console.log(relevantComments);

  if (!relevantComments.length) {
    console.debug("Could not find any comments to highlight");
    return;
  }

  const copies = relevantComments.map(createAppendableIssue) as Element[];

  const header = createHeader(relevantComments.length);
  $("#__issue-toggle-wrapper").appendChild(header);
  const wrapper = $("#__issue-wrapper");
  copies.sort((a, b) => weigh(b) - weigh(a));
  copies.forEach((copy) => wrapper.appendChild(copy));
};
