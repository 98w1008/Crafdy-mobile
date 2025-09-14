# Krafty Construction App - Comprehensive Design System
## Chat-Centric Gray Design System for Construction Industry

---

## 🎯 **PROJECT OVERVIEW**

**Purpose**: Large-scale renovation and new construction site management app focused on chat-centric workflows where supervisors and site managers complete daily reports, estimates, progress tracking, receipt reading, and document reference within 3 taps.

**Design Philosophy**: Gray-based, eye-friendly, simple but professional appearance. No tabs - all functionality flows from central chat interface.

**Target Users**: Construction site supervisors (親方), team leaders (職長), workers in challenging field environments.

---

## 🎨 **DESIGN PRINCIPLES (MANDATORY COMPLIANCE)**

### **Color System Requirements**
- **Gray-based palette ONLY** - No green, orange, or accent colors
- **Minimize brightness/glare** - Prohibit excessive white usage
- **Shadow & gradation hierarchy** - Depth through elevation, not color
- **8-12px border radius** - Consistent, avoid excessive roundness
- **Large text sizes** - 1.4+ line height, 44×44pt minimum touch targets
- **Monochrome line icons** - 2px stroke width, 24px size
- **Dark mode compatibility** - Must look good with gray scale only

---

## 📐 **DESIGN TOKENS**

### **Color Palette**
| Category | Token | Hex | Usage |
|----------|-------|-----|--------|
| **Background** | `background.primary` | `#F3F4F6` | App base background |
| | `background.secondary` | `#E5E7EB` | Section backgrounds |
| | `background.surface` | `#FFFFFF` | Card/elevated surfaces |
| | `background.subtle` | `#F9FAFB` | Subtle distinctions |
| **Text** | `text.primary` | `#111827` | Main content text |
| | `text.secondary` | `#6B7280` | Supporting text |
| | `text.tertiary` | `#9CA3AF` | Placeholder/disabled |
| | `text.heading` | `#374151` | Section headings |
| **Borders** | `border.light` | `#D1D5DB` | Default borders |
| | `border.medium` | `#9CA3AF` | Emphasized borders |
| | `border.strong` | `#6B7280` | Strong separation |
| **Interactive** | `button.default` | `#E5E7EB` | Default button background |
| | `button.pressed` | `#D1D5DB` | Button pressed state |
| | `button.disabled` | `#F3F4F6` | Disabled button state |

### **Typography Scale**
| Size | Token | px | Usage |
|------|-------|----|----|
| Display | `fontSize.display` | `32px` | Hero headings |
| Heading 1 | `fontSize.h1` | `24px` | Main headings |
| Heading 2 | `fontSize.h2` | `20px` | Section headings |
| Body Large | `fontSize.bodyLg` | `18px` | Primary text (base) |
| Body | `fontSize.body` | `16px` | Secondary text |
| Caption | `fontSize.caption` | `14px` | Small text/labels |
| Fine Print | `fontSize.small` | `12px` | Timestamps/metadata |

### **Spacing System (8pt Grid)**
| Size | Token | px | Usage |
|------|-------|----|----|
| XS | `spacing.xs` | `4px` | Micro spacing |
| SM | `spacing.sm` | `8px` | Small gaps |
| MD | `spacing.md` | `16px` | Standard spacing |
| LG | `spacing.lg` | `24px` | Section spacing |
| XL | `spacing.xl` | `32px` | Large sections |
| 2XL | `spacing.2xl` | `48px` | Major sections |

### **Shadow System**
| Level | Token | Value | Usage |
|-------|-------|-------|-------|
| Card | `shadow.card` | `0 1px 3px rgba(0,0,0,0.1)` | Content cards |
| Button | `shadow.button` | `0 2px 4px rgba(0,0,0,0.1)` | Interactive elements |
| Modal | `shadow.modal` | `0 4px 16px rgba(0,0,0,0.15)` | Overlays/modals |
| Floating | `shadow.float` | `0 8px 24px rgba(0,0,0,0.12)` | FABs/notifications |

### **Border Radius**
| Size | Token | px | Usage |
|------|-------|----|----|
| Small | `radius.sm` | `8px` | Buttons, inputs |
| Medium | `radius.md` | `12px` | Cards, containers |
| Large | `radius.lg` | `16px` | Modals, major UI |

---

## 📱 **SCREEN WIREFRAMES**

