# Tasks: Dynamic Language Configuration

**Input**: Design documents from `/specs/001-dynamic-language-config/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: TDD approach required - unit tests (Vitest) written FIRST, integration tests (Playwright) for cross-browser validation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single NPM package project structure:
- `src/` - TypeScript source code
- `tests/unit/` - Vitest unit tests
- `tests/integration/` - Vitest integration tests
- `tests/e2e/` - Playwright end-to-end browser tests
- `dist/` - Built outputs (generated)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize NPM package with TypeScript 5.x, ESM/CommonJS dual output configuration
- [X] T002 [P] Install and configure Vite as bundler with worker support
- [X] T003 [P] Install Monaco Editor peer dependency and configure tsup for dual ESM/CJS builds
- [X] T004 [P] Configure ESLint and Prettier for TypeScript code quality
- [X] T005 [P] Configure Vitest for unit and integration tests
- [X] T006 [P] Configure Playwright for cross-browser E2E tests
- [X] T007 [P] Create package.json with correct exports field for dual module support
- [X] T008 [P] Setup tsconfig.json targeting ES2020 with strict type checking
- [X] T009 Create project directory structure per plan.md (src/, tests/, dist/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 Create TypeScript type definitions in src/config/types.ts for ConfigurationBundle, LanguageDefinition, FunctionWhitelist, ContextVariableSchema
- [X] T011 [P] Create custom error types in src/utils/errors.ts (EditorError, ConfigurationValidationError, ContentPersistenceError)
- [X] T012 [P] Implement configuration validator in src/config/validator.ts with schema validation logic
- [X] T013 [P] Create default/fallback configuration values in src/config/defaults.ts
- [X] T014 Setup Monaco worker configuration in src/editor.ts for web workers
- [X] T015 Create main entry point src/index.ts with exports for createPhpScriptEditor, types, and utilities

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure Language Definition (Priority: P1) 🎯 MVP

**Goal**: Enable editor to recognize and highlight php-script syntax (dot notation, no $ prefix)

**Independent Test**: Load editor with language configuration, verify `user.logins.count()` highlights correctly without $ symbols

### Tests for User Story 1 (TDD - Write FIRST, Ensure FAIL)

- [X] T016 [P] [US1] Unit test for Monarch language registration in tests/unit/language/monarch.test.ts
- [X] T017 [P] [US1] Unit test for language configuration validation in tests/unit/config/validator.test.ts
- [X] T018 [P] [US1] Integration test for syntax highlighting in tests/integration/syntax-highlighting.test.ts
- [X] T019 [P] [US1] E2E test for php-script syntax highlighting in tests/e2e/browser-compat.spec.ts

### Implementation for User Story 1

- [X] T020 [P] [US1] Implement Monarch language definition registration in src/language/monarch.ts
- [X] T021 [P] [US1] Implement language validation logic in src/language/validation.ts
- [X] T022 [US1] Integrate language definition loading in src/editor.ts initialization flow
- [X] T023 [US1] Add error handling for malformed language definitions with fallback to minimal mode
- [X] T024 [US1] Implement persistent error banner UI for configuration errors
- [X] T025 [US1] Add logging for language registration events

**Checkpoint**: At this point, User Story 1 should be fully functional - editor recognizes php-script syntax and highlights correctly

---

## Phase 4: User Story 2 - Configure Whitelisted Functions (Priority: P2)

**Goal**: Provide code completion for only whitelisted PHP functions

**Independent Test**: Configure whitelist with `strlen`, `substr`, `date`, verify completion suggests only these functions

### Tests for User Story 2 (TDD - Write FIRST, Ensure FAIL)

- [X] T026 [P] [US2] Unit test for function whitelist completion provider in tests/unit/language/completion.test.ts
- [X] T027 [P] [US2] Unit test for whitelist validation in tests/unit/config/validator.test.ts
- [X] T028 [P] [US2] Integration test for code completion in tests/integration/code-completion.test.ts
- [X] T029 [P] [US2] E2E test for function completion suggestions in tests/e2e/browser-compat.spec.ts

### Implementation for User Story 2

- [X] T030 [P] [US2] Implement function whitelist completion provider in src/language/completion.ts
- [X] T031 [US2] Integrate completion provider with Monaco editor in src/editor.ts
- [X] T032 [US2] Add validation warnings for non-whitelisted function usage
- [X] T033 [US2] Implement function signature display and documentation tooltips
- [X] T034 [US2] Add logging for completion provider events

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - syntax highlighting + function completion

---

## Phase 5: User Story 3 - Configure Context Variables (Priority: P3)

**Goal**: Provide intelligent autocomplete for context variables like `user`, `request`, `session` with nested properties

**Independent Test**: Configure context variable `user` with `name`, `email`, `logins.count()`, verify completion at each level

### Tests for User Story 3 (TDD - Write FIRST, Ensure FAIL)

- [X] T035 [P] [US3] Unit test for context variable schema parsing in tests/unit/language/completion.test.ts
- [X] T036 [P] [US3] Unit test for nested property traversal in tests/unit/language/completion.test.ts
- [X] T037 [P] [US3] Unit test for circular reference detection in tests/unit/config/validator.test.ts
- [X] T038 [P] [US3] Integration test for context completion in tests/integration/code-completion.test.ts
- [X] T039 [P] [US3] E2E test for multi-level property completion in tests/e2e/browser-compat.spec.ts

### Implementation for User Story 3

- [X] T040 [P] [US3] Extend completion provider to support context variables in src/language/completion.ts
- [X] T041 [US3] Implement nested object property traversal logic
- [X] T042 [US3] Add validation for circular references and depth limits (max 10 levels)
- [X] T043 [US3] Implement method completion with signature hints
- [X] T044 [US3] Add performance optimization for large context schemas
- [X] T045 [US3] Add logging for context variable resolution

**Checkpoint**: All primary user stories (US1, US2, US3) should now be independently functional

---

## Phase 6: User Story 4 - Persist Editor Content Locally (Priority: P2)

**Goal**: Prevent data loss by auto-saving content to localStorage with revert functionality

**Independent Test**: Type content, reload page, verify content restored; call revertToOriginal(), verify server content restored

### Tests for User Story 4 (TDD - Write FIRST, Ensure FAIL)

- [X] T046 [P] [US4] Unit test for localStorage content persistence in tests/unit/persistence/content-store.test.ts
- [X] T047 [P] [US4] Unit test for storage quota handling in tests/unit/persistence/storage-manager.test.ts
- [X] T048 [P] [US4] Unit test for revert API in tests/unit/persistence/revert-api.test.ts
- [X] T049 [P] [US4] Integration test for content restore across reloads in tests/integration/content-persistence.test.ts
- [X] T050 [P] [US4] E2E test for persistence across page reloads in tests/e2e/persistence.spec.ts

### Implementation for User Story 4

- [X] T051 [P] [US4] Implement localStorage content persistence in src/persistence/content-store.ts
- [X] T052 [P] [US4] Implement storage quota management and error handling in src/persistence/storage-manager.ts
- [X] T053 [P] [US4] Implement revert API in src/persistence/revert-api.ts
- [X] T054 [US4] Integrate content persistence into editor initialization in src/editor.ts
- [X] T055 [US4] Add debounced auto-save (500ms) on content changes
- [X] T056 [US4] Implement priority logic: localStorage content > server-provided content
- [X] T057 [US4] Add corrupted data detection and fallback handling
- [X] T058 [US4] Add storage quota exceeded warning UI
- [X] T059 [US4] Add logging for persistence events

**Checkpoint**: Content persistence working - users won't lose work on accidental refresh/crash

---

## Phase 7: API Integration & Server-Side Rendering Support

**Purpose**: Enable server-side configuration delivery and public API

- [X] T060 [P] Implement createPhpScriptEditor factory function in src/index.ts
- [X] T061 [P] Implement PhpScriptEditor class with complete API surface in src/editor.ts
- [X] T062 [P] Add getConfiguration(), updateFunctionWhitelist(), updateContextSchema() methods
- [X] T063 [P] Add revertToOriginal(), hasUnsavedChanges(), clearLocalStorage(), getOriginalContent() methods
- [X] T064 [P] Implement configuration change event emitters (onConfigurationChanged, onValidationError, onContentPersisted)
- [X] T065 [P] Add validateConfigurationBundle() utility function in src/config/validator.ts
- [X] T066 Add comprehensive JSDoc documentation for all public APIs
- [X] T067 Create TypeScript declaration files (.d.ts) for type exports

---

## Phase 8: Performance Optimization

**Purpose**: Meet performance requirements from constitution

- [X] T068 [P] Optimize Monarch tokenizer patterns to avoid catastrophic backtracking
- [X] T069 [P] Implement completion provider debouncing for async operations
- [X] T070 [P] Add indexing for context variable schema (O(1) lookup)
- [X] T071 [P] Optimize bundle size with tree-shaking validation
- [X] T072 Measure and validate performance benchmarks: <2s load, <16ms keystroke latency, <100ms syntax highlighting
- [X] T073 Add performance monitoring and logging

---

## Phase 9: Error Handling & Edge Cases

**Purpose**: Handle edge cases gracefully per spec.md

- [X] T074 [P] Implement fallback minimal syntax highlighting mode for malformed configurations
- [X] T075 [P] Handle empty whitelist gracefully (show no suggestions)
- [X] T076 [P] Detect and reject circular dependencies in context variables
- [X] T077 [P] Handle very large context structures (limit to first N properties with "more..." indicator)
- [X] T078 [P] Resolve context variable/keyword conflicts (context takes precedence)
- [X] T079 [P] Handle invalid context variable types with validation warnings
- [X] T080 [P] Handle localStorage full/quota exceeded with graceful degradation
- [X] T081 [P] Handle localStorage corrupted data with cleanup and fallback
- [X] T082 [P] Handle concurrent tabs (last write wins by design)
- [X] T083 Add comprehensive error logging and user-friendly error messages

---

## Phase 10: Cross-Browser Testing & Compatibility

**Purpose**: Ensure compatibility with target browsers

- [X] T084 [P] E2E test for Chrome (latest 2 versions) in tests/e2e/browser-compat.spec.ts
- [X] T085 [P] E2E test for Firefox (latest 2 versions) in tests/e2e/browser-compat.spec.ts
- [X] T086 [P] E2E test for Safari (latest 2 versions) in tests/e2e/browser-compat.spec.ts
- [X] T087 [P] E2E test for Edge (latest 2 versions) in tests/e2e/browser-compat.spec.ts
- [X] T088 Validate worker configuration in all browsers
- [X] T089 Verify localStorage API support and fallbacks

---

## Phase 11: Build & Package Configuration

**Purpose**: Prepare package for NPM publishing

- [X] T090 Configure tsup for dual ESM/CJS builds with correct file extensions (.mjs, .cjs)
- [X] T091 Setup package.json exports field with proper conditional exports
- [X] T092 Configure Monaco Editor as peer dependency (not bundled)
- [X] T093 Validate package with "are-the-types-wrong" tool
- [X] T094 Create .npmignore to exclude test files and dev dependencies
- [X] T095 Add prepublishOnly script for automated build
- [X] T096 Verify bundle size target (<500KB total, <50KB core)
- [X] T097 Test package installation in TypeScript consumer project
- [X] T098 Test package installation in JavaScript/CommonJS consumer project

---

## Phase 12: Documentation & Polish

**Purpose**: Complete documentation and final cleanup

- [ ] T099 [P] Create comprehensive README.md with installation, quick start, and examples
- [ ] T100 [P] Add API reference documentation (based on contracts/api.md)
- [ ] T101 [P] Add migration guide from raw Monaco to php-script-monaco-editor
- [ ] T102 [P] Create example projects for TypeScript and JavaScript consumers
- [ ] T103 [P] Document server-side PHP integration pattern
- [ ] T104 [P] Add troubleshooting guide with common issues
- [ ] T105 Code cleanup and refactoring across all modules
- [ ] T106 Add inline code comments for complex logic
- [ ] T107 Run final linting and formatting pass
- [ ] T108 Validate quickstart.md scenarios against actual package

---

## Phase 13: Final Validation & Release

**Purpose**: Final validation before release

- [ ] T109 Run complete test suite (unit + integration + E2E) and ensure 100% pass
- [ ] T110 Validate all success criteria from spec.md (SC-001 through SC-011)
- [ ] T111 Perform security audit (no XSS, injection vulnerabilities)
- [ ] T112 Validate constitution compliance (all principles satisfied)
- [ ] T113 Create CHANGELOG.md with version 1.0.0 release notes
- [ ] T114 Tag release and publish to NPM registry
- [ ] T115 Create GitHub release with documentation links

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P2)
- **Integration (Phase 7)**: Depends on User Stories 1-4 completion
- **Polish (Phase 8-13)**: Depends on core functionality being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1 but integrates with same completion provider
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of US1/US2 but extends same completion provider
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Completely independent persistence layer

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Unit tests before integration tests before E2E tests
- Implementation tasks can leverage [P] parallelization where marked
- Story complete and validated before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: Tasks T002-T009 can all run in parallel
- **Phase 2 (Foundational)**: Tasks T011-T013 can run in parallel after T010 completes
- **Phase 3 (US1 Tests)**: Tasks T016-T019 can all run in parallel
- **Phase 3 (US1 Implementation)**: Tasks T020-T021 can run in parallel
- **Phase 4 (US2 Tests)**: Tasks T026-T029 can all run in parallel
- **Phase 4 (US2 Implementation)**: Task T030 can start immediately after tests
- **Phase 5 (US3 Tests)**: Tasks T035-T039 can all run in parallel
- **Phase 5 (US3 Implementation)**: Tasks T040-T041 can start after tests
- **Phase 6 (US4 Tests)**: Tasks T046-T050 can all run in parallel
- **Phase 6 (US4 Implementation)**: Tasks T051-T053 can all run in parallel
- **Phase 7**: Tasks T060-T067 can all run in parallel
- **Phase 8**: Tasks T068-T073 can all run in parallel
- **Phase 9**: Tasks T074-T083 can all run in parallel
- **Phase 10**: Tasks T084-T087 can all run in parallel
- **Phase 12**: Tasks T099-T104 can all run in parallel

### User Stories Can Execute in Parallel

Once Phase 2 (Foundational) completes:
- Team Member A: User Story 1 (Phase 3)
- Team Member B: User Story 2 (Phase 4)
- Team Member C: User Story 3 (Phase 5)
- Team Member D: User Story 4 (Phase 6)

All stories are independent and can merge without conflicts.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# After T010 completes, launch these in parallel:
Task: "Create custom error types in src/utils/errors.ts"
Task: "Implement configuration validator in src/config/validator.ts"
Task: "Create default/fallback configuration values in src/config/defaults.ts"
```

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD):
Task: "Unit test for Monarch language registration in tests/unit/language/monarch.test.ts"
Task: "Unit test for language configuration validation in tests/unit/config/validator.test.ts"
Task: "Integration test for syntax highlighting in tests/integration/syntax-highlighting.test.ts"
Task: "E2E test for php-script syntax highlighting in tests/e2e/browser-compat.spec.ts"

