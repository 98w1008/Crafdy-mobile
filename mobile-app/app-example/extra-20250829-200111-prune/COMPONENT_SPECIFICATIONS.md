# Krafty Construction App - Component Specifications

## 🏗️ Design System Compliance
All components follow the gray design token system with construction industry optimizations:
- 44pt minimum touch targets for glove use
- Large text (18px base) for readability  
- Gray-only color palette
- Shadow-based hierarchy
- Offline-capable where applicable

---

=== GrayButton ===

PURPOSE: Primary interactive button component optimized for construction professionals wearing gloves

PROPS INTERFACE:
├── Required Props:
│   ├── onPress: () => void - Button press handler
│   └── children: string | React.ReactNode - Button content
├── Optional Props:
│   ├── variant?: 'primary' | 'secondary' | 'ghost' - Button style variant (default: 'primary')
│   ├── size?: 'sm' | 'md' | 'lg' - Button size preset (default: 'md')
│   ├── disabled?: boolean - Disabled state (default: false)
│   ├── loading?: boolean - Loading state with spinner (default: false)
│   ├── fullWidth?: boolean - Full width button (default: false)
│   ├── icon?: React.ReactNode - Leading icon component (default: none)
│   ├── iconPosition?: 'left' | 'right' - Icon placement (default: 'left')
│   ├── testID?: string - Test identifier (default: undefined)
│   └── accessibilityLabel?: string - Screen reader label (default: children text)
└── Event Handlers:
    ├── onPress: () => void - Primary action handler
    ├── onLongPress?: () => void - Long press handler for tooltips
    └── onPressIn?: () => void - Press start handler for haptic feedback

INTERNAL STATE:
├── pressed: boolean - Current press state for visual feedback
├── loading: boolean - Internal loading state management
└── dimensions: { width: number; height: number } - Button measurements for accessibility

