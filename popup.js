document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Popup loaded');
  
  // DOM Elements
  const chatMessages = document.getElementById('chat-messages');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const problemDetails = document.getElementById('problem-details');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  // State
  let currentProblem = null;
  let conversationHistory = [];
  let currentProblemUrl = null;
  let hasCollapsed = false;
  let userApiKey = null;
  
  // 🔑 DEFAULT API KEY (fallback)
  const DEFAULT_API_KEY = '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';

  // Load saved API key
  chrome.storage.local.get(['userApiKey'], (result) => {
    if (result.userApiKey) {
      userApiKey = result.userApiKey;
      apiKeyInput.value = userApiKey;
    }
  });

  // Show loading state
  addAssistantMessage("Analyzing problem details...");
  userInput.disabled = true;
  sendBtn.disabled = true;

  // Initialize immediately
  setTimeout(() => {
    initializeAssistant();
  }, 100);

  // Event Listeners
  sendBtn.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-collapse when user starts typing
  userInput.addEventListener('focus', () => {
    autoCollapseProblemAnalysis();
  });

  // Manual toggle for problem analysis
  document.addEventListener('click', (e) => {
    const problemAnalysis = document.getElementById('problem-analysis');
    if (e.target === problemAnalysis || problemAnalysis.contains(e.target)) {
      toggleProblemAnalysis();
    }
  });

  // Settings modal events
  settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
  });

  cancelBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  saveBtn.addEventListener('click', () => {
    const newApiKey = apiKeyInput.value.trim();
    
    if (newApiKey && !newApiKey.startsWith('sk-')) {
      alert('Please enter a valid OpenAI API key that starts with "sk-"');
      return;
    }
    
    userApiKey = newApiKey || null;
    
    // Save to storage
    chrome.storage.local.set({ userApiKey: userApiKey }, () => {
      console.log('API key saved:', userApiKey ? 'User key' : 'Using default key');
      settingsModal.style.display = 'none';
      
      // Show confirmation
      const message = userApiKey ? 
        'Your API key has been saved successfully!' : 
        'Reverted to default API key.';
      alert(message);
    });
  });

  // Close modal when clicking outside
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });

  // Functions
  function autoCollapseProblemAnalysis() {
    if (!hasCollapsed) {
      const problemAnalysis = document.getElementById('problem-analysis');
      if (problemAnalysis && !problemAnalysis.classList.contains('collapsed')) {
        toggleProblemAnalysis();
        hasCollapsed = true;
      }
    }
  }

  function toggleProblemAnalysis() {
    const problemAnalysis = document.getElementById('problem-analysis');
    if (!problemAnalysis) return;
    
    const isCollapsed = problemAnalysis.classList.contains('collapsed');
    
    if (isCollapsed) {
      // Expand
      problemAnalysis.classList.remove('collapsed');
      problemAnalysis.style.maxHeight = 'none';
      problemAnalysis.style.overflow = 'visible';
    } else {
      // Collapse
      problemAnalysis.classList.add('collapsed');
      problemAnalysis.style.maxHeight = '60px';
      problemAnalysis.style.overflow = 'hidden';
    }
  }

  function saveConversationState() {
    if (currentProblem && currentProblemUrl) {
      chrome.storage.local.set({
        lastProblemUrl: currentProblemUrl,
        lastConversation: conversationHistory,
        lastProblemDetails: currentProblem
      });
    }
  }

  function restoreConversation() {
    // Clear loading message
    chatMessages.innerHTML = '';
    
    // Restore all messages except the system message
    for (let i = 1; i < conversationHistory.length; i++) {
      const message = conversationHistory[i];
      if (message.role === 'user') {
        addUserMessage(message.content);
      } else if (message.role === 'assistant') {
        addAssistantMessage(message.content);
      }
    }
    
    // If no messages to restore, show initial guidance
    if (conversationHistory.length <= 1) {
      addAssistantMessage(getInitialGuidance(currentProblem));
    }
  }

  function initializeAssistant() {
    console.log('Initializing assistant...');
    
    // Check if we have a saved conversation for this problem
    chrome.storage.local.get(['lastProblemUrl', 'lastConversation', 'lastProblemDetails'], (result) => {
      getProblemDetailsWithRetry(1, 3, result);
    });
  }

  function getProblemDetailsWithRetry(attempt = 1, maxAttempts = 3, savedData = {}) {
    console.log(`Getting problem details (attempt ${attempt}/${maxAttempts})`);
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs[0]) {
        console.error('No active tab found');
        showError('No active tab found', 'Please make sure you\'re on a LeetCode problem page.');
        return;
      }

      const tab = tabs[0];
      console.log('Current tab URL:', tab.url);
      currentProblemUrl = tab.url.split('?')[0]; // Remove URL parameters for comparison

      // Check if we're on a LeetCode problem page
      if (!tab.url.includes('leetcode.com/problems/')) {
        showError('Not on LeetCode', 'Please navigate to a LeetCode problem page first.');
        return;
      }

      // Check if this is the same problem as last time
      if (savedData.lastProblemUrl === currentProblemUrl && savedData.lastConversation && savedData.lastProblemDetails) {
        console.log('Restoring previous conversation for same problem');
        currentProblem = savedData.lastProblemDetails;
        conversationHistory = savedData.lastConversation;
        
        displayProblemDetails(currentProblem);
        restoreConversation();
        enableChat();
        return;
      }

      chrome.tabs.sendMessage(
        tab.id, 
        {action: "getProblemDetails"},
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Chrome runtime error:", chrome.runtime.lastError);
            
            if (attempt < maxAttempts) {
              console.log(`Retrying in 2 seconds... (${attempt}/${maxAttempts})`);
              setTimeout(() => {
                getProblemDetailsWithRetry(attempt + 1, maxAttempts, savedData);
              }, 2000);
              return;
            }
            
            showError('Connection Failed', `
              <p>Could not connect to the LeetCode page.</p>
              <p><strong>Try this:</strong></p>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Refresh the LeetCode page</li>
                <li>Wait for the page to fully load</li>
                <li>Open this extension again</li>
              </ol>
              <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Retry Now
              </button>
            `);
            return;
          }
          
          console.log('Received response:', response);
          
          if (!response || response.error || response.title === 'Unknown Problem' || response.title === 'Error') {
            if (attempt < maxAttempts) {
              console.log(`Invalid response, retrying... (${attempt}/${maxAttempts})`);
              setTimeout(() => {
                getProblemDetailsWithRetry(attempt + 1, maxAttempts, savedData);
              }, 1500);
              return;
            }
            
            // Try to extract from URL as fallback
            const urlMatch = tab.url.match(/leetcode\.com\/problems\/([^\/\?]+)/);
            if (urlMatch) {
              const problemSlug = urlMatch[1];
              const problemName = problemSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              
              console.log('Using URL fallback:', problemName);
              currentProblem = {
                title: problemName,
                difficulty: 'Unknown',
                description: `Working on: ${problemName}. Let me help you understand and solve this problem step by step!`,
                url: currentProblemUrl
              };
              
              displayProblemDetails(currentProblem);
              initializeConversation(currentProblem);
              enableChat();
              saveConversationState();
              return;
            }
            
            showError('Could Not Detect Problem', `
              <p>Unable to extract problem details from this page.</p>
              <p><strong>Current URL:</strong> ${tab.url}</p>
              <p><strong>Make sure you're on a problem page like:</strong></p>
              <p style="font-family: monospace; background: #f5f5f5; padding: 8px; border-radius: 4px;">
                https://leetcode.com/problems/two-sum/
              </p>
              <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Try Again
              </button>
            `);
            return;
          }
          
          console.log('Successfully extracted problem details');
          currentProblem = response;
          displayProblemDetails(response);
          initializeConversation(response);
          enableChat();
          saveConversationState();
        }
      );
    });
  }

  function showError(title, message) {
    problemDetails.innerHTML = `
      <div style="color: #dc3545; border: 1px solid #dc3545; background: #f8d7da; padding: 12px; border-radius: 6px;">
        <p><strong>${title}</strong></p>
        ${message}
      </div>
    `;
  }

  function displayProblemDetails(problem) {
    const difficultyColor = getDifficultyColor(problem.difficulty);
    problemDetails.innerHTML = `
      <div style="border: 1px solid #e9ecef; border-radius: 8px; padding: 12px; background: #f8f9fa;">
        <p style="margin: 0 0 8px 0;"><strong>Title:</strong> ${problem.title}</p>
        <p style="margin: 0 0 12px 0;"><strong>Difficulty:</strong> 
          <span style="color: ${difficultyColor}; font-weight: bold; padding: 2px 8px; border-radius: 12px; background: ${difficultyColor}20;">
            ${problem.difficulty}
          </span>
        </p>
        <div style="margin-top: 8px; padding: 8px; background: #ffffff; border-radius: 4px; font-size: 12px; border-left: 3px solid ${difficultyColor};">
          ${problem.description.substring(0, 200)}${problem.description.length > 200 ? '...' : ''}
        </div>
      </div>
    `;
  }

  function initializeConversation(problem) {
    conversationHistory = [
      {
        role: "system",
        content: `You are an expert coding mentor for LeetCode problems. Your goal is to guide students to understand and solve problems independently.

STRICT RULES:
1. NEVER provide complete code solutions
2. Ask probing questions to guide thinking
3. Suggest approaches and algorithms, not implementations
4. Point out edge cases and complexity considerations
5. Explain concepts and techniques
6. Help break down problems into smaller parts

Current Problem: ${problem.title} (${problem.difficulty})
URL: ${problem.url}
Description: ${problem.description.substring(0, 500)}...

Be encouraging, educational, and guide them to discover the solution themselves!`
      }
    ];
    
    // Clear loading message and add welcome
    chatMessages.innerHTML = '';
    addAssistantMessage(getInitialGuidance(problem));
  }

  function enableChat() {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.placeholder = "Ask for help with this problem...";
    userInput.focus();
    console.log('Chat enabled');
  }

  function getDifficultyColor(difficulty) {
    const diff = difficulty.toLowerCase();
    if (diff.includes('easy')) return '#00af9b';
    if (diff.includes('medium')) return '#ffb800';
    if (diff.includes('hard')) return '#ff2d55';
    return '#666';
  }

  function getApiKey() {
    return userApiKey || DEFAULT_API_KEY;
  }

  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    console.log('📤 Sending message:', message);
    
    addUserMessage(message);
    userInput.value = '';
    userInput.disabled = true;
    sendBtn.disabled = true;
    
    // Add loading indicator
    const loadingId = 'loading-' + Date.now();
    chatMessages.innerHTML += `
      <div id="${loadingId}" class="message assistant-message">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
      conversationHistory.push({role: 'user', content: message});
      
      const apiKey = getApiKey();
      console.log('🔑 Using API key:', userApiKey ? 'User key' : 'Default key');
      console.log('🤖 Making API call with model: meta-llama/llama-3.1-8b-instruct:free');
      console.log('📝 Conversation history length:', conversationHistory.length);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': chrome.runtime.getURL(''),
          'X-Title': 'LeetCode Assistant'
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct:free",
          messages: conversationHistory,
          temperature: 0.7,
          max_tokens: 500
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      
      const data = await response.json();
      console.log('📨 API Response data:', data);
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('❌ Invalid response structure:', data);
        throw new Error('Invalid response format from API');
      }
      
      const assistantResponse = data.choices[0].message.content;
      console.log('🤖 Assistant response:', assistantResponse);
      
      if (!assistantResponse || assistantResponse.trim() === '') {
        throw new Error('Empty response from AI');
      }
      
      document.getElementById(loadingId).remove();
      addAssistantMessage(assistantResponse);
      conversationHistory.push({role: 'assistant', content: assistantResponse});
      saveConversationState(); // Save after each message
      
      console.log('Message sent successfully');
    } catch (error) {
      console.error("AI Error:", error);
      document.getElementById(loadingId).remove();
      
      // Try to show more helpful error message
      let errorMessage = "Please try again.";
      if (error.message.includes('API error: 401')) {
        errorMessage = "API key issue. Please check the configuration.";
      } else if (error.message.includes('API error: 429')) {
        errorMessage = "Rate limited. Please wait a moment and try again.";
      } else if (error.message.includes('API error: 500')) {
        errorMessage = "Server error. Please try again in a moment.";
      }
      
      addAssistantMessage(`Error: ${errorMessage}`);
    } finally {
      userInput.disabled = false;
      sendBtn.disabled = false;
      userInput.focus();
    }
  }

  function addUserMessage(text) {
    chatMessages.innerHTML += `
      <div class="message user-message" style="background: #007bff; color: white; margin: 8px 0; padding: 12px; border-radius: 12px; margin-left: 20px;">
        ${text}
      </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addAssistantMessage(text) {
    // Auto-collapse on first AI response
    autoCollapseProblemAnalysis();
    
    // Convert markdown-like formatting to proper HTML
    let formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold** to <strong>
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // *italic* to <em>
      .replace(/^\* (.*$)/gm, '• $1') // * bullet to •
      .replace(/^\+ (.*$)/gm, '• $1') // + bullet to •
      .replace(/^(\d+)\. /gm, '$1. ') // Keep numbered lists
      .replace(/\n/g, '<br>'); // Convert line breaks
    
    chatMessages.innerHTML += `
      <div class="message assistant-message" style="background: #f8f9fa; border: 1px solid #e9ecef; margin: 8px 0; padding: 12px; border-radius: 12px; margin-right: 20px;">
        ${formattedText}
      </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function getInitialGuidance(problem) {
    return `Great! I can see you're working on "<strong>${problem.title}</strong>" (${problem.difficulty}).

I'm here to help you understand and solve this problem step by step! I can assist with:

<strong>Understanding the problem requirements</strong><br>
<strong>Brainstorming solution approaches</strong><br>
<strong>Identifying edge cases</strong><br>
<strong>Analyzing time/space complexity</strong><br>
<strong>Explaining algorithms and data structures</strong>

What would you like to explore first? Feel free to ask me anything about this problem!`;
  }

  console.log('✅ Popup initialization complete');
});