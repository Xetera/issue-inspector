const REACTIONS_PARENT_CLASS = ".comment-reactions-options";
const REACTION_CLASS = ".timeline-comment";
const HEADER_CLASS = ".gh-header-actions";
const APPENDER_PARENT_CONTAINER = "#js-repo-pjax-container";

const SIDE_ISSUE = "__side-issue";
const SCROLLED_HEADER_HEIGHT = 60;

const $ = e => document.querySelector(e);
const $$ = e => document.querySelectorAll(e);

const weights = {
  THUMBS_UP: 1,
  HOORAY: 0.8,
  HEART: 0.7,
  ROCKET: 0.5,
  CONFUSED: 0.1,
  THUMBS_DOWN: -1
};

const reactionLabels = Object.keys(weights);

const toggleButton = (count: number) =>
  `<span class="Box-body __issue-header">Showing ${count} solutions</span>`;

const globalStyle = `
  .${SIDE_ISSUE}.timeline-comment--caret:after, .${SIDE_ISSUE}.timeline-comment--caret:before {
      content: none !important;
  }
  .${SIDE_ISSUE} .comment-body {
      max-height: 150px;
      overflow: hidden;
  }
  .${SIDE_ISSUE} {
      width: 20vw;
      z-index: 50;
      margin-bottom: 15px;
      cursor: pointer;
      transition: ease-in-out 0.3s;
  }
  .${SIDE_ISSUE}:hover {
    box-shadow: 3px 3px 12px;
    transform: translateY(-8px);
  }
  .__issue-header {
      width: 20vw;
      margin-bottom: 15px;
  }
  .__hidden_issue {
      display: none;
  }
  @keyframes shadow-pulse {
    0% {
        box-shadow: 0 0 0 0px rgba(0, 0, 0, 0.2);
    }
    100% {
        box-shadow: 0 0 0 35px rgba(0, 0, 0, 0);
    }
  }
`;

const issueParent = `
    <div id="__issue-parent" style="
        width: 100%;
        top: 200px;
        padding-right: 10px;
        position: absolute;
        display: flex;
        align-items: flex-end;
        flex-direction: column;
    ">
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
    ...opts
  });
};

const lookFor = /^https:\/\/github.com\/.+\/.+\/issues\/\d+/;
chrome.runtime.onMessage.addListener(msg => {
  const isIssue = lookFor.test(msg.url);
  console.log(msg.url);
  const alreadyMounted = $("#__issue-parent");
  console.log(isIssue);
  console.log(alreadyMounted);
  if (isIssue) {
    if (!alreadyMounted) {
      main();
    }
  } else {
    $("#__issue-parent").remove();
  }
});

const createAppendableIssue = (html: Element): Node => {
  // I don't know why I have to do so many ts-ignores here lol
  const copy = html.cloneNode(true);
  // @ts-ignore
  copy.classList.add(SIDE_ISSUE);
  // @ts-ignore
  const body = copy.querySelector("td.comment-body");
  // @ts-ignore
  const children = Array.from(body.childNodes).slice(0, 5);
  body.innerHTML = "";
  children.forEach(child => body.appendChild(child));

  // @ts-ignore
  const author = copy.querySelector(".author").textContent;
  // @ts-ignore
  copy.querySelector(".timeline-comment-header-text").innerHTML = author;
  // @ts-ignore
  const label = copy.querySelector(".timeline-comment-label");
  if (label) {
    // @ts-ignore
    label.remove();
  }
  // @ts-ignore
  copy.querySelector(".timeline-comment-action").remove();
  // @ts-ignore
  copy.querySelector(".timeline-comment-actions").remove();
  const summary = copy
    // @ts-ignore
    .querySelector("summary.add-reaction-btn");
  if (summary) summary.remove();
  const details = copy
    // @ts-ignore
    .querySelector("details.details-overlay");
  if (details) details.remove();
  // @ts-ignore
  copy.onclick = () => {
    if (!html.querySelector(".__back-top-btn")) {
      const target = html.querySelector(".comment-reactions-options");
      const back = document.createElement("button");
      back.classList.add("btn-link", "reaction-summary-item", "__back-top-btn");
      back.textContent = "Jump back";
      back.onclick = () => {
        scrollToElement(copy as Element);
        // @ts-ignore
        // html.style.animation = "shadow-pulse 1s infinite";
      };
      target.appendChild(back);
    }
    scrollToElement(html);
  };
  return copy;
};

const hasReactions = (elem: HTMLElement) =>
  elem.querySelector(REACTIONS_PARENT_CLASS) !== null;

const reactions = (elem: HTMLElement) =>
  elem.querySelectorAll(`${REACTIONS_PARENT_CLASS} > button`);

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
  const div = document.createElement("div");
  div.classList.add("Box-body", "__issue-header");
  div.innerText = `Showing ${count} popular comments`;
  div.addEventListener("mousedown", () => {
    $$(SIDE_ISSUE).forEach(issue => {
      issue.classList.toggle("__hidden-issue");
    });
  });
  return div;
};

const main = () => {
  console.log("main running");
  // exclude original comment
  // @ts-ignore
  const comments = Array.from($$(REACTION_CLASS)).slice(1);
  if (!comments.length) {
    return;
  }
  const appender = $(APPENDER_PARENT_CONTAINER);
  appender.insertAdjacentHTML("beforebegin", issueParent);

  const style = document.createElement("style");
  style.innerHTML = globalStyle;
  document.head.appendChild(style);

  const overlay = $("#__issue-parent");

  const relevantComments = comments.filter(hasReactions);

  if (!relevantComments.length) {
    return;
  }

  const copies = relevantComments.map(createAppendableIssue) as Element[];

  const header = createHeader(relevantComments.length);
  overlay.appendChild(header);
  copies.sort((a, b) => weigh(b) - weigh(a));
  copies.forEach(copy => overlay.appendChild(copy));
};
