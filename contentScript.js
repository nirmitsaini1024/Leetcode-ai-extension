// Function to extract problem details from LeetCode page
function getProblemDetails() {
  
  // Strategy 1: Extract title from the specific LeetCode structure you provided
  let titleElem = document.querySelector('a[href*="/problems/"]') ||
                 document.querySelector('.text-title-large a') ||
                 document.querySelector('[class*="text-title-large"]') ||
                 document.querySelector('h1') ||
                 document.querySelector('[data-cy="question-title"]');
  
  // Strategy 2: Extract difficulty from the difficulty badge
  let difficultyElem = document.querySelector('[class*="text-difficulty-easy"]') ||
                      document.querySelector('[class*="text-difficulty-medium"]') ||
                      document.querySelector('[class*="text-difficulty-hard"]') ||
                      document.querySelector('[data-difficulty]') ||
                      document.querySelector('.bg-fill-secondary');
  
  // Strategy 3: Extract description from the elfjS class (specific to LeetCode)
  let descriptionElem = document.querySelector('.elfjS[data-track-load="description_content"]') ||
                       document.querySelector('.elfjS') ||
                       document.querySelector('[data-track-load="description_content"]') ||
                       document.querySelector('[class*="description"]');
  
 
  
  // Extract title
  let title = '';
  if (titleElem) {
    title = titleElem.textContent || titleElem.innerText || '';
    title = title.trim();
    // Clean up title (remove numbers like "1. ")
    title = title.replace(/^\d+\.\s*/, '');
  }
  
  // Final fallback: extract from URL and clean it up
  if (!title || title === '') {
    const urlMatch = window.location.pathname.match(/\/problems\/([^\/]+)/);
    if (urlMatch) {
      title = urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }
  
  // Clean up any URL parameters that got mixed in
  title = title.split('?')[0]; // Remove everything after ?
  title = title.replace(/EnvType.*$/i, ''); // Remove EnvType and everything after
  title = title.trim();
  
  // Last resort fallback
  if (!title || title === '') {
    title = 'Current Problem';
  }
  
  // Extract difficulty
  let difficulty = 'Unknown Difficulty';
  if (difficultyElem) {
    const text = difficultyElem.textContent.trim();
    if (text.toLowerCase().includes('easy')) difficulty = 'Easy';
    else if (text.toLowerCase().includes('medium')) difficulty = 'Medium';
    else if (text.toLowerCase().includes('hard')) difficulty = 'Hard';
    else if (text === 'Easy' || text === 'Medium' || text === 'Hard') difficulty = text;
  }
  
  // Extract description
  let description = 'Loading problem description...';
  if (descriptionElem) {
    description = descriptionElem.innerHTML || descriptionElem.textContent;
    // Clean up the description
    description = description.replace(/<script.*?<\/script>/gs, '');
    if (description.length > 1000) {
      description = description.substring(0, 1000) + '...';
    }
  }
  
  const result = {
    title: title,
    difficulty: difficulty,
    description: description,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
  
  return result;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === "getProblemDetails") {
    try {
      const details = getProblemDetails();
      sendResponse(details);
    } catch (error) {
      sendResponse({
        title: 'Error',
        difficulty: 'Unknown',
        description: 'Failed to extract problem details: ' + error.message,
        url: window.location.href,
        error: true
      });
    }
  }
  return true; // Required for async response
});

// Auto-refresh problem details when navigation occurs
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    // Wait a bit for the page to load
    setTimeout(() => {
      chrome.runtime.sendMessage({action: "problemChanged"}).catch(() => {
        // Popup might not be open, ignore error
      });
    }, 1500);
  }
});

// Start observing
if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
} else {
  // If body doesn't exist yet, wait for it
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

// Inject our styles
const style = document.createElement('style');
style.textContent = `
  .leetcode-assistant-hint {
    background-color: #f8f9fa;
    border-left: 3px solid #007bff;
    padding: 10px;
    margin: 10px 0;
    border-radius: 4px;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .typing-indicator {
    display: inline-flex;
    gap: 4px;
  }
  
  .typing-indicator span {
    width: 8px;
    height: 8px;
    background: #666;
    border-radius: 50%;
    display: inline-block;
    animation: bounce 1.4s infinite ease-in-out;
  }
  
  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-5px); }
  }
`;

if (document.head) {
  document.head.appendChild(style);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
  });
}


// Test extraction immediately when script loads
setTimeout(() => {
  getProblemDetails();
}, 1000);