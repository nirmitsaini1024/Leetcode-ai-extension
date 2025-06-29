// Function to extract problem details from LeetCode page
function getProblemDetails() {
  // Strategy 1: Extract title from the specific LeetCode structure
  const titleElem =
    document.querySelector('a[href*="/problems/"]') ||
    document.querySelector(".text-title-large a") ||
    document.querySelector('[class*="text-title-large"]') ||
    document.querySelector("h1") ||
    document.querySelector('[data-cy="question-title"]')

  // Strategy 2: Extract difficulty from the difficulty badge
  const difficultyElem =
    document.querySelector('[class*="text-difficulty-easy"]') ||
    document.querySelector('[class*="text-difficulty-medium"]') ||
    document.querySelector('[class*="text-difficulty-hard"]') ||
    document.querySelector("[data-difficulty]") ||
    document.querySelector(".bg-fill-secondary")

  // Strategy 3: Extract description from the elfjS class (specific to LeetCode)
  const descriptionElem =
    document.querySelector('.elfjS[data-track-load="description_content"]') ||
    document.querySelector(".elfjS") ||
    document.querySelector('[data-track-load="description_content"]') ||
    document.querySelector('[class*="description"]')

  // Extract title
  let title = ""
  if (titleElem) {
    title = titleElem.textContent || titleElem.innerText || ""
    title = title.trim()
    // Clean up title (remove numbers like "1. ")
    title = title.replace(/^\d+\.\s*/, "")
  }

  // Final fallback: extract from URL and clean it up
  if (!title || title === "") {
    const urlMatch = window.location.pathname.match(/\/problems\/([^/]+)/)
    if (urlMatch) {
      title = urlMatch[1].replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }
  }

  // Clean up any URL parameters that got mixed in
  title = title.split("?")[0] // Remove everything after ?
  title = title.replace(/EnvType.*$/i, "") // Remove EnvType and everything after
  title = title.trim()

  // Last resort fallback
  if (!title || title === "") {
    title = "Current Problem"
  }

  // Extract difficulty
  let difficulty = "Unknown Difficulty"
  if (difficultyElem) {
    const text = difficultyElem.textContent.trim()
    if (text.toLowerCase().includes("easy")) difficulty = "Easy"
    else if (text.toLowerCase().includes("medium")) difficulty = "Medium"
    else if (text.toLowerCase().includes("hard")) difficulty = "Hard"
    else if (text === "Easy" || text === "Medium" || text === "Hard") difficulty = text
  }

  // Extract description
  let description = "Loading problem description..."
  if (descriptionElem) {
    description = descriptionElem.innerHTML || descriptionElem.textContent
    // Clean up the description
    description = description.replace(/<script.*?<\/script>/gs, "")
    if (description.length > 1000) {
      description = description.substring(0, 1000) + "..."
    }
  }

  return {
    title: title,
    difficulty: difficulty,
    description: description,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  }
}

