# SentrIQ - AI-Powered Cybersecurity Compliance Platform

**🎯 Goal**: Get new engineers from clone to local dev in **<30 minutes**

SentrIQ helps SMBs in regulated spaces navigate cybersecurity compliance with AI-powered guidance, expert escalation, and automated policy generation.

## ⚡ Quick Start (< 30 min)

### Prerequisites
- [Node.js 18+](https://nodejs.org) (use `nvm` for version management)
- [pnpm](https://pnpm.io) - Fast, disk space efficient package manager
- [Supabase CLI](https://supabase.com/docs/guides/cli) - For local database development

```bash
# Install pnpm globally
npm install -g pnpm

# Install Supabase CLI
npm install -g supabase
```

### 🚀 Setup Steps

#### 1. Clone & Install Dependencies (2 min)
```bash
git clone <YOUR_GIT_URL>
cd sentriq
pnpm install
```

#### 2. Environment Setup (5 min)
```bash
# Copy environment template
cp .env.example .env.local

# Configure your environment variables:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 3. Start Local Development (2 min)
```bash
# Start frontend (Vite dev server)
pnpm dev

# In another terminal - start Supabase locally
supabase start

# Run database migrations
supabase db reset
```

#### 4. Verify Everything Works (1 min)
- ✅ Frontend: http://localhost:5173
- ✅ Supabase Studio: http://localhost:54323
- ✅ Edge Functions: http://localhost:54321/functions/v1

## 🏗️ Project Architecture

### Frontend Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling framework
- **shadcn/ui** - Component library
- **React Router** - Client-side routing
- **TanStack Query** - Server state management

### Backend Stack
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Database with Row Level Security (RLS)
- **Edge Functions** - Serverless compute (Deno runtime)
- **Authentication** - Built-in auth with MFA support
- **Storage** - File uploads and management

### Key Directories
```
src/
├── components/         # Reusable UI components
│   ├── ui/            # shadcn/ui base components
│   ├── auth/          # Authentication components
│   ├── chat/          # AI chat interface
│   └── dashboard/     # Dashboard-specific components
├── contexts/          # React context providers
├── hooks/             # Custom React hooks
├── lib/               # Utility functions & helpers
├── pages/             # Route components
├── templates/         # Policy templates (.md files)
└── integrations/      # Third-party integrations

supabase/
├── functions/         # Edge functions (serverless)
├── migrations/        # Database schema changes
└── config.toml       # Supabase configuration
```

## 🔐 Authentication & Authorization

### AuthContext Usage
The `AuthContext` provides comprehensive auth state management:

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { 
    user,              // Current user object
    userRole,          // 'business_owner' | 'consultant' | 'admin'
    subscriptionInfo,  // Subscription tier & status
    loading,           // Auth loading state
    signIn,            // Sign in function
    signOut,           // Sign out function
  } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;
  
  return <div>Welcome {user.email}!</div>;
}
```

### ProtectedRoute Usage
Wrap components to enforce authentication and authorization:

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Basic protection (any authenticated user)
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Admin only
<ProtectedRoute requireAdmin>
  <AdminPanel />
</ProtectedRoute>

// Specific roles
<ProtectedRoute allowRoles={['consultant', 'admin']}>
  <ConsultantDashboard />
</ProtectedRoute>

// Subscription requirements
<ProtectedRoute requireSubscription minimumTier="Pro">
  <PremiumFeature />
</ProtectedRoute>
```

### Role-Based Access Control
Three user roles with different permissions:
- **business_owner**: Standard user, can use basic features
- **consultant**: Can access escalation queue and consultant tools
- **admin**: Full system access, user management, analytics

## 🧪 Development Workflow

### Running Tests
```bash
# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix
```

### Database Development
```bash
# Create new migration
supabase migration new your_migration_name

# Apply migrations
supabase db reset

# View database in Studio
supabase studio
```

### Edge Functions Development
```bash
# Create new function
supabase functions new function-name

# Deploy functions
supabase functions deploy

# View function logs
supabase functions logs function-name
```

## 🛠️ Common Development Tasks

### Adding a New Page
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation in sidebar if needed
4. Apply appropriate `ProtectedRoute` wrapper

### Adding a New API Endpoint
1. Create edge function in `supabase/functions/`
2. Add CORS headers and error handling
3. Use standardized error responses
4. Add authentication checks

### Adding a New Component
1. Create in appropriate `src/components/` subdirectory
2. Use TypeScript interfaces for props
3. Follow design system patterns
4. Add to component exports if reusable

## 🐛 Troubleshooting Guide

### Common Issues & Solutions

#### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clear Vite cache
rm -rf .vite
pnpm dev
```

#### Database Connection Issues
```bash
# Restart Supabase
supabase stop
supabase start

# Check if required env vars are set
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

#### Edge Function Errors
```bash
# Check function logs
supabase functions logs function-name --follow

# Test function locally
curl -X POST http://localhost:54321/functions/v1/function-name \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

#### Authentication Issues
- Check that Site URL and Redirect URLs are configured in Supabase Auth settings
- Verify email confirmation is disabled for local development
- Ensure proper error handling in auth flows

## ✅ First PR Checklist

Before submitting your first pull request:

### Code Quality
- [ ] **Type Safety**: No TypeScript errors (`pnpm type-check`)
- [ ] **Linting**: Code passes linting (`pnpm lint`)
- [ ] **Formatting**: Code is properly formatted
- [ ] **Imports**: Clean imports, no unused imports

### Testing
- [ ] **Manual Testing**: Feature works in browser
- [ ] **Edge Cases**: Test error states and edge cases
- [ ] **Mobile**: Responsive design on mobile devices
- [ ] **Auth States**: Test both authenticated and unauthenticated states

### Security
- [ ] **ProtectedRoute**: Proper route protection implemented
- [ ] **Input Validation**: User input is validated and sanitized
- [ ] **Error Handling**: Errors don't expose sensitive information
- [ ] **RLS Policies**: Database access follows RLS policies

### Documentation
- [ ] **Code Comments**: Complex logic is commented
- [ ] **README Updates**: Update docs if adding new features
- [ ] **Type Definitions**: Proper TypeScript interfaces

### Commit Message Convention
```
feat: add user profile management
fix: resolve authentication redirect loop
docs: update API documentation
refactor: improve error handling in chat component
style: update button component design
test: add unit tests for policy generator
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git add .
git commit -m "feat: describe your changes"

# Push and create PR
git push origin feature/your-feature-name
```

## 📞 Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Search existing GitHub issues first
- **Team Chat**: Reach out in team channels
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Tailwind Docs**: https://tailwindcss.com/docs

## 🎯 Success Metrics

You're ready to contribute when you can:
- ✅ Run the project locally without errors
- ✅ Understand the authentication flow
- ✅ Create a simple protected page
- ✅ Make a database query using Supabase
- ✅ Deploy an edge function
- ✅ Follow the PR checklist successfully

**Welcome to the SentrIQ team! 🚀**