### **1. Chat Home Screen (Primary Interface)**

```
=== CHAT HOME SCREEN ===

[Header - Fixed Top]
├── Left: [☰] Hamburger Menu (44×44pt)
├── Center: "お疲れ様です、{name}さん" (18px, #374151)
└── Right: [👤] Settings (44×44pt)

[Prompt Chips - Collapsible Section]
├── Toggle: [▼] "よく使う操作" (hidden by default)
└── Chips: (when expanded, horizontal scroll)
    ├── "日報作成" "レシート読取" "進捗更新"
    ├── "見積作成" "工程表" "資料参照"
    └── Auto-sorted by usage frequency + AI priority

[Chat Area - Scrollable Main Content]
├── AI Welcome: "何かお手伝いできることはありますか？"
├── Message Bubbles: User/AI conversation history
├── AI Action Cards: Contextual suggestions (inline)
└── System Messages: Status updates, reminders

[Input Area - Fixed Bottom]
├── [+] Attach Menu (44×44pt) → 6 functions menu
├── Text Input: "メッセージを入力..." (expandable)
├── [🎤] Voice Button: Tap=transcribe, Hold=summarize
└── [→] Send Button (44×44pt, appears with text)

NAVIGATION FLOW:
- All features accessible through chat interface
- No bottom tabs - drawer menu for secondary access
- Voice-first design for hands-free operation
```

### **2. Drawer Menu (Half-Screen Overlay)**

```
=== DRAWER MENU ===

[User Profile Section]
├── Profile Photo: Circular 60×60pt
├── Name: "{name}さん" (16px bold, #333)
├── Role: "親方" or "職長" or "ワーカー"
└── Company: Company name (14px, #666)

[Primary Navigation]
├── 🏠 チャットに戻る (44pt height)
├── 📊 ダッシュボード
├── 📋 プロジェクト管理  
├── 📝 日報・記録
├── 💰 見積・請求
├── 📷 レシート管理
├── ⚙️ 設定
└── ❓ ヘルプ・サポート

[Quick Actions] 
├── "新しい日報" "レシート読取"
├── "緊急連絡" (red text for emergency)
└── Recent activity indicators

INTERACTION:
- Slides out 50% of screen width
- Tap outside or swipe to close
- Auto-close after navigation selection
```

### **3. AI Action Card (Inline Component)**

```
=== AI ACTION CARD ===

[Card Header]
├── 🤖 AI Avatar (24×24pt)
├── "提案アクション" (14pt bold)
├── Timestamp: "2分前" (12pt, #999)
└── [×] Dismiss (24×24pt)

[Action Content]
├── 📝 Context Icon (32×32pt) 
├── "日報を作成しますか？" (16pt, #333)
├── "本日の作業が完了したようです" (14pt, #666)
└── Confidence: ●●●○ indicator

[Action Buttons - Horizontal]
├── "はい、作成" (Primary, 44pt height)
├── "後で" (Secondary, 44pt height)
└── "いいえ" (Text button, 44pt height)

[Expandable Options]
├── [▼] "オプション" toggle
├── ☑ "写真を含める"
├── ☐ "進捗も更新"  
└── ☐ "自動送信"

STATES:
- Loading: Spinner in primary button
- Success: Green checkmark + auto-dismiss
- Error: Red error message + retry
```

---

## 🔄 **MAIN WORKFLOWS**

### **A. Daily Report Creation (3-Tap Target)**

**Flow**: Chat → "/日報" or + Menu → Form → Submit

```
STEP 1: Access (1 tap)
├── Trigger: Chat command or + button menu
├── Screen: Single form interface
└── Time: <1 second response

STEP 2: Fill (Voice preferred, 1 interaction)
├── Voice Input: "今日は8時間、順調に進行"
├── AI Processing: Extract hours, status, notes  
├── Form Auto-fill: Date (today), hours, status
└── Time: 10-30 seconds including voice processing

STEP 3: Confirm (1 tap)
├── Review: AI-generated summary
├── Submit: Single tap confirmation
└── Success: "日報を送信しました" + return to chat

SUCCESS CRITERIA: ≤3 taps, ≤60 seconds total time
```

### **B. Receipt Reading (Camera → OCR → Confirm)**

**Flow**: Chat → + Menu → Camera → OCR → Save

