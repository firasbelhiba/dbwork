const mongoose = require('mongoose');
require('dotenv').config();

const PROJECT_ID = '69034d749fda89142fb7cc2b'; // 4Hacks
const PROJECT_KEY = '4HKX';
const SANTA_ADMIN_ID = '68f979aa2ae284487d1dacca';

const tickets = [
  { num: 572, type: 'task', priority: 'critical', title: 'Move JWT token storage from localStorage to httpOnly cookies', description: 'Currently JWT tokens are stored in localStorage which is vulnerable to XSS attacks. Create API route for setting httpOnly cookies on login, update login/logout flow, remove all localStorage.setItem("token") calls, and update middleware to read token from cookies.' },
  { num: 573, type: 'task', priority: 'critical', title: 'Remove token exposure from console.log statements', description: 'Tokens and sensitive data are being logged to console, visible in DevTools. Remove all 69 console.log statements and create a logger utility that only logs in development.' },
  { num: 574, type: 'bug', priority: 'critical', title: 'Fix TokenContext error handling - uncomment cleanup code', description: 'Error handling in TokenContext has cleanup code commented out (lines 27-32), causing invalid tokens to persist. Uncomment setToken(null) and localStorage.removeItem("token") in the catch block.' },
  { num: 575, type: 'task', priority: 'high', title: 'Add complete route protection in middleware', description: 'Middleware only protects some routes. Add /profile/*, /settings/*, /my-organization/*, /hackathons/[id]/create-team, and /hackathons/[id]/submit to the matcher.' },
  { num: 576, type: 'task', priority: 'high', title: 'Move API URL from hardcoded to environment variable', description: 'API URL is hardcoded in src/api/config/apiConfig.ts. Update to use process.env.NEXT_PUBLIC_API_URL and add validation for missing env var.' },
  { num: 577, type: 'task', priority: 'high', title: 'Disable or secure health check endpoints', description: '/api/health and /api/test-connection expose database info without authentication. Add authentication or return minimal info for unauthenticated requests.' },
  { num: 578, type: 'task', priority: 'critical', title: 'Implement CSRF protection', description: 'No CSRF protection on form submissions. Install csrf library, add token generation on session start, and validate on all POST/PUT/DELETE requests.' },
  { num: 579, type: 'task', priority: 'medium', title: 'Consolidate duplicate API directories (app/api + src/api)', description: 'Two API directories exist with 6 duplicate file pairs causing maintenance issues. Choose single location for client-side API calls (src/api/), migrate all functions, and update imports.' },
  { num: 580, type: 'task', priority: 'medium', title: 'Split god component - hackathons/[id]/page.tsx (787 lines)', description: 'Page component is 787 lines with RegistrationModal embedded inside. Extract RegistrationModal, HackathonHeader, HackathonDetails components and create useRegistration hook.' },
  { num: 581, type: 'task', priority: 'medium', title: 'Split Navbar component (594 lines)', description: 'Navbar is 594 lines with notification, dropdown, and mobile menu logic mixed. Extract UserDropdown, NotificationBell, MobileMenu, and NavLinks components.' },
  { num: 582, type: 'task', priority: 'medium', title: 'Extract HeroCarousel from hackathons/page.tsx', description: 'HeroCarousel component is defined inside EventsPage (lines 141-211), causing re-creation on every render. Move to separate file and memoize with React.memo.' },
  { num: 583, type: 'task', priority: 'high', title: 'Unify state management (Context OR Zustand, not both)', description: 'Project uses Zustand, React Context, AND localStorage inconsistently. Choose Zustand as single solution, migrate TokenContext and UserContext, use persist middleware.' },
  { num: 584, type: 'task', priority: 'medium', title: 'Add loading.tsx and error.tsx to all routes', description: 'No loading or error boundary files for routes. Create loading.tsx and error.tsx for /hackathons, /hackathons/[id], /dashboard, and /profile routes with skeleton loaders.' },
  { num: 585, type: 'task', priority: 'medium', title: 'Create API abstraction layer', description: 'Direct fetch calls scattered throughout codebase. Create src/lib/api-client.ts with unified ApiClient class including automatic token injection and 401 handling.' },
  { num: 586, type: 'task', priority: 'high', title: 'Setup testing framework (Vitest)', description: 'No testing infrastructure exists. Install vitest, @testing-library/react, @testing-library/jest-dom, jsdom. Create vitest.config.ts and add test scripts to package.json.' },
  { num: 587, type: 'task', priority: 'medium', title: 'Setup MSW for API mocking', description: 'Need Mock Service Worker for testing API calls. Install msw, create handlers.ts and server.ts in __tests__/mocks/, add handlers for auth and hackathon endpoints.' },
  { num: 588, type: 'task', priority: 'high', title: 'Write tests for authentication flow', description: 'Authentication is critical and has 0% test coverage. Test registerUser(), loginUser(), checkAndRefreshToken(), SigninForm, SignUpForm components, and Zustand auth store.' },
  { num: 589, type: 'task', priority: 'medium', title: 'Write tests for custom hooks', description: 'Custom hooks have 0% test coverage. Test useAuth, useNotifications, useCategories hooks including loading and error states. Target 80% coverage.' },
  { num: 590, type: 'task', priority: 'medium', title: 'Setup Playwright for E2E testing', description: 'No E2E testing exists. Install @playwright/test, create playwright.config.ts, create e2e/ directory, write auth flow E2E test, add e2e script to package.json.' },
  { num: 591, type: 'task', priority: 'medium', title: 'Setup CI/CD test integration', description: 'No automated testing in CI/CD pipeline. Create .github/workflows/test.yml to run unit and E2E tests on PR, generate coverage report, block merge if tests fail.' },
  { num: 592, type: 'bug', priority: 'high', title: 'Fix useNotifications missing dependency', description: 'useNotifications has stale closure bug in src/hooks/useNotifications.ts:42. Add loadNotifications to useEffect dependency array - pagination currently never works.' },
  { num: 593, type: 'bug', priority: 'medium', title: 'Add cleanup to setTimeout in SignUpForm', description: 'Multiple setTimeout calls (lines 91, 107, 118) without cleanup cause memory leaks. Store timeout IDs in refs and clear on unmount.' },
  { num: 594, type: 'bug', priority: 'medium', title: 'Add error handling to HackathonSection useEffect', description: 'No try-catch in data fetching (lines 42-53), component silently fails. Add try-catch block, error state, display error message, and retry button.' },
  { num: 595, type: 'task', priority: 'high', title: 'Add AbortController to all fetch calls', description: 'No fetch cancellation causes race conditions and memory leaks. Add AbortController to all API functions in src/api/, add signal parameter, clean up on unmount, add 5-10 second timeout.' },
  { num: 596, type: 'task', priority: 'medium', title: 'Implement SWR for data fetching with caching', description: 'No client-side caching, every navigation refetches data. Install SWR, create useHackathons, useHackathonDetails, useUser hooks with proper revalidation strategy.' },
  { num: 597, type: 'task', priority: 'medium', title: 'Add token refresh deduplication', description: 'checkAndRefreshToken called multiple times without caching. Add in-memory cache, prevent concurrent refresh attempts, cache decoded JWT.' },
  { num: 598, type: 'task', priority: 'medium', title: 'Convert hackathons/page.tsx to Server Component', description: 'Page uses "use client" but could be server component. Remove directive, fetch hackathons server-side, create HackathonsPageClient for filtering/search, pass initialData as prop.' },
  { num: 599, type: 'task', priority: 'medium', title: 'Convert hackathons/[id]/page.tsx to Server Component', description: 'Hackathon detail page should be server-rendered for SEO. Remove "use client", fetch details server-side, add generateStaticParams, keep modals as client components.' },
  { num: 600, type: 'task', priority: 'medium', title: 'Convert dashboard/page.tsx to Server Component', description: 'Dashboard fetches mock data in useEffect. Remove "use client", remove mock setTimeout, fetch real dashboard data server-side, create DashboardClient for interactive parts.' },
  { num: 601, type: 'task', priority: 'medium', title: 'Convert profile/page.tsx to Server Component', description: 'Profile page should pre-render user data server-side. Remove "use client", fetch user profile server-side, create ProfileEditForm as client component.' },
  { num: 602, type: 'bug', priority: 'high', title: 'Fix hydration mismatch in app/page.tsx', description: 'useSearchParams() causes hydration mismatch on root page. Move OAuth callback handling to dedicated /auth/callback route, make root page a server component.' },
  { num: 603, type: 'task', priority: 'high', title: 'Create global Error Boundary component', description: 'No error boundaries exist, React errors show blank screen. Create src/components/ErrorBoundary.tsx with componentDidCatch, user-friendly fallback UI, and "Try Again" button.' },
  { num: 604, type: 'bug', priority: 'medium', title: 'Fix silent error in JoinTeamsList', description: '.catch(console.error) at line 18 swallows errors silently. Add error state, show error message to user, add retry functionality.' },
  { num: 605, type: 'bug', priority: 'medium', title: 'Fix silent error in UserContext', description: 'User fetch failures (lines 28-41) are silent with no feedback. Add error state to context, show error notification on failure, add retry mechanism.' },
  { num: 606, type: 'task', priority: 'medium', title: 'Improve error messages for users', description: 'Error messages like "Backend error" are unhelpful. Create error message constants, map API error codes to user-friendly messages, add actionable suggestions.' },
  { num: 607, type: 'task', priority: 'medium', title: 'Replace `any` types in error handling (15+ instances)', description: '45+ any types throughout codebase, 15+ in error handling. Create proper Error types/interfaces, replace catch (error: any) with proper typing, create isApiError() type guard.' },
  { num: 608, type: 'task', priority: 'medium', title: 'Add return types to all functions', description: '15+ functions missing return type annotations. Add return types to API functions, hooks, and utilities. Enable noImplicitReturns in tsconfig.' },
  { num: 609, type: 'task', priority: 'medium', title: 'Fix array `any` types', description: 'Multiple arrays typed as any[] instead of proper types. Fix upcomingEvents, myProjects, recentActivity in dashboard and types files. Create proper interfaces.' },
  { num: 610, type: 'task', priority: 'high', title: 'Enable strict TypeScript mode', description: 'TypeScript strict mode is not enabled. Enable strict: true, noImplicitAny: true, strictNullChecks: true in tsconfig and fix all resulting type errors.' },
  { num: 611, type: 'task', priority: 'medium', title: 'Implement code splitting for heavy components', description: 'Large components loaded upfront increasing bundle size. Add dynamic imports for RegistrationModal, SubmitBuidlModal, TeamModal, HeroCarousel with loading fallbacks.' },
  { num: 612, type: 'task', priority: 'medium', title: 'Add memoization to list components', description: 'List components re-render unnecessarily. Wrap HeroCarousel in React.memo, add useMemo for filtered lists, add useCallback for event handlers.' },
  { num: 613, type: 'task', priority: 'medium', title: 'Optimize image loading', description: 'Image optimization is disabled in next.config.js. Evaluate image CDN options, create OptimizedImage wrapper, add lazy loading for below-fold images, add priority for hero images.' },
  { num: 614, type: 'task', priority: 'medium', title: 'Implement request deduplication', description: 'Same data fetched multiple times (notifications in Navbar + Panel). Use SWR with global cache key, deduplicate notification and hackathon list fetches.' },
  { num: 615, type: 'task', priority: 'medium', title: 'Add metadata to root layout', description: 'No metadata export in layout.tsx. Add title with template, description, keywords, Open Graph tags, Twitter card tags, and robots configuration.' },
  { num: 616, type: 'task', priority: 'low', title: 'Create robots.txt', description: 'No robots.txt file exists. Create public/robots.txt allowing public pages, disallowing API routes and private pages, add sitemap reference.' },
  { num: 617, type: 'task', priority: 'low', title: 'Create dynamic sitemap', description: 'No sitemap exists for search engine indexing. Create app/sitemap.ts including static pages and dynamic hackathon pages with lastModified dates.' },
  { num: 618, type: 'task', priority: 'medium', title: 'Add dynamic metadata to hackathon pages', description: 'Hackathon detail pages have no dynamic meta tags. Add generateMetadata function setting title, description, Open Graph image, and Twitter card from hackathon data.' },
  { num: 619, type: 'task', priority: 'low', title: 'Add alt text to all images', description: 'Multiple images missing alt attributes in HeroSection.tsx, CertificationSection.tsx, Navbar.tsx. Audit all img tags and add descriptive alt text.' },
  { num: 620, type: 'task', priority: 'low', title: 'Add JSON-LD schema markup', description: 'No structured data for rich snippets. Add Organization schema to layout, Event schema to hackathon pages, BreadcrumbList schema. Validate with Google\'s testing tool.' },
  { num: 621, type: 'task', priority: 'medium', title: 'Replace hardcoded widths with responsive classes', description: 'Hardcoded widths like w-[600px], w-[480px], h-[620px] break on mobile. Replace with responsive equivalents like w-full max-w-xl.' },
  { num: 622, type: 'task', priority: 'low', title: 'Uncomment and improve empty states', description: 'Empty state code is commented out in hackathons/page.tsx lines 384-399. Uncomment, add icon, add helpful message, add CTA button for filtered empty states.' },
  { num: 623, type: 'task', priority: 'medium', title: 'Add loading states to all data-fetching components', description: 'Multiple components show blank while loading. Add skeleton to JoinTeamsList, SubmitBuidlModal teams, notifications, and team modal.' },
  { num: 624, type: 'task', priority: 'medium', title: 'Add skip-to-content link', description: 'No skip link for keyboard navigation. Add visually hidden skip link that shows on focus, link to main content area with id="main-content".' },
  { num: 625, type: 'task', priority: 'low', title: 'Standardize button styles', description: 'Inconsistent button implementations across codebase. Audit all buttons, replace custom buttons with shadcn/ui Button, ensure consistent variant usage.' },
  { num: 626, type: 'task', priority: 'low', title: 'Separate devDependencies in package.json', description: 'All 72 packages in dependencies, none in devDependencies. Move @types/*, eslint, tailwindcss, typescript, postcss to devDependencies.' },
  { num: 627, type: 'task', priority: 'medium', title: 'Update outdated dependencies', description: 'ESLint 8.49.0 is unsupported, Next.js 13.5.1 is outdated. Update ESLint to 9.x, Next.js to 14.x, TypeScript to 5.6+, fix breaking changes.' },
  { num: 628, type: 'task', priority: 'low', title: 'Create constants file for magic numbers', description: 'Magic numbers scattered throughout codebase. Create src/constants/index.ts with PAGINATION, ROUTES, TIMEOUTS constants and replace magic numbers.' },
  { num: 629, type: 'task', priority: 'low', title: 'Standardize error variable naming', description: 'Inconsistent error naming: error, err, e. Standardize to error everywhere and update all catch blocks.' },
  { num: 630, type: 'task', priority: 'medium', title: 'Add React Hook Form to Registration Modal', description: 'Registration modal uses manual state (440+ lines). Refactor to use React Hook Form with Zod schema, keep dynamic question support, reduce code by ~50%.' },
  { num: 631, type: 'task', priority: 'medium', title: 'Add validation to CreatePositionModal', description: 'No validation on position creation form. Add React Hook Form with Zod schema, validate required fields, show error messages.' },
  { num: 632, type: 'task', priority: 'medium', title: 'Add validation to TeamModal', description: 'No schema validation on team modal. Add React Hook Form with Zod schema, validate team name and description, show inline errors.' },
  { num: 633, type: 'task', priority: 'high', title: 'Add input sanitization', description: 'User inputs not sanitized before storage/display. Install DOMPurify, sanitize username, team descriptions, project descriptions. Add Zod transform.' },
  { num: 634, type: 'task', priority: 'low', title: 'Create API documentation', description: 'No documentation for API functions and hooks. Document all API functions and custom hooks with JSDoc comments.' },
  { num: 635, type: 'task', priority: 'low', title: 'Create component storybook', description: 'No visual documentation for UI components. Install Storybook, create stories for Button, Form, and Modal components.' },
  { num: 636, type: 'task', priority: 'medium', title: 'Add pre-commit hooks', description: 'No pre-commit validation for code quality. Install husky and lint-staged, add hooks for linting, type checking, and tests.' },
  { num: 637, type: 'task', priority: 'medium', title: 'Setup error tracking (Sentry)', description: 'No error tracking in production. Install @sentry/nextjs, configure Sentry, add error boundary integration, upload source maps.' },
  { num: 638, type: 'task', priority: 'low', title: 'Add bundle analyzer', description: 'No visibility into bundle size. Install @next/bundle-analyzer, add analyze script, document baseline bundle size, identify largest dependencies.' },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const issuesCollection = db.collection('issues');
  const sprintsCollection = db.collection('sprints');

  // Create the Sprint first
  const sprintStartDate = new Date();
  const sprintEndDate = new Date();
  sprintEndDate.setDate(sprintEndDate.getDate() + 14); // 2 week sprint

  const sprint = {
    projectId: new mongoose.Types.ObjectId(PROJECT_ID),
    name: 'Audit 1',
    goal: 'Complete frontend security audit and code quality improvements',
    startDate: sprintStartDate,
    endDate: sprintEndDate,
    status: 'planned',
    issues: [],
    completedPoints: 0,
    totalPoints: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sprintResult = await sprintsCollection.insertOne(sprint);
  const sprintId = sprintResult.insertedId;
  console.log(`Created sprint "Audit 1" with ID: ${sprintId}`);

  // Create all issues
  const issueIds = [];
  for (const ticket of tickets) {
    const issue = {
      projectId: new mongoose.Types.ObjectId(PROJECT_ID),
      key: `${PROJECT_KEY}-${ticket.num}`,
      title: ticket.title,
      description: ticket.description,
      type: ticket.type,
      priority: ticket.priority,
      status: 'todo',
      assignees: [new mongoose.Types.ObjectId(SANTA_ADMIN_ID)],
      reporter: new mongoose.Types.ObjectId(SANTA_ADMIN_ID),
      labels: ['frontend-audit'],
      category: 'Frontend Audit',
      customFields: {},
      timeTracking: {
        estimatedHours: null,
        loggedHours: 0,
        timeLogs: [],
        timeEntries: [],
        activeTimeEntry: null,
        totalTimeSpent: 0,
      },
      attachments: [],
      sprintId: sprintId,
      startDate: null,
      dueDate: null,
      storyPoints: 0,
      watchers: [],
      blockedBy: [],
      blocks: [],
      parentIssue: null,
      order: ticket.num - 572,
      isArchived: false,
      archivedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await issuesCollection.insertOne(issue);
    issueIds.push(result.insertedId);
    console.log(`Created: ${issue.key} - ${issue.title.substring(0, 50)}...`);
  }

  // Update sprint with all issue IDs
  await sprintsCollection.updateOne(
    { _id: sprintId },
    { $set: { issues: issueIds } }
  );

  console.log(`\n✅ Successfully created:`);
  console.log(`   - 1 Sprint: "Audit 1"`);
  console.log(`   - ${issueIds.length} Issues (${PROJECT_KEY}-572 to ${PROJECT_KEY}-638)`);
  console.log(`   - All assigned to Santa Admin`);
  console.log(`   - All added to Sprint "Audit 1"`);

  await mongoose.disconnect();
}

main().catch(console.error);
