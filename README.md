# 🧠 LeetCode Assistant

An AI-powered Chrome extension that provides intelligent coding assistance while solving LeetCode problems. Get hints, understand approaches, and learn algorithms without getting direct solutions.

## ✨ Features

### 🎯 **Smart Problem Detection**
- Automatically extracts problem details from any LeetCode problem page
- Displays problem title, difficulty, and description
- Works with all LeetCode problem formats

### 🤖 **AI Coding Mentor**
- Provides guided assistance without giving away complete solutions
- Helps you understand problem requirements
- Suggests algorithmic approaches and data structures
- Points out edge cases and complexity considerations
- Explains concepts step-by-step

### 💬 **Persistent Conversations**
- Remembers your conversation for each problem
- Resume discussions when you reopen the extension
- Context-aware responses based on the current problem


## 🚀 Installation

### Method 1: Load as Unpacked Extension

1. **Download or Clone** this repository
   ```bash
   git clone https://github.com/nirmitsaini1024/Leetcode-ai-extension.git
   cd leetcode-assistant-extension
   ```

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the extension folder
   - The extension icon should appear in your toolbar

4. **Add Icon** (Optional)
   - Add an `icon.png` file (128x128px recommended) to the extension folder


## 🔧 Setup

### API Configuration


1. **Replace the hardcoded key** in `popup.js`:
   ```javascript
   const API_KEY = 'your-api-key-here';
   ```

## 📖 How to Use

### 1. **Navigate to LeetCode**
- Go to any LeetCode problem page (e.g., `leetcode.com/problems/two-sum/`)
- Wait for the page to fully load

### 2. **Open the Extension**
- Click the LeetCode Assistant icon in your Chrome toolbar
- The extension will automatically detect and analyze the current problem

### 3. **Start Learning**
- Ask questions about the problem approach
- Request help with algorithm selection
- Get guidance on edge cases
- Discuss time/space complexity

### 4. **Example Interactions**
```
You: "How should I approach this problem?"
AI: "Let's think about this step by step. What data structure could help us efficiently find if a complement exists?"

You: "What are the edge cases I should consider?"
AI: "Great question! Consider: empty arrays, duplicate numbers, negative numbers, and when no solution exists."
```

## 🛠️ Technical Details

### File Structure
```
leetcode-assistant-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js              # Main extension logic
├── contentScript.js      # LeetCode page integration
├── icon.png             # Extension icon (add your own)
└── README.md            # This file



## 🎯 Core Principles

### Educational Focus
- **No complete solutions** - Helps you learn, doesn't solve for you
- **Guided discovery** - Asks probing questions to lead you to insights
- **Concept explanation** - Teaches underlying algorithms and patterns
- **Best practices** - Encourages good coding habits

### Smart Assistance
- **Context-aware** - Understands the specific problem you're working on
- **Progressive hints** - Starts with high-level guidance, gets more specific as needed
- **Multiple approaches** - Discusses various solution strategies
- **Complexity analysis** - Helps you understand time/space trade-offs

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🐛 Bug Reports
- Use the GitHub Issues tab
- Include your Chrome version and steps to reproduce
- Screenshots are helpful!

### 💡 Feature Requests
- Suggest new features via GitHub Issues
- Explain the use case and expected behavior

### 🔧 Development
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly on different LeetCode problems
5. Submit a pull request