```
STEP 1: Camera Access (1 tap)
├── Trigger: + menu → "レシート読取"
├── Permission: Camera access if needed
└── Interface: Full-screen camera with guide overlay

STEP 2: Capture (1 tap) 
├── Photo: Tap shutter or select from gallery
├── Processing: AI OCR extraction (3-5 seconds)
├── Guide: Rectangle overlay for receipt alignment
└── Fallback: Manual input if OCR fails

STEP 3: Confirm (1 tap)
├── Review: Extracted store, date, amount, items
├── Edit: Quick corrections if needed
├── Save: Single tap to add to project
└── Success: "レシートを保存しました" + chat return

SUCCESS CRITERIA: ≤3 taps, ≤30 seconds total time
```

### **C. Progress Update (Slider + Notes)**

**Flow**: Chat → Progress card → Slider → Save

```  
STEP 1: Select Progress Item (1 tap)
├── Trigger: AI action card or chat command
├── Screen: Progress update modal
└── Context: Current % and last update shown

STEP 2: Adjust Progress (1 slider interaction)
├── Slider: Drag to new percentage (0-100%)
├── Live Update: Real-time percentage display
├── Smart Suggestions: Common values (25%, 50%, 75%, 100%)
└── Optional: Voice notes or text comments

STEP 3: Confirm Update (1 tap)
├── Review: Progress change and optional notes
├── Submit: "更新" button
├── Processing: Update project timeline
└── Success: "進捗を更新しました" + return to chat

SUCCESS CRITERIA: ≤3 taps, ≤20 seconds total time
```

### **D. Simple Estimate (3-Button → AI → Edit)**

**Flow**: Chat → Estimate type → AI generation → Review

```
STEP 1: Select Estimate Type (1 tap)
├── Options: 3 template buttons
│   ├── "材料費見積" (Materials only)
│   ├── "工事見積" (Full construction)  
│   └── "修理・メンテナンス" (Repair work)
├── Context: Project size, urgency auto-detected
└── Time: <1 second selection

STEP 2: AI Generation (1 voice input)
├── Voice Prompt: "コンクリート工事、50平米"
├── AI Processing: Generate itemized estimate
├── Loading: "見積を生成中..." (3-5 seconds)
└── Fallback: Template selection if AI unavailable

STEP 3: Review & Save (1 tap)
├── Display: AI-generated line items with totals
├── Quick Edit: Inline editing for adjustments
├── Save: "見積を保存" button
└── Success: PDF generation + chat return

SUCCESS CRITERIA: ≤3 taps, ≤60 seconds total time
```

---

## 🧩 **COMPONENT SPECIFICATIONS**

### **Core UI Components**

#### **GrayButton**
```typescript
interface GrayButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// Styling (44pt minimum height)
primary: { bg: '#E5E7EB', pressed: '#D1D5DB' }
secondary: { bg: 'transparent', border: '#9CA3AF' }  
ghost: { bg: 'transparent', text: '#6B7280' }
```

#### **GrayInput**  
```typescript
interface GrayInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  maxLength?: number;
  editable?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  errorMessage?: string;
  helpText?: string;
}

// Styling (44pt minimum height)
default: { bg: '#F9FAFB', border: '#D1D5DB' }
focus: { border: '#9CA3AF', shadow: '0 0 0 3px rgba(156,163,175,0.1)' }
error: { border: '#EF4444', bg: '#FEF2F2' }
```

#### **GrayCard**
```typescript
interface GrayCardProps {
  children: ReactNode;
  padding?: 'none' | 'small' | 'medium' | 'large';
  shadow?: 'none' | 'small' | 'medium' | 'large';
  borderRadius?: 'small' | 'medium' | 'large';
  backgroundColor?: 'surface' | 'subtle' | 'secondary';
  pressable?: boolean;
  onPress?: () => void;
}

// Styling
surface: { bg: '#FFFFFF', shadow: 'card' }
subtle: { bg: '#F9FAFB', shadow: 'none' }
secondary: { bg: '#E5E7EB', shadow: 'small' }
```

### **Specialized Components**

#### **VoiceInput**
```typescript
interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onSummary?: (summary: string) => void;
  mode?: 'transcribe' | 'summarize';
  language?: 'ja' | 'en';
  noiseReduction?: boolean;
  autoStart?: boolean;
  maxDuration?: number;
}

// Construction site optimizations:
// - Noise reduction for outdoor environments
// - Large 44pt touch target for gloved hands
// - Visual feedback for recording state
// - Automatic pause detection
```

