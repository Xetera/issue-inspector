chrome.webNavigation.onCompleted.addListener(details => {
  const { url, tabId } = details;
  chrome.tabs.sendMessage(tabId, { url });
});

chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
  const { url, tabId } = details;
  chrome.tabs.sendMessage(tabId, { url });
});
