# React Dev Insight Pro

An intelligent development assistant that combines real-time React component inspection with AI-driven code optimization. Select any UI element, specify optimization goals, and let AI implement suggested improvements with full Git integration.

## Features

- **🔍 Intelligent Code Inspection**: Click any element to see its React component source
- **🤖 AI-Powered Refactoring**: Natural language optimization directives
- **🔒 Safe Code Modification**: Full Git version control and rollback capability
- **👁️ Change Preview**: Side-by-side diff comparison before applying changes
- **✅ Developer Approval**: Review and approve all AI suggestions
- **📊 Optimization Categories**: Performance, accessibility, maintainability, and more

## Quick Start

### Prerequisites

- Node.js 18+
- Git
- A running React application to inspect

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/react-dev-insight-pro.git
cd react-dev-insight-pro

# Install dependencies
npm install

# Configure your LLM API key
cp packages/server/env.example packages/server/.env
# Edit packages/server/.env and add your LLM_API_KEY or OPENAI_API_KEY

# Start the development server
npm run dev
```

### Usage

1. **Start the tool**: Run `npm run dev` to start both the server and client
2. **Open the UI**: Navigate to `http://localhost:5173`
3. **Load your app**: Enter your React app's URL in the target field
4. **Select an element**: Click on any UI element in your app
5. **Specify optimization**: Describe what you want to improve
6. **Review changes**: Preview the AI-suggested modifications
7. **Apply or reject**: Accept, modify, or reject the changes

## Configuration

### Environment Variables

Create a `.env` file in `packages/server/` directory (copy from `env.example`):

```bash
# Required: API Key for OpenAI-compatible LLM
LLM_API_KEY=your-api-key-here
# Or use OPENAI_API_KEY=your-openai-api-key-here

# Optional: Custom base URL for OpenAI-compatible APIs
LLM_BASE_URL=https://api.openai.com/v1

# Optional: Override model name from config file
LLM_MODEL_NAME=gpt-4
```

### Configuration File

Create a `.react-dev-insightrc.json` file in your project root:

```json
{
  "git": {
    "autoCommit": true,
    "branchPrefix": "ai-optimization/",
    "requireCleanWorkingDir": true
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.2
  },
  "optimization": {
    "allowedCategories": ["performance", "accessibility", "maintainability"],
    "requireReview": true
  }
}
```

## Optimization Categories

| Category | Description |
|----------|-------------|
| **Performance** | Memoization, lazy loading, render optimization |
| **Accessibility** | ARIA attributes, keyboard navigation, screen reader support |
| **Maintainability** | Code structure, readability, component decomposition |
| **Bundle Size** | Tree-shaking, code splitting, import optimization |
| **UX** | User experience improvements, loading states, error handling |
| **Code Quality** | Best practices, type safety, error handling |

## Architecture

```
┌─────────────────────────────────────────────┐
│           React Dev Insight Pro              │
├─────────────────────────────────────────────┤
│  Client (React + Vite)                      │
│  • Element selection & inspection           │
│  • Optimization goal input                  │
│  • Change preview & approval                │
├─────────────────────────────────────────────┤
│  Server (Express + TypeScript)              │
│  • File system operations                   │
│  • Git integration                          │
│  • LLM API orchestration                    │
├─────────────────────────────────────────────┤
│  Injector Script                            │
│  • DOM element tracking                     │
│  • React fiber inspection                   │
│  • Parent frame communication               │
└─────────────────────────────────────────────┘
```

## API Reference

### Analyze Element
```http
POST /api/analysis/element
Content-Type: application/json

{
  "elementPath": "src/components/Button.tsx",
  "componentName": "Button",
  "optimizationGoal": "Improve accessibility"
}
```

### Apply Modification
```http
POST /api/modification/apply
Content-Type: application/json

{
  "filePath": "src/components/Button.tsx",
  "originalCode": "...",
  "modifiedCode": "...",
  "commitMessage": "Add ARIA labels to Button component"
}
```

### Git Operations
```http
POST /api/git/commit
POST /api/git/revert
GET /api/git/status
GET /api/git/history
```

## Development

```bash
# Run in development mode
npm run dev

# Build all packages
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

## Safety Features

1. **Pre-modification backup**: All files are backed up before changes
2. **Git integration**: Changes are tracked in version control
3. **Validation**: Code is validated before applying
4. **Rollback**: One-click revert to previous state
5. **Approval workflow**: Human review required for all changes

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- React DevTools for inspiration
- The AI/ML community for advancing code understanding
- All contributors and users of this tool