#### **ProgressSlider**
```typescript
interface ProgressSliderProps {
  value: number; // 0-100
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbStyle?: ViewStyle;
  trackStyle?: ViewStyle;
  step?: number;
  snapToStep?: boolean;
  showValue?: boolean;
  suffix?: string;
}

// Styling (construction optimized)
// - Large thumb (32×32pt) for gloved operation
// - High contrast colors for outdoor visibility
// - Haptic feedback on value changes
```

---

## ♿ **ACCESSIBILITY COMPLIANCE**

### **WCAG AA Standards**
- **Color Contrast**: Minimum 4.5:1 ratio for all text
- **Touch Targets**: Minimum 44×44pt for all interactive elements
- **Text Size**: 18px base size, scalable to 200%
- **Focus Indicators**: Clear focus states for keyboard navigation

### **Screen Reader Support**
```typescript
// Example accessibility props
<GrayButton
  title="日報作成"
  accessibilityLabel="新しい日報を作成する"
  accessibilityHint="フォームが開き、今日の作業内容を入力できます"
  accessibilityRole="button"
/>
```

### **Construction Site Adaptations**
- **Voice Input Primary**: Hands may be dirty/gloved
- **High Contrast UI**: Bright outdoor lighting conditions  
- **Large Touch Targets**: Work gloves reduce precision
- **Offline Capability**: Unreliable network in construction sites
- **Haptic Feedback**: Confirms actions when audio unclear

---

## ⚠️ **ERROR HANDLING & EDGE CASES**

### **Network Conditions**
- **Offline Mode**: Core functions work without internet
- **Poor Connection**: Graceful degradation, retry mechanisms
- **Timeout Handling**: Clear user feedback, manual retry options

### **Permission Errors**
- **Camera Access**: Clear explanation, settings deep-link
- **Location Services**: Fallback to manual entry
- **Microphone Access**: Text input alternative always available

### **Validation Errors**
- **Form Fields**: Inline validation with specific error messages
- **File Uploads**: Size limits, format restrictions clearly communicated
- **Data Entry**: Real-time validation, prevention better than correction

---

## 📋 **ACCEPTANCE CRITERIA**

### **Core Requirements** ✅
- [x] Chat-only home screen (no bottom tabs)
- [x] Drawer navigation slides 50% screen width
- [x] Prompt chips toggle with arrow (default hidden)
- [x] + button expands to 6 main functions with auto-sorting
- [x] Voice input: tap=transcribe, hold=summarize
- [x] AI action cards with inline display and sharing
- [x] Gray-only color scheme with good visibility
- [x] Required information collection doesn't block daily reports

### **3-Tap Compliance** ✅
- [x] Daily reports: 3 taps or less with voice input
- [x] Receipt reading: Camera → OCR → confirm (3 taps)
- [x] Progress updates: Select → adjust → save (3 taps)  
- [x] Simple estimates: Type → describe → save (3 taps)

### **Professional Standards** ✅
- [x] Construction industry appropriate design
- [x] Eye-friendly gray palette reduces glare
- [x] Professional appearance (not cheap looking)
- [x] WCAG AA accessibility compliance
- [x] 8-12px consistent border radius
- [x] 44pt minimum touch targets throughout

---

## 🚀 **IMPLEMENTATION PRIORITIES**

### **Phase 1: Core Chat System**
1. Replace tab navigation with single chat screen
2. Implement gray design token system
3. Create drawer navigation component
4. Build prompt chips with toggle functionality

### **Phase 2: Essential Workflows** 
1. Daily report 3-tap flow with voice input
2. Receipt OCR with camera integration
3. Progress slider with real-time updates
4. AI action cards for contextual suggestions

### **Phase 3: Advanced Features**
1. Simple estimate with AI generation
2. Offline synchronization system
3. Advanced voice processing with noise reduction
4. Role-based permission system

### **Phase 4: Polish & Optimization**
1. Performance optimization for construction sites
2. Advanced accessibility features
3. Comprehensive error handling
4. User analytics and AI learning systems

---

This comprehensive design system provides a complete foundation for building Krafty's construction industry app with chat-centric workflows, professional gray aesthetics, and 3-tap efficiency optimized for challenging field environments.