// LeetCode Assistant Drawer Implementation
;(() => {
  // Enhanced styles for better dark/light theme support
  const styles = `
    #leetcode-assistant-container {
      position: fixed;
      top: 0;
      right: -450px;
      width: 450px;
      height: 100vh;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: #f5f5f5;
      box-shadow: -8px 0 32px rgba(0,0,0,0.4);
      transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      border-left: 2px solid #404040;
      backdrop-filter: blur(10px);
    }

    #leetcode-assistant-container.open {
      right: 0;
    }

    #leetcode-assistant-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      background: linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%);
      color: #ffffff;
      border-bottom: 2px solid #404040;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    #leetcode-assistant-header h3 {
      margin: 0;
      color: #ffffff;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    #leetcode-assistant-close {
      cursor: pointer;
      font-size: 28px;
      color: #cccccc;
      opacity: 0.8;
      transition: all 0.3s ease;
      padding: 4px;
      border-radius: 4px;
      line-height: 1;
    }

    #leetcode-assistant-close:hover {
      opacity: 1;
      color: #ffffff;
      background: rgba(255,255,255,0.1);
      transform: scale(1.1);
    }

    #leetcode-assistant-settings {
      cursor: pointer;
      font-size: 20px;
      color: #cccccc;
      opacity: 0.8;
      transition: all 0.3s ease;
      padding: 4px;
      border-radius: 4px;
      line-height: 1;
    }

    #leetcode-assistant-settings:hover {
      opacity: 1;
      color: #ffffff;
      background: rgba(255,255,255,0.1);
      transform: scale(1.1);
    }

    #leetcode-assistant-problem-details {
      padding: 20px 24px;
      background: linear-gradient(135deg, #252525 0%, #353535 100%);
      border-bottom: 2px solid #404040;
      color: #f0f0f0;
      box-shadow: inset 0 -1px 0 rgba(255,255,255,0.1);
    }

    #leetcode-assistant-problem-details h3 {
      color: #ffffff;
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
    }

    #leetcode-assistant-problem-details p {
      margin: 8px 0;
      color: #e0e0e0;
      line-height: 1.5;
    }

    #leetcode-assistant-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    #leetcode-assistant-messages {
      flex-grow: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: linear-gradient(180deg, #1a1a1a 0%, #1e1e1e 100%);
      min-height: 400px;
    }

    #leetcode-assistant-messages::-webkit-scrollbar {
      width: 10px;
    }

    #leetcode-assistant-messages::-webkit-scrollbar-track {
      background: #2a2a2a;
      border-radius: 5px;
    }

    #leetcode-assistant-messages::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #5a6fd8 0%, #4a5ec8 100%);
      border-radius: 5px;
      border: 2px solid #2a2a2a;
    }

    #leetcode-assistant-messages::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #6a7fe8 0%, #5a6ed8 100%);
    }

    #leetcode-assistant-input-area {
      display: flex;
      padding: 20px 24px;
      border-top: 2px solid #404040;
      background: linear-gradient(135deg, #252525 0%, #353535 100%);
      gap: 12px;
    }

    #leetcode-assistant-input {
      flex-grow: 1;
      padding: 14px 16px;
      border: 2px solid #444444;
      border-radius: 8px;
      outline: none;
      background: linear-gradient(135deg, #2a2a2a 0%, #323232 100%);
      color: #f5f5f5;
      font-size: 14px;
      transition: all 0.3s ease;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
    }

    #leetcode-assistant-input:focus {
      border-color: #5a6fd8;
      box-shadow: 0 0 0 3px rgba(90,111,216,0.3), inset 0 2px 4px rgba(0,0,0,0.2);
      background: linear-gradient(135deg, #323232 0%, #3a3a3a 100%);
    }

    #leetcode-assistant-input::placeholder {
      color: #aaaaaa;
    }

    #leetcode-assistant-send {
      padding: 14px 20px;
      background: linear-gradient(135deg, #5a6fd8 0%, #4a5ec8 100%);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(90,111,216,0.3);
    }

    #leetcode-assistant-send:hover {
      background: linear-gradient(135deg, #6a7fe8 0%, #5a6ed8 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(90,111,216,0.4);
    }

    #leetcode-assistant-send:active {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(90,111,216,0.3);
    }

    #leetcode-assistant-send:disabled {
      background: #666666;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Integrated AI Button Styles - matches LeetCode's design */
    .leetcode-ai-button-container {
      position: relative;
      display: flex;
      overflow: hidden;
      border-radius: inherit;
      background: inherit;
    }

    .leetcode-ai-button {
      position: relative;
      display: flex;
      flex: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 8px;
      color: #5a6fd8;
      transition: all 0.2s ease;
      background: transparent;
      border: none;
      outline: none;
    }

    .leetcode-ai-button:hover {
      background: rgba(90, 111, 216, 0.1);
      color: #6a7fe8;
    }

    .leetcode-ai-button:active {
      transform: scale(0.95);
    }

    .leetcode-ai-icon {
      position: relative;
      width: 16px;
      height: 16px;
      display: block;
    }

    .leetcode-ai-icon::before {
      content: '🤖';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 1em;
      height: 1em;
      transform: translate(-50%, -50%);
      font-size: 16px;
      line-height: 1;
    }

    .leetcode-assistant-message {
      max-width: 90%;
      padding: 16px 20px;
      border-radius: 16px;
      line-height: 1.6;
      word-wrap: break-word;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      position: relative;
    }

    .leetcode-assistant-user {
      background: linear-gradient(135deg, #4a5ec8 0%, #5a6fd8 100%);
      color: #ffffff;
      align-self: flex-end;
      margin-left: auto;
      border-bottom-right-radius: 4px;
    }

    .leetcode-assistant-assistant {
      background: linear-gradient(135deg, #2a2a2a 0%, #363636 100%);
      color: #f5f5f5;
      align-self: flex-start;
      margin-right: auto;
      border-bottom-left-radius: 4px;
      border: 1px solid #404040;
    }

    .leetcode-assistant-difficulty {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 700;
      margin-left: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .leetcode-assistant-difficulty-easy {
      background: linear-gradient(135deg, rgba(0, 175, 155, 0.3) 0%, rgba(0, 175, 155, 0.2) 100%);
      color: #00d4aa;
      border: 1px solid rgba(0, 175, 155, 0.4);
    }

    .leetcode-assistant-difficulty-medium {
      background: linear-gradient(135deg, rgba(255, 184, 0, 0.3) 0%, rgba(255, 184, 0, 0.2) 100%);
      color: #ffc107;
      border: 1px solid rgba(255, 184, 0, 0.4);
    }

    .leetcode-assistant-difficulty-hard {
      background: linear-gradient(135deg, rgba(255, 45, 85, 0.3) 0%, rgba(255, 45, 85, 0.2) 100%);
      color: #ff6b85;
      border: 1px solid rgba(255, 45, 85, 0.4);
    }

    .typing-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 16px 20px;
      background: linear-gradient(135deg, #2a2a2a 0%, #363636 100%);
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      border: 1px solid #404040;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      margin-right: auto;
      align-self: flex-start;
    }

    .typing-indicator-text {
      color: #cccccc;
      font-size: 14px;
      margin-right: 8px;
    }

    .typing-indicator-dots {
      display: flex;
      gap: 4px;
    }

    .typing-indicator-dots span {
      width: 8px;
      height: 8px;
      background: linear-gradient(135deg, #5a6fd8 0%, #4a5ec8 100%);
      border-radius: 50%;
      display: inline-block;
      animation: typing-bounce 1.4s infinite ease-in-out;
      box-shadow: 0 2px 4px rgba(90,111,216,0.3);
    }

    .typing-indicator-dots span:nth-child(1) {
      animation-delay: 0s;
    }

    .typing-indicator-dots span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator-dots span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing-bounce {
      0%, 60%, 100% { 
        transform: translateY(0) scale(1);
        opacity: 0.7;
      }
      30% { 
        transform: translateY(-8px) scale(1.2);
        opacity: 1;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    /* Enhanced message styling */
    .leetcode-assistant-message strong {
      color: #ffffff;
      font-weight: 700;
    }

    .leetcode-assistant-message em {
      color: #e0e0e0;
      font-style: italic;
    }

    .leetcode-assistant-message code {
      background: rgba(90,111,216,0.2);
      color: #a8b5ff;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
    }

    /* Light theme support */
    body.light-theme #leetcode-assistant-container,
    body[data-theme="light"] #leetcode-assistant-container {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      color: #212529;
      border-left-color: #dee2e6;
    }

    body.light-theme #leetcode-assistant-header,
    body[data-theme="light"] #leetcode-assistant-header {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      color: #212529;
      border-bottom-color: #dee2e6;
    }

    body.light-theme #leetcode-assistant-problem-details,
    body[data-theme="light"] #leetcode-assistant-problem-details {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      color: #495057;
      border-bottom-color: #dee2e6;
    }

    body.light-theme #leetcode-assistant-messages,
    body[data-theme="light"] #leetcode-assistant-messages {
      background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
    }

    body.light-theme .leetcode-assistant-assistant,
    body[data-theme="light"] .leetcode-assistant-assistant {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      color: #212529;
      border-color: #dee2e6;
    }

    /* Responsive design for smaller screens */
    @media (max-width: 768px) {
      #leetcode-assistant-container {
        width: 100vw;
        right: -100vw;
      }
    }
  `

  // Create style element
  const styleEl = document.createElement("style")
  styleEl.textContent = styles
  document.head.appendChild(styleEl)

  // Create drawer container
  const container = document.createElement("div")
  container.id = "leetcode-assistant-container"
  container.innerHTML = `
    <div id="leetcode-assistant-header">
      <h3>🤖 LeetCode Assistant</h3>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span id="leetcode-assistant-settings" title="Settings">⚙️</span>
        <span id="leetcode-assistant-close">&times;</span>
      </div>
    </div>
    <div id="leetcode-assistant-problem-details"></div>
    <div id="leetcode-assistant-content">
      <div id="leetcode-assistant-messages"></div>
      <div id="leetcode-assistant-input-area">
        <input type="text" id="leetcode-assistant-input" placeholder="Ask me anything about this problem...">
        <button id="leetcode-assistant-send">Send</button>
      </div>
    </div>
  `
  document.body.appendChild(container)

  // References to DOM elements
  const drawerContainer = document.getElementById("leetcode-assistant-container")
  const problemDetailsEl = document.getElementById("leetcode-assistant-problem-details")
  const closeBtn = document.getElementById("leetcode-assistant-close")
  const settingsBtn = document.getElementById("leetcode-assistant-settings")
  const messagesContainer = document.getElementById("leetcode-assistant-messages")
  const inputEl = document.getElementById("leetcode-assistant-input")
  const sendBtn = document.getElementById("leetcode-assistant-send")

  // Conversation history storage
  let conversationHistories = {}  // Store conversations by problem URL
  let currentProblem = null
  let userApiKey = null

  // Load conversation histories from localStorage
  function loadConversationHistories() {
    try {
      const saved = localStorage.getItem('leetcode-assistant-conversations')
      if (saved) {
        conversationHistories = JSON.parse(saved)
        console.log('✅ Loaded conversation histories:', Object.keys(conversationHistories).length, 'problems')
        
        // Debug: Log the loaded data
        Object.keys(conversationHistories).forEach(key => {
          const conv = conversationHistories[key]
          console.log(`📚 Problem: ${conv.problemDetails?.title || key}, Messages: ${conv.messages?.length || 0}`)
        })
      } else {
        console.log('📝 No existing conversation histories found in localStorage')
        conversationHistories = {}
      }
    } catch (error) {
      console.error('❌ Error loading conversation histories:', error)
      conversationHistories = {}
    }
  }

  // Save conversation histories to localStorage
  function saveConversationHistories() {
    try {
      localStorage.setItem('leetcode-assistant-conversations', JSON.stringify(conversationHistories))
      console.log('✅ Saved conversation histories for', Object.keys(conversationHistories).length, 'problems')
      
      // Debug: Log the actual data being saved
      const savedData = JSON.stringify(conversationHistories, null, 2)
      console.log('📦 Saved data:', savedData.substring(0, 500) + (savedData.length > 500 ? '...' : ''))
    } catch (error) {
      console.error('❌ Error saving conversation histories:', error)
    }
  }

  // Debug function to check localStorage state
  function debugLocalStorage() {
    try {
      const saved = localStorage.getItem('leetcode-assistant-conversations')
      console.log('🔍 Current localStorage data:', saved ? JSON.parse(saved) : 'null')
      console.log('🔍 In-memory conversations:', conversationHistories)
    } catch (error) {
      console.error('❌ Error reading localStorage:', error)
    }
  }

  // Clean up inconsistent URL keys in localStorage
  function cleanupConversationKeys() {
    try {
      const keys = Object.keys(conversationHistories)
      const cleanedHistories = {}
      let mergedCount = 0

      keys.forEach(key => {
        // Normalize the key
        const normalizedKey = key
          .replace(/\/description\/?/g, '/') // Remove /description/
          .replace(/\?.*$/, '') // Remove query parameters
          .replace(/\/$/, '') // Remove trailing slash
          .split('?')[0] // Additional safety for query params

        if (cleanedHistories[normalizedKey]) {
          // Merge conversations if they exist for the same normalized key
          const existing = cleanedHistories[normalizedKey]
          const current = conversationHistories[key]
          
          // Keep the one with more messages, or the newer one
          if (current.messages.length > existing.messages.length) {
            cleanedHistories[normalizedKey] = current
          }
          mergedCount++
          console.log(`🔄 Merged conversation for key: ${key} → ${normalizedKey}`)
        } else {
          cleanedHistories[normalizedKey] = conversationHistories[key]
        }
      })

      if (mergedCount > 0) {
        conversationHistories = cleanedHistories
        saveConversationHistories()
        console.log(`🧹 Cleaned up ${mergedCount} duplicate conversation keys`)
      }
    } catch (error) {
      console.error('❌ Error cleaning up conversation keys:', error)
    }
  }

  // Initialize storage on script load
  loadConversationHistories()
  cleanupConversationKeys() // Clean up any inconsistent keys
  debugLocalStorage() // Debug: Check localStorage state on load

  // Load user API key from storage
  function loadUserApiKey() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['userApiKey'], (result) => {
        userApiKey = result.userApiKey || null
        console.log('🔑 Loaded API key:', userApiKey ? 'Custom key set' : 'Using default key')
      })
    } else {
      // For non-extension environments, try to get from localStorage
      try {
        const savedKey = localStorage.getItem('leetcode-assistant-api-key')
        userApiKey = savedKey || null
        console.log('🔑 Loaded API key:', userApiKey ? 'Custom key set' : 'Using default key')
      } catch (error) {
        console.log('🔑 Using default API key')
        userApiKey = null
      }
    }
  }

  // Load API key on initialization
  loadUserApiKey()

  // Function to inject AI button into the specific location
  function injectAIButton() {
    // Wait for the page to load
    const checkAndInject = () => {
      // Look for the note-sticky icon container
      const noteStickyContainer = document.querySelector('[data-icon="note-sticky"]')?.closest('.group')
      
      if (noteStickyContainer) {
        // Check if AI button already exists
        if (document.querySelector('.leetcode-ai-button')) {
          return
        }

        // Find the parent container with the rounded background
        const parentContainer = noteStickyContainer.closest('.relative.flex.overflow-hidden.rounded')
        
        if (parentContainer) {
          // Create AI button container
          const aiButtonContainer = document.createElement('div')
          aiButtonContainer.className = 'w-[1px] flex-none bg-layer-bg-gray dark:bg-layer-bg-gray'
          
          const aiButtonWrapper = document.createElement('div')
          aiButtonWrapper.className = 'group flex flex-none items-center justify-center hover:bg-fill-quaternary dark:hover:bg-fill-quaternary'
          
          const aiButton = document.createElement('button')
          aiButton.className = 'leetcode-ai-button'
          aiButton.setAttribute('data-state', 'closed')
          aiButton.title = 'Open AI Assistant'
          
          const aiIcon = document.createElement('div')
          aiIcon.className = 'leetcode-ai-icon'
          
          aiButton.appendChild(aiIcon)
          aiButtonWrapper.appendChild(aiButton)
          
          // Add separator and button after the note-sticky button
          parentContainer.appendChild(aiButtonContainer)
          parentContainer.appendChild(aiButtonWrapper)

          // Add click event listener
          aiButton.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            
            // Directly open the chat drawer
            initializeProblemDetails()
            toggleDrawer()
          })

          console.log('AI button injected successfully')
        }
      } else {
        // Retry after a short delay if elements not found
        setTimeout(checkAndInject, 1000)
      }
    }

    // Initial check
    checkAndInject()
    
    // Also check when the page changes (for SPA navigation)
    const observer = new MutationObserver(() => {
      if (window.location.pathname.includes('/problems/')) {
        setTimeout(checkAndInject, 500)
      }
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  // Toggle drawer
  function toggleDrawer() {
    drawerContainer.classList.toggle("open")
  }

  // Close drawer when clicking outside
  function handleOutsideClick(e) {
    if (
      !drawerContainer.contains(e.target) &&
      drawerContainer.classList.contains("open")
    ) {
      toggleDrawer()
    }
  }

  // Difficulty color mapping
  function getDifficultyColor(difficulty) {
    const diff = difficulty.toLowerCase()
    if (diff.includes("easy")) return "easy"
    if (diff.includes("medium")) return "medium"
    if (diff.includes("hard")) return "hard"
    return ""
  }

  // Event Listeners
  closeBtn.addEventListener("click", toggleDrawer)
  settingsBtn.addEventListener("click", openSettingsModal)
  document.addEventListener("click", handleOutsideClick)

  // Send message functionality
  sendBtn.addEventListener("click", sendMessage)
  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage()
  })

  // Initialize conversation
  function initializeProblemDetails() {
    // Extract problem details
    currentProblem = getProblemDetails()
    
    // Normalize URL to create consistent keys
    // Remove /description/, query parameters, and trailing slashes
    let problemKey = currentProblem.url
      .replace(/\/description\/?/g, '/') // Remove /description/
      .replace(/\?.*$/, '') // Remove query parameters
      .replace(/\/$/, '') // Remove trailing slash
      .split('?')[0] // Additional safety for query params
    
    // Ensure we have a clean problem URL
    if (!problemKey.includes('/problems/')) {
      problemKey = currentProblem.url.split('?')[0]
    }

    // Display problem details
    const difficultyClass = `leetcode-assistant-difficulty-${getDifficultyColor(currentProblem.difficulty)}`
    problemDetailsEl.innerHTML = `
      <h3>${currentProblem.title}</h3>
      <p>Difficulty: <span class="leetcode-assistant-difficulty ${difficultyClass}">${currentProblem.difficulty}</span></p>
      <p style="font-size: 13px; color: #cccccc; line-height: 1.4;">${currentProblem.description.substring(0, 200)}${currentProblem.description.length > 200 ? "..." : ""}</p>
    `

    console.log(`🔗 Using problem key: ${problemKey}`)

    // Check if we have existing conversation for this problem
    if (conversationHistories[problemKey]) {
      // Restore existing conversation
      const savedConversation = conversationHistories[problemKey]
      
      // Clear previous messages
      messagesContainer.innerHTML = ""
      
      // Restore messages (skip system message)
      savedConversation.messages.forEach(msg => {
        if (msg.role !== 'system') {
          addMessage(msg.role === 'user' ? 'user' : 'assistant', msg.content)
        }
      })
      
      console.log(`✅ Restored conversation for ${currentProblem.title} with ${savedConversation.messages.length - 1} messages`)
    } else {
      // Initialize new conversation
      const systemMessage = {
  role: "system",
  content: `You are a dedicated AI coding mentor focused *only* on helping users solve LeetCode problems independently through structured guidance.

      ✅ YOUR PURPOSE:
      - Help users understand and solve the given LeetCode problem without giving away the full solution.
      - Provide helpful hints, explanations, and questioning strategies to support learning.
      - Stay focused on the current problem context only.

      🚫 ABSOLUTE RULES — DO NOT BREAK:
      1. DO NOT give complete or executable code solutions under any circumstance.
      2. DO NOT answer unrelated questions or change topics. If the user asks something off-topic, politely steer back to the current problem.
      3. DO NOT mention AI, language models, yourself, or how you work.
      4. DO NOT suggest external tools, debuggers, or resources unless they are part of standard LeetCode guidance.
      5. DO NOT engage in small talk or casual conversation.

      ✅ GUIDANCE RULES:
      6. Ask insightful, open-ended questions to guide the user's thinking.
      7. Break the problem into smaller sub-problems the user can work through step by step.
      8. Discuss possible approaches (e.g. brute force, greedy, sliding window, DP, etc.), but not implementations.
      9. Highlight potential edge cases, time/space complexity issues, or input constraints to consider.
      10. Explain core concepts and patterns (e.g. binary search, recursion, memoization) in simple terms.
      11. Adapt your support to the user's progress — don’t over-explain if they already understand something.

      🧠 TONE & STYLE:
      - Be patient, encouraging, and educational.
      - Assume the user wants to learn, not be spoon-fed.
      - Never rush to a solution — make the user think and discover.

      👇 CURRENT PROBLEM CONTEXT:
      Title: ${currentProblem.title} (${currentProblem.difficulty})
      URL: ${currentProblem.url}
      Description: ${currentProblem.description.substring(0, 500)}...

      Remain completely focused on helping the user understand and solve this problem only.`,
};


      // Create new conversation history
      conversationHistories[problemKey] = {
        messages: [systemMessage],
        problemDetails: currentProblem
      }

      // Clear previous messages
      messagesContainer.innerHTML = ""

      // Add initial welcome message
      const welcomeMessage = `Great! I'm here to help you solve the **"${currentProblem.title}"** problem. 

What would you like to know? I can help you with:
• Understanding the problem requirements
• Discussing different approaches
• Analyzing time and space complexity
• Identifying edge cases
• Breaking down the solution steps

What's your first question?`

      addMessage("assistant", welcomeMessage)
      
      // Add welcome message to conversation history
      conversationHistories[problemKey].messages.push({
        role: "assistant",
        content: welcomeMessage
      })

      // Save the new conversation to localStorage
      saveConversationHistories()
      debugLocalStorage() // Debug: Verify save worked

      console.log(`📝 Created new conversation for ${currentProblem.title}`)
    }
  }

  // API Key Modal
  function openSettingsModal() {
    // Load current API key
    let currentApiKey = ""
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['userApiKey'], (result) => {
        currentApiKey = result.userApiKey || ""
        createModal(currentApiKey)
      })
    } else {
      currentApiKey = userApiKey || ""
      createModal(currentApiKey)
    }
  }

  function createModal(currentApiKey) {
    // Create modal dynamically
    const modal = document.createElement("div")
    modal.id = "leetcode-assistant-modal"
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 20000;
      backdrop-filter: blur(4px);
    `

    modal.innerHTML = `
      <div style="background: linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%); padding: 40px; border-radius: 16px; width: 450px; color: #f5f5f5; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        <h2 style="color: #ffffff; margin-bottom: 20px; font-size: 24px;">⚙️ LeetCode Assistant Settings</h2>
        <p style="color: #cccccc; margin-bottom: 30px; line-height: 1.5;">You can use the default API key or provide your own OpenAI key for better performance.</p>
        
        <div style="margin: 30px 0;">
          <label for="api-key-input" style="display: block; margin-bottom: 12px; color: #ffffff; font-weight: 600;">OpenAI API Key:</label>
          <input type="password" id="api-key-input" style="width: 100%; padding: 14px; border: 2px solid #555; border-radius: 8px; background: #1a1a1a; color: #f5f5f5; font-size: 14px;" placeholder="sk-..." value="${currentApiKey}">
          <p style="color: #aaaaaa; font-size: 12px; margin-top: 8px;">Leave empty to use the default key</p>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancel-btn" style="padding: 12px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Cancel</button>
          <button id="use-default-btn" style="padding: 12px 20px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Use Default Key</button>
          <button id="save-key-btn" style="padding: 12px 20px; background: linear-gradient(135deg, #5a6fd8 0%, #4a5ec8 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Save Key</button>
        </div>
      </div>
    `

    document.body.appendChild(modal)
    const closeModal = () => document.body.removeChild(modal)

    // Cancel button
    document.getElementById("cancel-btn").addEventListener("click", closeModal)

    // Use default key
    document.getElementById("use-default-btn").addEventListener("click", () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ userApiKey: null }, () => {
          userApiKey = null
          closeModal()
          showSuccessMessage("Using default API key")
        })
      } else {
        userApiKey = null
        localStorage.removeItem('leetcode-assistant-api-key')
        closeModal()
        showSuccessMessage("Using default API key")
      }
    })

    // Save custom key
    document.getElementById("save-key-btn").addEventListener("click", () => {
      const apiKeyInput = document.getElementById("api-key-input")
      const newApiKey = apiKeyInput.value.trim()

      if (newApiKey === "") {
        // Empty key means use default
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ userApiKey: null }, () => {
            userApiKey = null
            closeModal()
            showSuccessMessage("Using default API key")
          })
        } else {
          userApiKey = null
          localStorage.removeItem('leetcode-assistant-api-key')
          closeModal()
          showSuccessMessage("Using default API key")
        }
      } else if (newApiKey.startsWith("sk-")) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ userApiKey: newApiKey }, () => {
            userApiKey = newApiKey
            closeModal()
            showSuccessMessage("Custom API key saved successfully")
          })
        } else {
          userApiKey = newApiKey
          localStorage.setItem('leetcode-assistant-api-key', newApiKey)
          closeModal()
          showSuccessMessage("Custom API key saved successfully")
        }
      } else {
        alert('Please enter a valid OpenAI API key that starts with "sk-" or leave empty to use default')
      }
    })

    // Click outside to close
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal()
    })
  }

  // Show success message
  function showSuccessMessage(message) {
    const successEl = document.createElement("div")
    successEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 20001;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
      animation: slideIn 0.3s ease;
    `
    successEl.textContent = message
    document.body.appendChild(successEl)
    
    setTimeout(() => {
      successEl.style.animation = "slideOut 0.3s ease"
      setTimeout(() => {
        if (successEl.parentNode) {
          successEl.parentNode.removeChild(successEl)
        }
      }, 300)
    }, 2000)
  }

  // Enhanced add message function
  function addMessage(type, text) {
    const messageEl = document.createElement("div")
    messageEl.classList.add("leetcode-assistant-message")
    messageEl.classList.add(`leetcode-assistant-${type}`)

    // Convert markdown-like formatting to proper HTML
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // **bold** to <strong>
      .replace(/\*(.*?)\*/g, "<em>$1</em>") // *italic* to <em>
      .replace(/^• (.*$)/gm, "• $1") // Keep bullet points
      .replace(/^(\d+)\. /gm, "$1. ") // Keep numbered lists
      .replace(/`([^`]+)`/g, "<code>$1</code>") // `code` to <code>
      .replace(/\n/g, "<br>") // Convert line breaks

    messageEl.innerHTML = formattedText

    messagesContainer.appendChild(messageEl)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  // Enhanced typing indicator
  function showTypingIndicator() {
    const typingEl = document.createElement("div")
    typingEl.id = "typing-indicator"
    typingEl.innerHTML = `
      <div class="typing-indicator">
        <span class="typing-indicator-text">LeetCoder is thinking</span>
        <div class="typing-indicator-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `

    messagesContainer.appendChild(typingEl)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
    return typingEl
  }

  // Send message functionality
  async function sendMessage() {
    const message = inputEl.value.trim()
    if (!message) return

    // Use the same URL normalization as initializeProblemDetails
    let problemKey = currentProblem.url
      .replace(/\/description\/?/g, '/') // Remove /description/
      .replace(/\?.*$/, '') // Remove query parameters
      .replace(/\/$/, '') // Remove trailing slash
      .split('?')[0] // Additional safety for query params
    
    // Ensure we have a clean problem URL
    if (!problemKey.includes('/problems/')) {
      problemKey = currentProblem.url.split('?')[0]
    }

    // Add user message
    addMessage("user", message)
    inputEl.value = ""
    inputEl.disabled = true
    sendBtn.disabled = true

    // Show enhanced typing indicator
    const typingIndicator = showTypingIndicator()

    try {
      // Add user message to conversation history
      conversationHistories[problemKey].messages.push({ role: "user", content: message })
      saveConversationHistories() // Save after adding user message

      // Determine API key
      const apiKey = userApiKey || "your-api-key-here"

      // Make API call
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "LeetCode Assistant",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct:free",
          messages: conversationHistories[problemKey].messages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      })

      // Check response
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      // Parse response
      const data = await response.json()

      // Remove typing indicator
      if (typingIndicator) {
        typingIndicator.remove()
      }

      // Validate response
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from API")
      }

      // Get assistant response
      const assistantResponse = data.choices[0].message.content

      // Add assistant message
      addMessage("assistant", assistantResponse)

      // Add to conversation history
      conversationHistories[problemKey].messages.push({ role: "assistant", content: assistantResponse })
      saveConversationHistories() // Save after adding assistant message

      console.log(`💾 Conversation saved for ${currentProblem.title}. Total messages: ${conversationHistories[problemKey].messages.length}`)
    } catch (error) {
      console.error("AI Error:", error)

      // Remove typing indicator
      if (typingIndicator) {
        typingIndicator.remove()
      }

      // Determine error message
      let errorMessage = "Please try again."
      if (error.message.includes("API error: 401")) {
        errorMessage = "API key issue. Please check the configuration."
      } else if (error.message.includes("API error: 429")) {
        errorMessage = "Rate limited. Please wait a moment and try again."
      } else if (error.message.includes("API error: 500")) {
        errorMessage = "Server error. Please try again in a moment."
      }

      // Add error message
      addMessage("assistant", `❌ **Error:** ${errorMessage}`)
    } finally {
      // Re-enable input
      inputEl.disabled = false
      sendBtn.disabled = false
      inputEl.focus()
    }
  }

  // Inject button only on problem pages
  function shouldInjectButton() {
    return window.location.pathname.includes("/problems/")
  }

  // Initialize the assistant
  if (shouldInjectButton()) {
    // Inject the AI button into the toolbar
    injectAIButton()
    
    // Also monitor for navigation changes (SPA)
    let currentPath = window.location.pathname
    setInterval(() => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname
        if (shouldInjectButton()) {
          setTimeout(() => injectAIButton(), 1000)
        }
      }
    }, 1000)
  }
})()