STYLING (Gray Design Tokens):
├── Default: 
│   ├── Primary: colors.interactive.default (#52525B), text.onPrimary (#FFFFFF)
│   ├── Secondary: transparent background, border.default (#E5E7EB), text.primary (#111827)
│   └── Ghost: transparent background, text.primary (#111827)
├── Hover/Focus: 
│   ├── Primary: colors.interactive.hover (#71717A)
│   ├── Secondary: background.primary (#F3F4F6)
│   └── Focus ring: border.focus (#52525B) with 2px width
├── Disabled: 
│   ├── Background: colors.interactive.disabled (#D1D5DB)
│   ├── Text: colors.text.disabled (#D1D5DB)
│   └── Opacity: 0.6 for all variants
└── Error: border.error (#DC2626) with red focus ring

ACCESSIBILITY:
├── ARIA labels: accessibilityRole="button", accessibilityState for disabled/loading
├── Screen reader support: Announces button purpose and state changes
├── Keyboard navigation: Tab navigation with Enter/Space activation
├── Touch targets: Minimum 44pt (components.button.primary.minHeight)
└── Color contrast compliance: 4.5:1 ratio met for all text combinations

ERROR STATES:
├── Network Error: onPress fails → show temporary error border → retry action available
├── Validation Error: invalid form data → red border + error text below → form correction needed
└── Loading: disabled state → spinner animation → normal state when complete

USAGE EXAMPLE:
```jsx
<GrayButton
  variant="primary"
  onPress={() => submitEstimate()}
  loading={isSubmitting}
  icon={<SaveIcon />}
  accessibilityLabel="Save estimate for project"
>
  Save Estimate
</GrayButton>
```

TESTING REQUIREMENTS:
├── Unit tests for all props combinations and variants
├── Accessibility tests (VoiceOver, TalkBack, keyboard navigation)
├── Error state testing (network failures, validation errors)
└── Performance tests (large lists of buttons, animation smoothness)

---

=== GrayInput ===

PURPOSE: Text input component with gray styling optimized for construction data entry

PROPS INTERFACE:
├── Required Props:
│   ├── value: string - Current input value
│   └── onChangeText: (text: string) => void - Text change handler
├── Optional Props:
│   ├── placeholder?: string - Placeholder text (default: '')
│   ├── label?: string - Input label text (default: undefined)
│   ├── helperText?: string - Supporting text below input (default: undefined)
│   ├── errorText?: string - Error message text (default: undefined)
│   ├── disabled?: boolean - Disabled state (default: false)
│   ├── required?: boolean - Required field indicator (default: false)
│   ├── multiline?: boolean - Multi-line text area (default: false)
│   ├── numberOfLines?: number - Text area height (default: 4)
│   ├── maxLength?: number - Character limit (default: undefined)
│   ├── keyboardType?: KeyboardType - Keyboard type (default: 'default')
│   ├── autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters' - Auto capitalize (default: 'sentences')
│   ├── autoCorrect?: boolean - Auto correct (default: true)
│   ├── secureTextEntry?: boolean - Password field (default: false)
│   ├── leftIcon?: React.ReactNode - Leading icon (default: undefined)
│   ├── rightIcon?: React.ReactNode - Trailing icon (default: undefined)
│   ├── testID?: string - Test identifier (default: undefined)
│   └── accessibilityLabel?: string - Screen reader label (default: label || placeholder)
└── Event Handlers:
    ├── onChangeText: (text: string) => void - Text change handler
    ├── onFocus?: () => void - Focus event handler
    ├── onBlur?: () => void - Blur event handler
    ├── onSubmitEditing?: () => void - Submit handler (Enter key)
    └── onRightIconPress?: () => void - Right icon press handler

INTERNAL STATE:
├── focused: boolean - Current focus state for styling
├── characterCount: number - Current character count for maxLength
└── showPassword: boolean - Password visibility state (secureTextEntry only)

STYLING (Gray Design Tokens):
├── Default: 
│   ├── Background: components.input.background (#FFFFFF)
│   ├── Border: components.input.border (#D1D5DB)
│   ├── Text: components.input.text (#111827)
│   └── Placeholder: components.input.textPlaceholder (#9CA3AF)
├── Hover/Focus: 
│   ├── Border: components.input.borderFocus (#52525B) 2px width
│   ├── Shadow: shadows.sm with primary color
│   └── Background: components.input.backgroundFocus (#FFFFFF)
├── Disabled: 
│   ├── Background: components.input.backgroundDisabled (#F3F4F6)
│   ├── Text: components.input.textDisabled (#D1D5DB)
│   └── Opacity: 0.6
└── Error: 
    ├── Border: components.input.borderError (#DC2626)
    ├── Error text: semantic.error.primary (#DC2626)
    └── Error background tint: semantic.error.background (#FEF2F2)

ACCESSIBILITY:
├── ARIA labels: accessibilityRole="textfield", accessibilityLabel for purpose
├── Screen reader support: Announces label, value, error states, character limits
├── Keyboard navigation: Tab order, proper keyboard type selection
├── Touch targets: Minimum 44pt height (components.input.minHeight)
└── Color contrast compliance: 4.5:1 ratio for all text states

ERROR STATES:
├── Validation Error: invalid input → red border + error text → show correction hint
├── Network Error: API validation fails → temporary error state → retry available
└── Character Limit: approaching maxLength → warning at 90% → error at 100%

USAGE EXAMPLE:
```jsx
<GrayInput
  label="Project Name"
  value={projectName}
  onChangeText={setProjectName}
  placeholder="Enter project name"
  required
  maxLength={100}
  leftIcon={<ProjectIcon />}
  errorText={nameError}
  accessibilityLabel="Enter project name for new estimate"
/>
```

TESTING REQUIREMENTS:
├── Unit tests for all input types and validation scenarios
├── Accessibility tests (screen readers, keyboard input, voice control)
├── Error state testing (validation failures, network errors)
└── Performance tests (large forms, rapid typing, emoji support)

---

=== GrayCard ===

PURPOSE: Content container component providing visual hierarchy through shadows and spacing

PROPS INTERFACE:
├── Required Props:
│   └── children: React.ReactNode - Card content
├── Optional Props:
│   ├── variant?: 'default' | 'elevated' | 'outlined' | 'flat' - Card style (default: 'default')
│   ├── padding?: 'none' | 'sm' | 'md' | 'lg' - Internal padding (default: 'md')
│   ├── margin?: 'none' | 'sm' | 'md' | 'lg' - External margin (default: 'none')
│   ├── fullWidth?: boolean - Full width container (default: true)
│   ├── pressable?: boolean - Pressable card with feedback (default: false)
│   ├── disabled?: boolean - Disabled state for pressable cards (default: false)
│   ├── header?: React.ReactNode - Card header content (default: undefined)
│   ├── footer?: React.ReactNode - Card footer content (default: undefined)
│   ├── testID?: string - Test identifier (default: undefined)
│   └── accessibilityLabel?: string - Screen reader label (default: undefined)
└── Event Handlers:
    ├── onPress?: () => void - Press handler for pressable cards
    ├── onLongPress?: () => void - Long press handler
    └── onLayout?: (event: LayoutEvent) => void - Layout measurement handler

INTERNAL STATE:
├── pressed: boolean - Current press state for pressable cards
├── dimensions: { width: number; height: number } - Card measurements
└── contentHeight: number - Dynamic content height for animations

STYLING (Gray Design Tokens):
├── Default: 
│   ├── Background: components.card.background (#FFFFFF)
│   ├── Border: components.card.border (#E5E7EB) 1px
│   ├── Shadow: shadows.card (subtle elevation)
│   └── Border radius: components.card.borderRadius (12px)
├── Hover/Focus: 
│   ├── Elevated: Enhanced shadow (shadows.md)
│   ├── Pressable: background.secondary (#E5E7EB) tint
│   └── Focus ring: border.focus (#52525B) 2px for keyboard navigation
├── Disabled: 
│   ├── Background: background.tertiary (#D1D5DB)
│   ├── Opacity: 0.6
│   └── No shadow
└── Error: 
    ├── Border: semantic.error.primary (#DC2626)
    ├── Background tint: semantic.error.background (#FEF2F2)
    └── Error shadow with red tint

ACCESSIBILITY:
├── ARIA labels: accessibilityRole="button" for pressable, proper labeling
├── Screen reader support: Announces card purpose and interactive state
├── Keyboard navigation: Tab navigation for pressable cards
├── Touch targets: Minimum 44pt for pressable areas
└── Color contrast compliance: Background/text combinations meet 4.5:1 ratio

ERROR STATES:
├── Load Error: content fails to load → error border + retry button → reload content
├── Network Error: API call fails → temporary error styling → background retry
└── Validation Error: invalid card data → error border + validation message → correction needed

USAGE EXAMPLE:
```jsx
<GrayCard
  variant="elevated"
  pressable
  onPress={() => navigateToProject(project.id)}
  header={<ProjectHeader title={project.name} />}
  accessibilityLabel={`View project ${project.name} details`}
>
  <ProjectSummary data={project} />
</GrayCard>
```

TESTING REQUIREMENTS:
├── Unit tests for all variants and interactive combinations
├── Accessibility tests (screen readers, keyboard navigation, focus management)
├── Error state testing (content loading failures, network issues)
└── Performance tests (large lists of cards, animation performance)

---

=== DrawerMenu ===

PURPOSE: Navigation sidebar component optimized for construction app workflows

PROPS INTERFACE:
├── Required Props:
│   ├── visible: boolean - Drawer visibility state
│   ├── onClose: () => void - Close drawer handler
│   └── menuItems: MenuItem[] - Navigation menu items
├── Optional Props:
│   ├── position?: 'left' | 'right' - Drawer slide direction (default: 'left')
│   ├── width?: number - Drawer width in pixels (default: 280)
│   ├── backdrop?: boolean - Show backdrop overlay (default: true)
│   ├── swipeToClose?: boolean - Swipe gesture to close (default: true)
│   ├── header?: React.ReactNode - Custom header content (default: undefined)
│   ├── footer?: React.ReactNode - Custom footer content (default: undefined)
│   ├── userProfile?: UserProfile - User info for header (default: undefined)
│   ├── currentRoute?: string - Active route for highlighting (default: undefined)
│   ├── testID?: string - Test identifier (default: undefined)
│   └── accessibilityLabel?: string - Screen reader label (default: 'Navigation menu')
└── Event Handlers:
    ├── onClose: () => void - Close drawer handler
    ├── onItemPress: (item: MenuItem) => void - Menu item selection handler
    ├── onBackdropPress?: () => void - Backdrop press handler (closes by default)
    └── onSwipeStart?: () => void - Swipe gesture start handler

INTERNAL STATE:
├── slideAnimation: Animated.Value - Drawer slide animation value
├── backdropOpacity: Animated.Value - Backdrop fade animation
├── itemPressed: string | null - Currently pressed menu item ID
└── safeAreaInsets: EdgeInsets - Safe area measurements for proper positioning

STYLING (Gray Design Tokens):
├── Default: 
│   ├── Background: colors.background.surface (#FFFFFF)
│   ├── Header: colors.background.secondary (#E5E7EB)
│   ├── Dividers: colors.border.light (#F3F4F6)
│   └── Shadow: shadows.xl for depth
├── Hover/Focus: 
│   ├── Menu items: colors.interactive.hover (#71717A) background tint
│   ├── Active item: colors.interactive.pressed (#3F3F46) background
│   └── Focus indicators: colors.border.focus (#52525B) left border
├── Disabled: 
│   ├── Disabled items: colors.text.disabled (#D1D5DB)
│   └── Reduced opacity: 0.6
└── Error: 
    ├── Error items: semantic.error.primary (#DC2626) text
    └── Error indicators: red badges or borders

ACCESSIBILITY:
├── ARIA labels: accessibilityRole="menu", proper menu item roles
├── Screen reader support: Announces drawer state, menu structure, active items
├── Keyboard navigation: Arrow keys for menu navigation, Escape to close
├── Touch targets: Minimum 44pt for all menu items
└── Color contrast compliance: All text combinations meet accessibility standards

ERROR STATES:
├── Load Error: menu items fail to load → show reload option → retry loading
├── Permission Error: restricted menu items → disabled state + explanation → contact admin
└── Network Error: dynamic menu fails → fallback static menu → background retry

USAGE EXAMPLE:
```jsx
<DrawerMenu
  visible={drawerVisible}
  onClose={() => setDrawerVisible(false)}
  menuItems={navigationItems}
  currentRoute="projects"
  userProfile={currentUser}
  onItemPress={(item) => navigateToRoute(item.route)}
  accessibilityLabel="Main navigation menu"
/>
```

TESTING REQUIREMENTS:
├── Unit tests for all menu configurations and interaction patterns
├── Accessibility tests (screen readers, keyboard navigation, focus management)
├── Error state testing (loading failures, permission errors)
└── Performance tests (large menu lists, animation performance, gesture handling)

---

=== PromptChips ===

PURPOSE: Collapsible action shortcuts component for quick construction-related prompts

PROPS INTERFACE:
├── Required Props:
│   ├── prompts: PromptChip[] - Array of prompt chip data
│   └── onPromptPress: (prompt: PromptChip) => void - Prompt selection handler
├── Optional Props:
│   ├── collapsed?: boolean - Initial collapsed state (default: false)
│   ├── maxVisible?: number - Max chips shown when collapsed (default: 3)
│   ├── variant?: 'default' | 'compact' - Chip size variant (default: 'default')
│   ├── scrollable?: boolean - Horizontal scroll for many chips (default: true)
│   ├── multiSelect?: boolean - Allow multiple chip selection (default: false)
│   ├── selectedChips?: string[] - Currently selected chip IDs (default: [])
│   ├── disabled?: boolean - Disabled state (default: false)
│   ├── header?: string - Section header text (default: undefined)
│   ├── testID?: string - Test identifier (default: undefined)
│   └── accessibilityLabel?: string - Screen reader label (default: 'Quick action prompts')
└── Event Handlers:
    ├── onPromptPress: (prompt: PromptChip) => void - Single prompt selection
    ├── onToggleCollapsed?: () => void - Expand/collapse handler
    ├── onMultiSelectChange?: (selected: string[]) => void - Multi-selection handler
    └── onLongPress?: (prompt: PromptChip) => void - Long press for prompt editing

INTERNAL STATE:
├── collapsed: boolean - Current collapsed/expanded state
├── selectedChips: Set<string> - Selected chip IDs for multi-select mode
├── animationValue: Animated.Value - Expand/collapse animation
└── scrollPosition: number - Horizontal scroll position for persistence

STYLING (Gray Design Tokens):
├── Default: 
│   ├── Chip background: colors.background.secondary (#E5E7EB)
│   ├── Chip text: colors.text.primary (#111827)
│   ├── Container: colors.background.primary (#F3F4F6)
│   └── Border radius: borderRadius.sm (8px) for chips
├── Hover/Focus: 
│   ├── Hover: colors.interactive.hover (#71717A) background
│   ├── Selected: colors.interactive.pressed (#3F3F46) background, white text
│   └── Focus ring: colors.border.focus (#52525B) 2px border
├── Disabled: 
│   ├── Background: colors.interactive.disabled (#D1D5DB)
│   ├── Text: colors.text.disabled (#D1D5DB)
│   └── Opacity: 0.6
└── Error: 
    ├── Invalid prompts: semantic.error.primary (#DC2626) border
    └── Network errors: subtle error indicator

ACCESSIBILITY:
├── ARIA labels: accessibilityRole="button" for chips, "list" for container
├── Screen reader support: Announces chip purpose, selection state, expand/collapse
├── Keyboard navigation: Arrow keys for chip navigation, Space/Enter for selection
├── Touch targets: Minimum 44pt height for all chips
└── Color contrast compliance: All text/background combinations meet standards

ERROR STATES:
├── Load Error: prompts fail to load → show reload button → retry loading
├── Network Error: dynamic prompts unavailable → fallback static prompts → background retry
└── Selection Error: invalid prompt selection → reset selection → show error message

USAGE EXAMPLE:
```jsx
<PromptChips
  prompts={constructionPrompts}
  onPromptPress={(prompt) => insertPrompt(prompt.text)}
  collapsed={false}
  multiSelect
  selectedChips={selectedPromptIds}
  onMultiSelectChange={setSelectedPromptIds}
  header="Quick Actions"
  accessibilityLabel="Construction quick action prompts"
/>
```

TESTING REQUIREMENTS:
├── Unit tests for all interaction modes (single/multi-select, collapse states)
├── Accessibility tests (screen readers, keyboard navigation, chip announcement)
├── Error state testing (loading failures, invalid selections)
└── Performance tests (large prompt lists, animation smoothness, scroll performance)

---

=== AIActionCard ===

PURPOSE: Inline AI suggestion component for contextual construction assistance

PROPS INTERFACE:
├── Required Props:
│   ├── suggestion: AISuggestion - AI suggestion data object
│   └── onActionPress: (action: string) => void - Action button handler
├── Optional Props:
│   ├── variant?: 'default' | 'compact' | 'prominent' - Card prominence (default: 'default')
│   ├── dismissible?: boolean - Show dismiss button (default: true)
│   ├── autoHide?: boolean - Auto-hide after action (default: false)
│   ├── hideDelay?: number - Auto-hide delay in ms (default: 3000)
│   ├── showConfidence?: boolean - Show AI confidence score (default: false)
│   ├── maxActions?: number - Maximum action buttons (default: 3)
│   ├── loading?: boolean - Loading state for AI processing (default: false)
│   ├── disabled?: boolean - Disabled state (default: false)
│   ├── testID?: string - Test identifier (default: undefined)
│   └── accessibilityLabel?: string - Screen reader label (default: generated from suggestion)
└── Event Handlers:
    ├── onActionPress: (action: string) => void - Action selection handler
    ├── onDismiss?: () => void - Dismiss card handler
    ├── onFeedback?: (helpful: boolean) => void - User feedback handler
    └── onMoreInfo?: () => void - Show detailed explanation handler

INTERNAL STATE:
├── dismissed: boolean - Card dismissal state
├── actionLoading: string | null - Currently processing action ID
├── fadeAnimation: Animated.Value - Fade in/out animation
└── feedbackGiven: boolean - User feedback submission state

STYLING (Gray Design Tokens):
├── Default: 
│   ├── Background: colors.background.surface (#FFFFFF) with subtle tint
│   ├── Border: colors.border.default (#E5E7EB) with AI accent
│   ├── AI indicator: colors.interactive.default (#52525B) small badge
│   └── Shadow: shadows.sm with slight blue tint for AI context
├── Hover/Focus: 
│   ├── Card hover: Enhanced shadow (shadows.md)
│   ├── Action buttons: colors.interactive.hover (#71717A)
│   └── Focus indicators: colors.border.focus (#52525B) ring
├── Disabled: 
│   ├── Background: colors.background.tertiary (#D1D5DB)
│   ├── Actions: colors.interactive.disabled (#D1D5DB)
│   └── Opacity: 0.6
└── Error: 
    ├── AI error: semantic.error.background (#FEF2F2) tint
    ├── Failed actions: semantic.error.primary (#DC2626) text
    └── Error indicators: red border accent

ACCESSIBILITY:
├── ARIA labels: accessibilityRole="group", proper action button roles
├── Screen reader support: Announces AI suggestion, available actions, confidence
├── Keyboard navigation: Tab through actions, Escape to dismiss
├── Touch targets: Minimum 44pt for all interactive elements
└── Color contrast compliance: All text meets accessibility standards

ERROR STATES:
├── AI Error: suggestion generation fails → show retry option → background regeneration
├── Action Error: action execution fails → show error + retry → log for improvement
└── Network Error: offline mode → show cached suggestions → sync when online

USAGE EXAMPLE:
```jsx
<AIActionCard
  suggestion={{
    id: 'estimate-123',
    title: 'Material Cost Optimization',
    description: 'Consider bulk pricing for concrete - potential 15% savings',
    actions: ['Apply Bulk Pricing', 'Compare Suppliers', 'Get Quote'],
    confidence: 0.92,
    category: 'cost-optimization'
  }}
  onActionPress={(action) => handleAIAction(action)}
  showConfidence
  onFeedback={(helpful) => submitAIFeedback(helpful)}
  accessibilityLabel="AI suggestion for material cost optimization"
/>
```

TESTING REQUIREMENTS:
├── Unit tests for all suggestion types and action combinations
├── Accessibility tests (screen readers, keyboard interaction, AI content announcement)
├── Error state testing (AI failures, action execution errors, network issues)
└── Performance tests (multiple cards, animation performance, AI response times)

---

=== VoiceInput ===

PURPOSE: Voice recording component optimized for construction site noise and safety

PROPS INTERFACE:
├── Required Props:
│   ├── onRecordingComplete: (audioData: AudioData) => void - Recording completion handler
│   └── onTranscriptionComplete: (text: string) => void - Speech-to-text result handler
├── Optional Props:
│   ├── maxDuration?: number - Max recording time in seconds (default: 60)
│   ├── minDuration?: number - Min recording time in seconds (default: 1)
│   ├── audioQuality?: 'low' | 'medium' | 'high' - Recording quality (default: 'medium')
│   ├── noiseReduction?: boolean - Enable noise filtering (default: true)
│   ├── autoTranscribe?: boolean - Auto transcribe on completion (default: true)
│   ├── language?: string - Speech recognition language (default: 'en-US')
│   ├── showWaveform?: boolean - Show audio waveform (default: true)
│   ├── showTimer?: boolean - Show recording timer (default: true)
│   ├── allowPlayback?: boolean - Allow audio playback (default: true)
│   ├── disabled?: boolean - Disabled state (default: false)
│   ├── testID?: string - Test identifier (default: undefined)
│   └── accessibilityLabel?: string - Screen reader label (default: 'Voice input recorder')
└── Event Handlers:
    ├── onRecordingStart?: () => void - Recording start handler
    ├── onRecordingStop?: () => void - Recording stop handler
    ├── onRecordingComplete: (audioData: AudioData) => void - Recording data handler
    ├── onTranscriptionComplete: (text: string) => void - Transcription result handler
    ├── onError?: (error: VoiceInputError) => void - Error handler
    └── onPermissionRequest?: () => void - Microphone permission request handler

INTERNAL STATE:
├── recording: boolean - Current recording state
├── duration: number - Current recording duration
├── audioLevel: number - Current audio input level for visualization
├── permissionStatus: 'granted' | 'denied' | 'undetermined' - Microphone permission
├── transcribing: boolean - Speech-to-text processing state
└── waveformData: number[] - Audio waveform visualization data

STYLING (Gray Design Tokens):
├── Default: 
│   ├── Container: colors.background.surface (#FFFFFF) with subtle shadow
│   ├── Record button: colors.interactive.default (#52525B) when ready
│   ├── Timer: colors.text.secondary (#6B7280)
│   └── Waveform: colors.interactive.default (#52525B) bars
├── Hover/Focus: 
│   ├── Record button: colors.interactive.hover (#71717A)
│   ├── Focus ring: colors.border.focus (#52525B) 2px
│   └── Enhanced shadow: shadows.md
├── Disabled: 
│   ├── Button: colors.interactive.disabled (#D1D5DB)
│   ├── Container: colors.background.tertiary (#D1D5DB) tint
│   └── Opacity: 0.6
└── Error: 
    ├── Error state: semantic.error.background (#FEF2F2) tint
    ├── Error button: semantic.error.primary (#DC2626)
    └── Permission denied: warning color scheme

ACCESSIBILITY:
├── ARIA labels: accessibilityRole="button" for controls, live regions for status
├── Screen reader support: Announces recording state, duration, transcription results
├── Keyboard navigation: Space to start/stop, Enter to confirm
├── Touch targets: Minimum 44pt for all controls (optimized for gloves)
└── Color contrast compliance: All visual indicators meet accessibility standards

ERROR STATES:
├── Permission Error: microphone denied → show permission prompt → guide to settings
├── Network Error: transcription fails → save audio locally → retry when online
└── Noise Error: too much background noise → suggest quieter location → adjust sensitivity

USAGE EXAMPLE:
```jsx
<VoiceInput
  onRecordingComplete={(audio) => saveAudioNote(audio)}
  onTranscriptionComplete={(text) => addProjectNote(text)}
  maxDuration={120}
  noiseReduction
  showWaveform
  onError={(error) => handleVoiceError(error)}
  accessibilityLabel="Record voice note for project"
/>
```

TESTING REQUIREMENTS:
├── Unit tests for all recording scenarios and permission states
├── Accessibility tests (screen readers, keyboard controls, voice feedback)
├── Error state testing (permission denied, network failures, noise handling)
└── Performance tests (long recordings, background processing, battery usage)

---

=== ProgressSlider ===

PURPOSE: Progress tracking slider component for construction project milestones

PROPS INTERFACE:
├── Required Props:
│   ├── value: number - Current progress value (0-100)
│   ├── onValueChange: (value: number) => void - Value change handler
│   └── milestones: Milestone[] - Array of milestone markers
├── Optional Props:
│   ├── min?: number - Minimum slider value (default: 0)
│   ├── max?: number - Maximum slider value (default: 100)
│   ├── step?: number - Value increment step (default: 1)
│   ├── showValue?: boolean - Display current value (default: true)
│   ├── showMilestones?: boolean - Display milestone markers (default: true)
│   ├── allowManualInput?: boolean - Allow text input for precise values (default: false)
│   ├── snapToMilestones?: boolean - Snap to milestone values (default: false)
│   ├── animated?: boolean - Animate value changes (default: true)
│   ├── disabled?: boolean - Disabled state (default: false)
│   ├── readonly?: boolean - Read-only display mode (default: false)
│   ├── unit?: string - Value unit display (default: '%')
│   ├── testID?: string - Test identifier (default: undefined)
│   └── accessibilityLabel?: string - Screen reader label (default: 'Progress slider')
└── Event Handlers:
    ├── onValueChange: (value: number) => void - Value change handler
    ├── onSlidingStart?: () => void - Slide interaction start handler
    ├── onSlidingComplete?: (value: number) => void - Slide interaction complete handler
    ├── onMilestoneReached?: (milestone: Milestone) => void - Milestone achievement handler
    └── onManualInputSubmit?: (value: number) => void - Manual input submission handler

INTERNAL STATE:
├── currentValue: number - Internal value state with animation
├── sliding: boolean - Currently sliding interaction state
├── tempValue: number - Temporary value during slide interaction
├── milestoneReached: string[] - Recently achieved milestone IDs for feedback
└── animationValue: Animated.Value - Progress bar animation value

STYLING (Gray Design Tokens):
├── Default: 
│   ├── Track: colors.background.secondary (#E5E7EB) background
│   ├── Progress: colors.interactive.default (#52525B) fill
│   ├── Thumb: colors.background.surface (#FFFFFF) with shadow
│   └── Milestones: colors.interactive.default (#52525B) markers
├── Hover/Focus: 
│   ├── Thumb: colors.interactive.hover (#71717A) border
│   ├── Enhanced shadow: shadows.md for thumb
│   └── Focus ring: colors.border.focus (#52525B) 2px ring
├── Disabled: 
│   ├── Track: colors.interactive.disabled (#D1D5DB)
│   ├── Progress: colors.text.disabled (#D1D5DB)
│   ├── Thumb: colors.background.tertiary (#D1D5DB)
│   └── Opacity: 0.6
└── Error: 
    ├── Invalid range: semantic.error.primary (#DC2626) track color
    ├── Network sync error: warning indicators
    └── Validation error: red progress fill

ACCESSIBILITY:
├── ARIA labels: accessibilityRole="slider", value and range announcements
├── Screen reader support: Announces progress value, milestones, changes
├── Keyboard navigation: Arrow keys for value adjustment, Home/End for min/max
├── Touch targets: Minimum 44pt thumb size for glove use
└── Color contrast compliance: All visual elements meet accessibility standards

ERROR STATES:
├── Sync Error: progress update fails → show unsaved indicator → retry on network
├── Validation Error: invalid progress value → revert to last valid → show error message
└── Permission Error: insufficient rights to update → read-only mode → show explanation

USAGE EXAMPLE:
```jsx
<ProgressSlider
  value={projectProgress}
  onValueChange={updateProgress}
  milestones={[
    { id: 'foundation', value: 25, label: 'Foundation Complete' },
    { id: 'framing', value: 50, label: 'Framing Complete' },
    { id: 'electrical', value: 75, label: 'Electrical Complete' }
  ]}
  snapToMilestones
  onMilestoneReached={(milestone) => celebrateMilestone(milestone)}
  accessibilityLabel={`Project progress: ${projectProgress}% complete`}
/>
```

TESTING REQUIREMENTS:
├── Unit tests for all value ranges and milestone configurations
├── Accessibility tests (screen readers, keyboard navigation, value announcements)
├── Error state testing (sync failures, validation errors, permission issues)
└── Performance tests (smooth animation, responsive touch input, large milestone lists)

---

=== ReceiptCapture ===

PURPOSE: Camera OCR interface optimized for construction receipt and document scanning

PROPS INTERFACE:
├── Required Props:
│   ├── onCaptureComplete: (imageData: ImageData, ocrResults?: OCRResults) => void - Capture completion handler
│   └── onOCRComplete: (results: OCRResults) => void - OCR processing completion handler
├── Optional Props:
│   ├── captureMode?: 'photo' | 'document' | 'receipt' - Capture optimization mode (default: 'receipt')
│   ├── autoCapture?: boolean - Auto-capture when document detected (default: false)
│   ├── flashMode?: 'auto' | 'on' | 'off' | 'torch' - Flash control (default: 'auto')
│   ├── enableOCR?: boolean - Enable optical character recognition (default: true)
│   ├── ocrLanguage?: string[] - OCR language preferences (default: ['en'])
│   ├── compressionQuality?: number - Image compression (0-1) (default: 0.8)
│   ├── showPreview?: boolean - Show capture preview (default: true)
│   ├── allowRetake?: boolean - Allow retaking photos (default: true)
│   ├── guidanceOverlay?: boolean - Show document alignment overlay (default: true)
│   ├── maxFileSize?: number - Max image file size in MB (default: 10)
│   ├── disabled?: boolean - Disabled state (default: false)
│   ├── testID?: string - Test identifier (default: undefined)
│   └── accessibilityLabel?: string - Screen reader label (default: 'Receipt capture camera')
└── Event Handlers:
    ├── onCaptureComplete: (imageData: ImageData, ocrResults?: OCRResults) => void - Capture handler
    ├── onOCRComplete: (results: OCRResults) => void - OCR results handler
    ├── onCameraReady?: () => void - Camera initialization complete handler
    ├── onCameraError?: (error: CameraError) => void - Camera error handler
    ├── onOCRError?: (error: OCRError) => void - OCR processing error handler
    ├── onRetake?: () => void - Retake photo handler
    └── onPermissionRequest?: (type: 'camera' | 'storage') => void - Permission request handler

INTERNAL STATE:
├── cameraReady: boolean - Camera initialization state
├── capturing: boolean - Currently capturing photo
├── processing: boolean - OCR processing state
├── previewImage: string | null - Captured image preview URI
├── ocrProgress: number - OCR processing progress (0-100)
├── permissionStatus: PermissionStatus - Camera and storage permissions
└── documentDetected: boolean - Auto-capture document detection state

STYLING (Gray Design Tokens):
├── Default: 
│   ├── Camera overlay: transparent with colors.border.focus (#52525B) guidelines
│   ├── Controls: colors.background.surface (#FFFFFF) with shadows.lg
│   ├── Buttons: colors.interactive.default (#52525B)
│   └── Progress: colors.interactive.default (#52525B) loading indicator
├── Hover/Focus: 
│   ├── Capture button: colors.interactive.hover (#71717A) with enhanced shadow
│   ├── Control buttons: colors.interactive.hover (#71717A)
│   └── Focus indicators: colors.border.focus (#52525B) rings
├── Disabled: 
│   ├── Camera overlay: colors.background.tertiary (#D1D5DB) tint
│   ├── Controls: colors.interactive.disabled (#D1D5DB)
│   └── Reduced opacity: 0.6
└── Error: 
    ├── Camera error: semantic.error.background (#FEF2F2) overlay tint
    ├── OCR error: semantic.error.primary (#DC2626) indicators
    └── Permission error: warning color scheme with guidance

ACCESSIBILITY:
├── ARIA labels: accessibilityRole="button" for controls, image descriptions
├── Screen reader support: Announces camera state, capture success, OCR results
├── Keyboard navigation: Space for capture, Escape for cancel, Tab for controls
├── Touch targets: Minimum 44pt for all camera controls
└── Color contrast compliance: All UI elements meet visibility standards

ERROR STATES:
├── Camera Error: camera unavailable → show error message → request permission/guidance
├── OCR Error: text recognition fails → save image anyway → retry OCR option
└── Storage Error: insufficient space → compress image → suggest cleanup → alternative storage

USAGE EXAMPLE:
```jsx
<ReceiptCapture
  onCaptureComplete={(image, ocr) => saveReceipt(image, ocr)}
  onOCRComplete={(results) => extractReceiptData(results)}
  captureMode="receipt"
  enableOCR
  guidanceOverlay
  onCameraError={(error) => handleCameraError(error)}
  accessibilityLabel="Capture receipt for expense tracking"
/>
```

TESTING REQUIREMENTS:
├── Unit tests for all capture modes and permission scenarios
├── Accessibility tests (screen readers, camera interaction announcements)
├── Error state testing (camera failures, OCR errors, permission denied)
└── Performance tests (image processing speed, OCR accuracy, battery usage)

---

=== EstimateTable ===

PURPOSE: Editable estimate rows component for construction project cost management

PROPS INTERFACE:
├── Required Props:
│   ├── data: EstimateRow[] - Array of estimate row data
│   ├── onDataChange: (updatedData: EstimateRow[]) => void - Data update handler
│   └── columns: ColumnConfig[] - Table column configuration
├── Optional Props:
│   ├── editable?: boolean - Enable row editing (default: true)
│   ├── sortable?: boolean - Enable column sorting (default: true)
│   ├── filterable?: boolean - Enable data filtering (default: false)
│   ├── addable?: boolean - Allow adding new rows (default: true)
│   ├── deletable?: boolean - Allow deleting rows (default: true)
│   ├── reorderable?: boolean - Allow row reordering (default: false)
│   ├── showTotals?: boolean - Display totals row (default: true)
│   ├── showLineNumbers?: boolean - Show row numbers (default: true)
│   ├── validation?: ValidationRules - Row validation rules (default: undefined)
│   ├── readonly?: boolean - Read-only mode (default: false)
│   ├── maxRows?: number - Maximum allowed rows (default: 100)
│   ├── autoSave?: boolean - Auto-save on changes (default: true)
│   ├── saveDelay?: number - Auto-save delay in ms (default: 1000)
│   ├── testID?: string - Test identifier (default: undefined)
│   └── accessibilityLabel?: string - Screen reader label (default: 'Estimate table')
└── Event Handlers:
    ├── onDataChange: (updatedData: EstimateRow[]) => void - Data change handler
    ├── onRowAdd?: (newRow: EstimateRow) => void - New row addition handler
    ├── onRowDelete?: (rowId: string) => void - Row deletion handler
    ├── onRowEdit?: (rowId: string, field: string, value: any) => void - Cell edit handler
    ├── onSort?: (column: string, direction: 'asc' | 'desc') => void - Sort handler
    ├── onValidationError?: (errors: ValidationError[]) => void - Validation error handler
    ├── onSave?: (data: EstimateRow[]) => void - Manual save handler
    └── onCalculationComplete?: (totals: CalculationResults) => void - Calculation handler

INTERNAL STATE:
├── editingCell: { rowId: string; column: string } | null - Currently editing cell
├── sortConfig: { column: string; direction: 'asc' | 'desc' } | null - Current sort state
├── validationErrors: ValidationError[] - Current validation errors
├── unsavedChanges: boolean - Unsaved changes indicator
├── calculatedTotals: CalculationResults - Computed totals and calculations
├── selectedRows: Set<string> - Selected row IDs for bulk operations
└── savingState: 'idle' | 'saving' | 'saved' | 'error' - Auto-save state

STYLING (Gray Design Tokens):
├── Default: 
│   ├── Table background: colors.background.surface (#FFFFFF)
│   ├── Header: colors.background.secondary (#E5E7EB)
│   ├── Borders: colors.border.default (#E5E7EB)
│   ├── Alternate rows: colors.background.primary (#F3F4F6) subtle tint
│   └── Text: colors.text.primary (#111827)
├── Hover/Focus: 
│   ├── Row hover: colors.background.secondary (#E5E7EB) tint
│   ├── Cell focus: colors.border.focus (#52525B) 2px border
│   ├── Header hover: colors.interactive.hover (#71717A) tint
│   └── Selected rows: colors.interactive.pressed (#3F3F46) background
├── Disabled: 
│   ├── Readonly cells: colors.background.tertiary (#D1D5DB) tint
│   ├── Disabled text: colors.text.disabled (#D1D5DB)
│   └── Reduced opacity: 0.6
└── Error: 
    ├── Validation errors: semantic.error.background (#FEF2F2) cell background
    ├── Error borders: semantic.error.primary (#DC2626)
    ├── Error text: semantic.error.primary (#DC2626)
    └── Save errors: warning indicators

ACCESSIBILITY:
├── ARIA labels: accessibilityRole="grid", proper row/cell roles
├── Screen reader support: Announces table structure, cell values, edit states
├── Keyboard navigation: Arrow keys for cell navigation, Tab for controls, Enter to edit
├── Touch targets: Minimum 44pt for all interactive elements
└── Color contrast compliance: All text and indicator colors meet standards

ERROR STATES:
├── Validation Error: invalid cell data → red border + error message → correction required
├── Save Error: auto-save fails → show unsaved indicator → retry save → manual save option
└── Calculation Error: formula error → highlight affected cells → show error explanation

USAGE EXAMPLE:
```jsx
<EstimateTable
  data={estimateRows}
  onDataChange={updateEstimateData}
  columns={[
    { key: 'item', title: 'Item', type: 'text', editable: true },
    { key: 'quantity', title: 'Qty', type: 'number', editable: true },
    { key: 'unit', title: 'Unit', type: 'select', options: unitOptions },
    { key: 'rate', title: 'Rate', type: 'currency', editable: true },
    { key: 'total', title: 'Total', type: 'currency', calculated: true }
  ]}
  validation={{
    quantity: { required: true, min: 0 },
    rate: { required: true, min: 0 }
  }}
  showTotals
  autoSave
  onValidationError={(errors) => handleValidationErrors(errors)}
  accessibilityLabel={`Estimate table for ${projectName} with ${estimateRows.length} items`}
/>
```

TESTING REQUIREMENTS:
├── Unit tests for all editing modes and calculation scenarios
├── Accessibility tests (screen readers, keyboard navigation, table structure)
├── Error state testing (validation failures, save errors, calculation errors)
└── Performance tests (large datasets, real-time calculations, auto-save performance)

---

## 🔧 Implementation Guidelines

### Construction Industry Optimizations
- **Glove-Friendly Design**: All touch targets minimum 44pt
- **Outdoor Visibility**: High contrast text, minimal glare backgrounds
- **Professional Appearance**: Gray-only color scheme appropriate for business
- **Offline Capability**: Components cache data and sync when connected
- **Voice Integration**: VoiceInput optimized for construction site noise
- **Large Text**: 18px base size for readability in various lighting

### Gray Design Token Integration
All components reference the centralized `GrayDesignTokens.ts` system:
```typescript
import { GrayDesignTokens } from '../constants/GrayDesignTokens';

// Example usage in component styling
const buttonStyle = {
  backgroundColor: GrayDesignTokens.colors.interactive.default,
  borderRadius: GrayDesignTokens.borderRadius.button,
  minHeight: GrayDesignTokens.components.button.primary.minHeight,
  ...GrayDesignTokens.shadows.button,
};
```

### Accessibility Compliance
- WCAG AA standards met (4.5:1 contrast ratios)
- Screen reader optimizations with proper ARIA labels
- Keyboard navigation support throughout
- Voice control compatibility
- Construction-specific accessibility considerations

### Testing Strategy
- **Unit Tests**: Component logic, props handling, state management
- **Accessibility Tests**: Screen readers, keyboard navigation, touch targets
- **Error Handling**: Network failures, validation errors, permission issues
- **Performance**: Animation smoothness, large data sets, battery usage
- **Integration**: Component interaction, data flow, API integration

### File Organization
```
/components/
├── ui/
│   ├── GrayButton.tsx
│   ├── GrayInput.tsx
│   ├── GrayCard.tsx
│   └── index.ts
├── navigation/
│   └── DrawerMenu.tsx
├── construction/
│   ├── PromptChips.tsx
│   ├── AIActionCard.tsx
│   ├── VoiceInput.tsx
│   ├── ProgressSlider.tsx
│   ├── ReceiptCapture.tsx
│   └── EstimateTable.tsx
└── __tests__/
    ├── GrayButton.test.tsx
    └── [component].test.tsx
```

This specification provides a comprehensive foundation for implementing all required components with construction industry optimization, accessibility compliance, and consistent gray design system integration.