# After tests written and failing, launch implementation in parallel:
Task: "Implement Monarch language definition registration in src/language/monarch.ts"
Task: "Implement language validation logic in src/language/validation.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Language Definition)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Minimal viable editor with syntax highlighting ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Basic editor with syntax highlighting (MVP!)
3. Add User Story 2 → Test independently → Editor + function completion
4. Add User Story 3 → Test independently → Editor + context-aware completion
5. Add User Story 4 → Test independently → Editor + persistence (full feature set)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With 4 developers:

1. Team completes Setup + Foundational together (Phases 1-2)
2. Once Foundational is done:
   - Developer A: User Story 1 (Phase 3) - Language definition
   - Developer B: User Story 2 (Phase 4) - Function whitelist
   - Developer C: User Story 3 (Phase 5) - Context variables
   - Developer D: User Story 4 (Phase 6) - Content persistence
3. Stories complete and integrate independently
4. Team reconvenes for Phases 7-13 (integration, polish, release)

---

## Success Metrics

**Total Tasks**: 115 tasks across 13 phases

**Task Distribution by User Story**:
- Setup: 9 tasks
- Foundational: 6 tasks
- User Story 1 (P1): 10 tasks (4 tests + 6 implementation)
- User Story 2 (P2): 9 tasks (4 tests + 5 implementation)
- User Story 3 (P3): 11 tasks (5 tests + 6 implementation)
- User Story 4 (P2): 14 tasks (5 tests + 9 implementation)
- Integration: 8 tasks
- Performance: 6 tasks
- Error Handling: 10 tasks
- Cross-Browser: 6 tasks
- Build/Package: 9 tasks
- Documentation: 10 tasks
- Final Validation: 7 tasks

**Parallel Opportunities**: 80+ tasks marked [P] can run in parallel within their phase

**Independent Test Criteria**:
- ✅ US1: Verify php-script syntax highlights without errors
- ✅ US2: Verify only whitelisted functions appear in completion
- ✅ US3: Verify nested property completion works at all levels
- ✅ US4: Verify content persists across reloads and reverts correctly

**Suggested MVP Scope**: User Story 1 (Phase 3) - basic syntax highlighting

---

## Format Validation

✅ ALL tasks follow checklist format: `- [ ] [ID] [Labels] Description with file path`
✅ All tasks have unique sequential IDs (T001-T115)
✅ All user story tasks have [Story] labels (US1, US2, US3, US4)
✅ Parallelizable tasks marked with [P]
✅ File paths included in all implementation tasks
✅ Tests written FIRST (TDD approach)

---

## Notes

- [P] tasks = different files, no dependencies, can run simultaneously
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- TDD: Verify tests FAIL before implementing (Red-Green-Refactor)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution compliance verified throughout (browser-first, performance, testing, progressive enhancement)
