chrome.tabs.onUpdated.addListener((tabId, _, tab) => {
  const { url } = tab;
  chrome.tabs.sendMessage(tabId, { url });
});
