/**
 * Resume-Specific Prompt Templates for Claude AI
 * Generates structured JSON output for resume layouts
 */

import type { ResumeInputData, ResumeStyle, AITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

// ============================================================================
// Layout Constraints by Style
// ============================================================================

export interface SectionBounds {
  name: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  textColor: string;
  maxCharsPerLine: number;
  zIndexBase: number; // Base z-index for items in this section
}

export interface LayoutSpec {
  sidebar: { xStart: number; xEnd: number; bgColor: string; textColor: string } | null;
  main: { xStart: number; xEnd: number; textColor: string };
  header: { yStart: number; yEnd: number };
  sections: { yStart: number; yEnd: number };
  // Detailed section boundaries for text wrapping
  sectionBounds: SectionBounds[];
}

export const RESUME_LAYOUT_SPECS: Record<ResumeStyle, LayoutSpec> = {
  professional: {
    sidebar: { xStart: 0, xEnd: 0.30, bgColor: '#1e2a3a', textColor: '#ffffff' },
    main: { xStart: 0.35, xEnd: 0.95, textColor: '#1e2a3a' },
    header: { yStart: 0.03, yEnd: 0.12 },
    sections: { yStart: 0.14, yEnd: 0.97 },
    sectionBounds: [
      // SIDEBAR SECTIONS (left column, dark background)
      { name: 'sidebar_contact', xStart: 0.03, xEnd: 0.27, yStart: 0.03, yEnd: 0.26, textColor: '#ffffff', maxCharsPerLine: 22, zIndexBase: 10 },
      { name: 'sidebar_skills', xStart: 0.03, xEnd: 0.27, yStart: 0.27, yEnd: 0.50, textColor: '#ffffff', maxCharsPerLine: 22, zIndexBase: 10 },
      { name: 'sidebar_languages', xStart: 0.03, xEnd: 0.27, yStart: 0.51, yEnd: 0.74, textColor: '#ffffff', maxCharsPerLine: 22, zIndexBase: 10 },
      { name: 'sidebar_hobbies', xStart: 0.03, xEnd: 0.27, yStart: 0.75, yEnd: 0.97, textColor: '#ffffff', maxCharsPerLine: 22, zIndexBase: 10 },
      // MAIN AREA SECTIONS (right column, white background)
      { name: 'main_header', xStart: 0.35, xEnd: 0.95, yStart: 0.03, yEnd: 0.12, textColor: '#1e2a3a', maxCharsPerLine: 50, zIndexBase: 20 },
      { name: 'main_profile', xStart: 0.35, xEnd: 0.95, yStart: 0.13, yEnd: 0.26, textColor: '#1e2a3a', maxCharsPerLine: 55, zIndexBase: 20 },
      { name: 'main_experience', xStart: 0.35, xEnd: 0.95, yStart: 0.27, yEnd: 0.62, textColor: '#1e2a3a', maxCharsPerLine: 55, zIndexBase: 20 },
      { name: 'main_education', xStart: 0.35, xEnd: 0.95, yStart: 0.63, yEnd: 0.97, textColor: '#1e2a3a', maxCharsPerLine: 55, zIndexBase: 20 },
    ],
  },
  modern: {
    sidebar: null,
    main: { xStart: 0.05, xEnd: 0.95, textColor: '#1e293b' },
    header: { yStart: 0.04, yEnd: 0.18 },
    sections: { yStart: 0.22, yEnd: 0.95 },
    sectionBounds: [
      { name: 'header', xStart: 0.05, xEnd: 0.95, yStart: 0.04, yEnd: 0.18, textColor: '#1e293b', maxCharsPerLine: 75, zIndexBase: 10 },
      { name: 'profile', xStart: 0.05, xEnd: 0.95, yStart: 0.22, yEnd: 0.32, textColor: '#1e293b', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'experience', xStart: 0.05, xEnd: 0.60, yStart: 0.34, yEnd: 0.95, textColor: '#1e293b', maxCharsPerLine: 50, zIndexBase: 10 },
      { name: 'sidebar_right', xStart: 0.62, xEnd: 0.95, yStart: 0.34, yEnd: 0.95, textColor: '#1e293b', maxCharsPerLine: 28, zIndexBase: 10 },
    ],
  },
  classic: {
    sidebar: null,
    main: { xStart: 0.05, xEnd: 0.95, textColor: '#1f2937' },
    header: { yStart: 0.04, yEnd: 0.16 },
    sections: { yStart: 0.20, yEnd: 0.95 },
    sectionBounds: [
      { name: 'header', xStart: 0.05, xEnd: 0.95, yStart: 0.04, yEnd: 0.16, textColor: '#1f2937', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'experience', xStart: 0.05, xEnd: 0.95, yStart: 0.20, yEnd: 0.55, textColor: '#1f2937', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'education', xStart: 0.05, xEnd: 0.95, yStart: 0.57, yEnd: 0.75, textColor: '#1f2937', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'skills', xStart: 0.05, xEnd: 0.95, yStart: 0.77, yEnd: 0.95, textColor: '#1f2937', maxCharsPerLine: 80, zIndexBase: 10 },
    ],
  },
  creative: {
    sidebar: null,
    main: { xStart: 0.05, xEnd: 0.95, textColor: '#1f2937' },
    header: { yStart: 0, yEnd: 0.18 },
    sections: { yStart: 0.22, yEnd: 0.95 },
    sectionBounds: [
      { name: 'header', xStart: 0.05, xEnd: 0.95, yStart: 0, yEnd: 0.18, textColor: '#ffffff', maxCharsPerLine: 75, zIndexBase: 20 },
      { name: 'profile', xStart: 0.05, xEnd: 0.95, yStart: 0.22, yEnd: 0.32, textColor: '#1f2937', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'experience', xStart: 0.05, xEnd: 0.50, yStart: 0.34, yEnd: 0.95, textColor: '#1f2937', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'education_skills', xStart: 0.52, xEnd: 0.95, yStart: 0.34, yEnd: 0.95, textColor: '#1f2937', maxCharsPerLine: 38, zIndexBase: 10 },
    ],
  },
};

// ============================================================================
// System Prompt for Resume Generation
// ============================================================================

export function buildResumeSystemPrompt(style: ResumeStyle, definition: AITemplateDefinition): string {
  const layout = RESUME_LAYOUT_SPECS[style];
  const { colorScheme, typography } = definition;

  // Build section boundaries documentation
  const sectionBoundsDoc = layout.sectionBounds.map(section =>
    `  - ${section.name}: X(${section.xStart.toFixed(2)}-${section.xEnd.toFixed(2)}), Y(${section.yStart.toFixed(2)}-${section.yEnd.toFixed(2)}), maxChars: ${section.maxCharsPerLine}, zIndex: ${section.zIndexBase}+`
  ).join('\n');

  return `You are a resume layout generator for a PDF editor. Generate JSON output with textItems and shapes.

## CANVAS SPECIFICATIONS
- Canvas dimensions: ${CANVAS_WIDTH}px width × ${CANVAS_HEIGHT}px height (A4 page ratio)
- Coordinates are NORMALIZED (0.0 to 1.0):
  - xNorm=0.0 is left edge, xNorm=1.0 is right edge
  - yNormTop=0.0 is top edge, yNormTop=1.0 is bottom edge
- To convert normalized to pixels: pixelX = xNorm × ${CANVAS_WIDTH}, pixelY = yNormTop × ${CANVAS_HEIGHT}

## Z-INDEX LAYERING SYSTEM - CRITICAL
Every textItem and shape MUST have a zIndex property. Items with higher zIndex are drawn ON TOP of items with lower zIndex.

Z-INDEX GUIDELINES:
- Background shapes (sidebar rectangle): zIndex: 0 (drawn first, behind everything)
- Decorative shapes (circles, lines): zIndex: 5
- Section headers: zIndex: 10
- Body text content: zIndex: 15
- Important/highlighted content: zIndex: 20

EXAMPLE:
- Sidebar background rectangle: zIndex: 0 (so text appears ON TOP)
- Text in sidebar: zIndex: 10 (appears above the background)
- Profile photo circle: zIndex: 5 (between background and text)

## LOGICAL SECTIONS WITH BOUNDARIES
The canvas is divided into logical sections. Each section has STRICT boundaries that content must respect.

${style.toUpperCase()} STYLE SECTIONS:
${sectionBoundsDoc}

### SECTION BOUNDARY RULES:
1. Content MUST stay within its section's X and Y boundaries
2. Text MUST wrap when reaching the section's X boundary (xEnd)
3. If content exceeds section's Y boundary (yEnd), it MUST NOT overflow
4. Each section has a maxCharsPerLine limit - NEVER exceed this

${layout.sidebar ? `
## SIDEBAR COLUMN (Dark Background) - EVEN DISTRIBUTION
- X range: ${layout.sidebar.xStart} to ${layout.sidebar.xEnd}
- Background color: ${layout.sidebar.bgColor} (zIndex: 0)
- Text color: ${layout.sidebar.textColor} (zIndex: 10+)
- Content X position: 0.03 to 0.27 (with padding from edges)
- Max characters per line: 20-22 characters

### EVEN DISTRIBUTION PRINCIPLE FOR SIDEBAR:
The sidebar space is divided EQUALLY among 4 sections.
Each section gets the SAME height allocation. Place content evenly within each section.

SIDEBAR SECTIONS (EVENLY DISTRIBUTED):
1. CONTACT section - Uses 1/4 of space
   - Section header "CONTACT" at section start
   - Items distributed evenly below header
2. SKILLS section - Uses 1/4 of space
   - Section header "SKILLS" at section start
   - Bullet items distributed evenly
3. LANGUAGES section - Uses 1/4 of space
   - Section header "LANGUAGES" at section start
   - Language + proficiency distributed evenly
4. HOBBIES section - Uses 1/4 of space
   - Section header "HOBBIES" at section start
   - Bullet items distributed evenly
` : ''}

## MAIN CONTENT AREA${layout.sidebar ? ' (Right Column)' : ''} - EVEN DISTRIBUTION
- X range: ${layout.main.xStart} to ${layout.main.xEnd}
- Text color: ${layout.main.textColor}
- Max characters per line: 50-55 characters

### EVEN DISTRIBUTION PRINCIPLE FOR MAIN AREA:
After the fixed header, the remaining space is divided EQUALLY among 3 sections.
Each section (Profile, Experience, Education) gets the SAME height allocation.

MAIN AREA SECTIONS (EVENLY DISTRIBUTED):
1. HEADER (Y: ${layout.header.yStart}-${layout.header.yEnd}, fixed height)
   - Full Name (large, ${typography.titleSize}px, zIndex: 20)
   - Job Title (medium, ${typography.subheadingSize}px, zIndex: 20)
2. PROFILE section - Uses 1/3 of remaining space
   - Section header with HORIZONTAL underline
   - Profile summary wrapped to fit within section
3. EXPERIENCE section - Uses 1/3 of remaining space
   - Section header with HORIZONTAL underline
   - Job entries distributed evenly within section
4. EDUCATION section - Uses 1/3 of remaining space
   - Section header with HORIZONTAL underline
   - Education entries distributed evenly within section

## COLOR SCHEME
- Primary: ${colorScheme.primary}
- Secondary: ${colorScheme.secondary}
- Accent: ${colorScheme.accent}
- Dark text: ${colorScheme.textDark}
- Light text: ${colorScheme.textLight}

## TYPOGRAPHY
- Name: ${typography.titleSize}px
- Section headers: ${typography.headingSize}px
- Job titles/degrees: ${typography.subheadingSize}px
- Body text: ${typography.bodySize}px
- Small text/dates: ${typography.smallSize}px
- Font family: ${typography.fontFamily}

## TEXT WRAPPING - CRITICAL RULE
Long text MUST be broken into multiple textItems. Each line is a SEPARATE textItem.

WRAPPING RULES BY SECTION:
- Sidebar sections: Max 20-22 characters per line
- Main area sections: Max 50-55 characters per line
- Profile summary: Wrap at ~55 chars, increment yNormTop by 0.025
- Achievement bullets: Wrap at ~50 chars, increment yNormTop by 0.022

EXAMPLE - Wrapping profile text (main area, 55 char limit):
Input: "Experienced UX Designer specializing in user research, interaction design, and prototyping. Committed to crafting intuitive digital experiences."

Output as multiple textItems:
{"text": "Experienced UX Designer specializing in user research,", "xNorm": 0.35, "yNormTop": 0.15, "fontSize": 11, "zIndex": 15}
{"text": "interaction design, and prototyping. Committed to", "xNorm": 0.35, "yNormTop": 0.175, "fontSize": 11, "zIndex": 15}
{"text": "crafting intuitive digital experiences.", "xNorm": 0.35, "yNormTop": 0.20, "fontSize": 11, "zIndex": 15}

EXAMPLE - Wrapping sidebar text (22 char limit):
Input: "Advanced proficiency in JavaScript"

Output:
{"text": "Advanced proficiency", "xNorm": 0.03, "yNormTop": 0.40, "fontSize": 10, "color": "#ffffff", "zIndex": 10}
{"text": "in JavaScript", "xNorm": 0.03, "yNormTop": 0.42, "fontSize": 10, "color": "#ffffff", "zIndex": 10}

## VERTICAL SPACING GUIDELINES
- Section header to first item: 0.03 normalized
- Between list items (skills, hobbies): 0.022 normalized
- Between wrapped text lines: 0.022-0.025 normalized
- Between bullet points: 0.022 normalized
- Between major sections: 0.04 normalized
- Between job/education entries: 0.05 normalized

## JSON OUTPUT FORMAT
Output ONLY valid JSON, no markdown code fences, no explanation:
{
  "textItems": [
    {"text": "...", "xNorm": 0.0-1.0, "yNormTop": 0.0-1.0, "fontSize": 8-36, "color": "#hex", "fontFamily": "Lato", "zIndex": 0-20}
  ],
  "shapes": [
    {"type": "rectangle|circle|line", "xNorm": 0.0-1.0, "yNormTop": 0.0-1.0, "widthNorm": 0.0-1.0, "heightNorm": 0.0-1.0, "strokeColor": "#hex", "strokeWidth": 0-5, "fillColor": "#hex|null", "zIndex": 0-20}
  ]
}

## HORIZONTAL LINES - CRITICAL DRAWING RULES
To draw a PERFECTLY HORIZONTAL line (section underline), you MUST:
1. Set the SAME yNormTop for both start and end points
2. Use widthNorm for the length, heightNorm should be 0.002 (very small, nearly 0)
3. The line draws from (xNorm, yNormTop) to (xNorm + widthNorm, yNormTop + heightNorm)

CORRECT horizontal line example (underline for "PROFILE" section):
{"type": "line", "xNorm": 0.35, "yNormTop": 0.145, "widthNorm": 0.15, "heightNorm": 0.0, "strokeColor": "${colorScheme.primary}", "strokeWidth": 2, "zIndex": 10}

WRONG (skewed line - different Y values encoded in heightNorm):
{"type": "line", "xNorm": 0.35, "yNormTop": 0.14, "widthNorm": 0.15, "heightNorm": 0.01, ...}

## REQUIRED VISUAL ELEMENTS WITH Z-INDEX
${layout.sidebar ? `1. Sidebar background rectangle:
   - type: "rectangle", xNorm: 0, yNormTop: 0, widthNorm: 0.30, heightNorm: 1.0
   - fillColor: "${layout.sidebar.bgColor}", strokeWidth: 0
   - zIndex: 0 (MUST be 0 so text appears on top)

2. Section underlines in MAIN area (MUST be horizontal):
   - type: "line"
   - xNorm: 0.35, widthNorm: 0.15 (underline width)
   - heightNorm: 0.0 (CRITICAL: must be 0 for horizontal line)
   - strokeColor: "${colorScheme.primary}", strokeWidth: 2
   - zIndex: 10` :
`1. Section underlines (MUST be horizontal):
   - type: "line"
   - heightNorm: 0.0 (CRITICAL: must be 0 for horizontal line)
   - strokeWidth: 2, strokeColor: "${colorScheme.primary}"
   - zIndex: 5

2. Optional header accent shapes with appropriate zIndex`}

## KEY RULES - FOLLOW EXACTLY
1. OUTPUT ONLY VALID JSON - no markdown, no explanation, no code fences
2. EVERY item MUST have zIndex property (shapes background: 0, text: 10-20)
3. WRAP LONG TEXT - respect maxCharsPerLine for each section
4. RESPECT SECTION BOUNDARIES - content must not overflow section bounds
5. Sidebar text: WHITE color (#ffffff), Main text: DARK color (${layout.main.textColor})
6. Dates should be RIGHT-ALIGNED (xNorm ~0.78-0.80)
7. Never exceed yNormTop: 0.97 for any element
8. Use bullet character "- " for list items
9. Sidebar background rectangle MUST have zIndex: 0`;
}

// ============================================================================
// User Prompt Builder
// ============================================================================

export function buildResumeUserPrompt(
  userData: ResumeInputData,
  style: ResumeStyle,
  definition: AITemplateDefinition
): string {
  const layout = RESUME_LAYOUT_SPECS[style];

  // Format work experience
  const experienceText = userData.workExperience.length > 0
    ? userData.workExperience.map((exp, i) =>
        `Job ${i + 1}:
  - Title: ${exp.title}
  - Company: ${exp.company}
  - Location: ${exp.location || 'N/A'}
  - Period: ${exp.startDate} - ${exp.endDate}
  - Achievements:
${exp.achievements.map(a => `    * ${a}`).join('\n')}`
      ).join('\n\n')
    : 'No work experience provided';

  // Format education
  const educationText = userData.education.length > 0
    ? userData.education.map((edu, i) =>
        `Education ${i + 1}:
  - Degree: ${edu.degree}
  - Institution: ${edu.institution}
  - Period: ${edu.startDate} - ${edu.endDate}`
      ).join('\n\n')
    : 'No education provided';

  // Format languages
  const languagesText = userData.languages.length > 0
    ? userData.languages.map(l => `${l.language} (${l.proficiency})`).join(', ')
    : 'No languages provided';

  // Format skills
  const skillsText = userData.skills.length > 0
    ? userData.skills.join(', ')
    : 'No skills provided';

  // Format hobbies
  const hobbiesText = userData.hobbies.length > 0
    ? userData.hobbies.join(', ')
    : 'No hobbies provided';

  // Calculate dynamic layout based on content
  const dynamicLayout = calculateDynamicLayout(userData);
  const layoutDoc = generateLayoutDocumentation(dynamicLayout);

  return `Generate a complete ${style.toUpperCase()} style resume layout with the following data.

## PERSONAL INFORMATION
- Full Name: ${userData.fullName}
- Job Title: ${userData.jobTitle}
- Email: ${userData.email}
- Phone: ${userData.phone || 'Not provided'}
- Address/Location: ${userData.address || 'Not provided'}
${userData.linkedIn ? `- LinkedIn: ${userData.linkedIn}` : ''}
${userData.website ? `- Website: ${userData.website}` : ''}

## PROFILE SUMMARY
${userData.profileSummary || 'No profile summary provided'}

## WORK EXPERIENCE
${experienceText}

## EDUCATION
${educationText}

## SKILLS
${skillsText}

## LANGUAGES
${languagesText}

## HOBBIES & INTERESTS
${hobbiesText}

${layoutDoc}

## LAYOUT INSTRUCTIONS
- Style: ${style}
- Primary color: ${definition.colorScheme.primary}
- Accent color: ${definition.colorScheme.accent}
${layout.sidebar ? `
- SIDEBAR (left 30% of page, dark background):
  * Background rectangle with zIndex: 0 (drawn first)
  * CONTACT section starts at Y: ${dynamicLayout.sidebar.contact.yStart.toFixed(3)}
  * SKILLS section starts at Y: ${dynamicLayout.sidebar.skills.yStart.toFixed(3)}
  * LANGUAGES section starts at Y: ${dynamicLayout.sidebar.languages.yStart.toFixed(3)}
  * HOBBIES section starts at Y: ${dynamicLayout.sidebar.hobbies.yStart.toFixed(3)}
  * All sidebar text: WHITE color (#ffffff), zIndex: 10
  * MAX 22 characters per line - WRAP longer text

- MAIN AREA (right 70% of page, white background):
  * Name at Y: ${dynamicLayout.main.header.yStart.toFixed(3)} (large, zIndex: 20)
  * Job title below name (zIndex: 20)
  * PROFILE section starts at Y: ${dynamicLayout.main.profile.yStart.toFixed(3)} with HORIZONTAL underline
  * EXPERIENCE section starts at Y: ${dynamicLayout.main.experience.yStart.toFixed(3)} with HORIZONTAL underline
  * EDUCATION section starts at Y: ${dynamicLayout.main.education.yStart.toFixed(3)} with HORIZONTAL underline
  * MAX 55 characters per line - WRAP longer text` : `
- Single/two column layout
- Name and title at top (zIndex: 20)
- All sections in main area with clear separation
- Section underlines (zIndex: 5)
- All text content (zIndex: 10-15)`}

## TEXT PLACEMENT RULES
1. SAME LINE: Items that fit together can share the same yNormTop
   - Example: "JavaScript" and "React" as separate skills on same line
   - Example: Date range at xNorm: 0.78 while job title at xNorm: 0.35
2. WRAP LONG TEXT: Break into multiple textItems with incrementing yNormTop
   - Increment by 0.022 for each new line
3. BULLET LISTS: Use "- " prefix, one item per line
4. SECTION HEADERS: Uppercase, followed by horizontal underline

## HORIZONTAL UNDERLINES - CRITICAL
Section underlines MUST be perfectly horizontal:
- heightNorm: 0.0 (ZERO - this makes it horizontal)
- widthNorm: 0.12-0.15 (length of underline)
- Place directly below section header text

## CRITICAL REMINDERS
1. EVERY textItem and shape MUST have zIndex property
2. Sidebar background rectangle: zIndex: 0 (so text appears on top)
3. All sidebar text: zIndex: 10 or higher
4. WRAP text when reaching section boundary - create multiple textItems
5. Use the CALCULATED Y positions provided above - do not overlap sections
6. Section underlines: heightNorm MUST be 0.0 for horizontal lines
7. Profile summary and achievements MUST be wrapped into multiple lines
8. Dates should be RIGHT-ALIGNED at xNorm ~0.78

Generate the complete JSON with all textItems (properly wrapped into multiple lines for long text) and shapes (sidebar background with zIndex:0, HORIZONTAL section underlines).`;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get layout specification for a resume style
 */
export function getLayoutSpec(style: ResumeStyle): LayoutSpec {
  return RESUME_LAYOUT_SPECS[style];
}

/**
 * Calculate approximate text width in normalized coordinates
 * This helps determine when to wrap text
 */
export function estimateTextWidthNorm(text: string, fontSize: number): number {
  // Approximate: 0.6 * fontSize gives average character width in pixels
  // Then normalize by canvas width
  const avgCharWidth = fontSize * 0.55;
  const textWidthPx = text.length * avgCharWidth;
  return textWidthPx / CANVAS_WIDTH;
}

/**
 * Check if text needs wrapping based on available width
 */
export function needsTextWrapping(text: string, fontSize: number, maxWidthNorm: number): boolean {
  return estimateTextWidthNorm(text, fontSize) > maxWidthNorm;
}

// ============================================================================
// Dynamic Section Calculator
// ============================================================================

interface SectionContentEstimate {
  sectionName: string;
  itemCount: number;
  estimatedLines: number;
  requiredHeight: number; // in normalized units
}

interface DynamicLayoutResult {
  sidebar: {
    contact: { yStart: number; yEnd: number; itemCount: number };
    skills: { yStart: number; yEnd: number; itemCount: number };
    languages: { yStart: number; yEnd: number; itemCount: number };
    hobbies: { yStart: number; yEnd: number; itemCount: number };
  };
  main: {
    header: { yStart: number; yEnd: number };
    profile: { yStart: number; yEnd: number; lineCount: number };
    experience: { yStart: number; yEnd: number; entryCount: number };
    education: { yStart: number; yEnd: number; entryCount: number };
  };
}

// Spacing constants (normalized units)
const SPACING = {
  sectionHeaderHeight: 0.035,      // Height for section header + underline
  lineHeight: 0.022,               // Height per text line
  itemSpacing: 0.018,              // Space between items in a list
  sectionGap: 0.015,               // Small gap between sections (reduced for even distribution)
  entryGap: 0.035,                 // Gap between work/education entries
  minSectionHeight: 0.08,          // Minimum section height
};

/**
 * Estimate how many lines a text will need when wrapped
 */
function estimateLineCount(text: string, maxCharsPerLine: number): number {
  if (!text || text.length === 0) return 0;
  return Math.ceil(text.length / maxCharsPerLine);
}

/**
 * Calculate dynamic section layout based on resume content
 * Uses EVEN DISTRIBUTION of space for sections
 */
export function calculateDynamicLayout(userData: ResumeInputData): DynamicLayoutResult {
  // === SIDEBAR CALCULATIONS (EVEN DISTRIBUTION) ===
  const sidebarStartY = 0.03;
  const sidebarEndY = 0.97;

  // Available space for sidebar sections
  const sidebarContentStart = sidebarStartY;
  const sidebarContentEnd = sidebarEndY;
  const sidebarAvailable = sidebarContentEnd - sidebarContentStart;

  // Count items in each sidebar section (for reference only)
  const contactItems = [
    userData.address,
    userData.phone,
    userData.email,
    userData.linkedIn,
    userData.website
  ].filter(Boolean).length;
  const skillsCount = userData.skills.length;
  const languagesCount = userData.languages.length;
  const hobbiesCount = userData.hobbies.length;

  // EVEN DISTRIBUTION: Divide available space equally among 4 sidebar sections
  const sidebarSectionCount = 4; // contact, skills, languages, hobbies
  const sidebarSectionHeight = (sidebarAvailable - (SPACING.sectionGap * (sidebarSectionCount - 1))) / sidebarSectionCount;

  // Calculate evenly distributed sidebar section positions
  const contactStart = sidebarContentStart;
  const contactEnd = contactStart + sidebarSectionHeight;

  const skillsStart = contactEnd + SPACING.sectionGap;
  const skillsEnd = skillsStart + sidebarSectionHeight;

  const languagesStart = skillsEnd + SPACING.sectionGap;
  const languagesEnd = languagesStart + sidebarSectionHeight;

  const hobbiesStart = languagesEnd + SPACING.sectionGap;
  const hobbiesEnd = Math.min(sidebarEndY, hobbiesStart + sidebarSectionHeight);

  // === MAIN AREA CALCULATIONS (EVEN DISTRIBUTION) ===
  const mainStartY = 0.03;
  const mainEndY = 0.97;

  // Header is fixed height (name + job title)
  const headerHeight = 0.08;
  const headerStart = mainStartY;
  const headerEnd = mainStartY + headerHeight;

  // Available space for main content sections (after header)
  const mainContentStart = headerEnd;
  const mainContentEnd = mainEndY;
  const mainAvailable = mainContentEnd - mainContentStart;

  // Count items for reference
  const profileLineCount = Math.max(2, estimateLineCount(userData.profileSummary || '', 55));
  const experienceEntryCount = userData.workExperience.length;
  const educationEntryCount = userData.education.length;

  // EVEN DISTRIBUTION: Divide available space equally among 3 main sections
  const mainSectionCount = 3; // profile, experience, education
  const mainSectionHeight = (mainAvailable - (SPACING.sectionGap * (mainSectionCount - 1))) / mainSectionCount;

  // Calculate evenly distributed main section positions
  const profileStart = mainContentStart;
  const profileEnd = profileStart + mainSectionHeight;

  const experienceStart = profileEnd + SPACING.sectionGap;
  const experienceEnd = experienceStart + mainSectionHeight;

  const educationStart = experienceEnd + SPACING.sectionGap;
  const educationEnd = Math.min(mainEndY, educationStart + mainSectionHeight);

  return {
    sidebar: {
      contact: { yStart: contactStart, yEnd: contactEnd, itemCount: contactItems },
      skills: { yStart: skillsStart, yEnd: skillsEnd, itemCount: skillsCount },
      languages: { yStart: languagesStart, yEnd: languagesEnd, itemCount: languagesCount },
      hobbies: { yStart: hobbiesStart, yEnd: hobbiesEnd, itemCount: hobbiesCount },
    },
    main: {
      header: { yStart: headerStart, yEnd: headerEnd },
      profile: { yStart: profileStart, yEnd: profileEnd, lineCount: profileLineCount },
      experience: { yStart: experienceStart, yEnd: experienceEnd, entryCount: experienceEntryCount },
      education: { yStart: educationStart, yEnd: educationEnd, entryCount: educationEntryCount },
    },
  };
}

/**
 * Generate section layout documentation for the prompt
 */
export function generateLayoutDocumentation(layout: DynamicLayoutResult): string {
  // Calculate section heights for reference
  const sidebarSectionHeight = (layout.sidebar.contact.yEnd - layout.sidebar.contact.yStart).toFixed(3);
  const mainSectionHeight = (layout.main.profile.yEnd - layout.main.profile.yStart).toFixed(3);

  return `
## EVENLY DISTRIBUTED SECTION LAYOUT

### DISTRIBUTION PRINCIPLE
- Sidebar sections are EVENLY distributed (each section gets ~${sidebarSectionHeight} height)
- Main area sections are EVENLY distributed (each section gets ~${mainSectionHeight} height)
- Content within each section should be vertically centered or top-aligned with consistent spacing

### SIDEBAR SECTIONS (X: 0.03 to 0.27) - Equal height distribution
- CONTACT: Y ${layout.sidebar.contact.yStart.toFixed(3)} to ${layout.sidebar.contact.yEnd.toFixed(3)} | Height: ${sidebarSectionHeight} | ${layout.sidebar.contact.itemCount} items
- SKILLS: Y ${layout.sidebar.skills.yStart.toFixed(3)} to ${layout.sidebar.skills.yEnd.toFixed(3)} | Height: ${sidebarSectionHeight} | ${layout.sidebar.skills.itemCount} items
- LANGUAGES: Y ${layout.sidebar.languages.yStart.toFixed(3)} to ${layout.sidebar.languages.yEnd.toFixed(3)} | Height: ${sidebarSectionHeight} | ${layout.sidebar.languages.itemCount} items
- HOBBIES: Y ${layout.sidebar.hobbies.yStart.toFixed(3)} to ${layout.sidebar.hobbies.yEnd.toFixed(3)} | Height: ${sidebarSectionHeight} | ${layout.sidebar.hobbies.itemCount} items

### MAIN SECTIONS (X: 0.35 to 0.95) - Equal height distribution
- HEADER: Y ${layout.main.header.yStart.toFixed(3)} to ${layout.main.header.yEnd.toFixed(3)} (fixed height for name/title)
- PROFILE: Y ${layout.main.profile.yStart.toFixed(3)} to ${layout.main.profile.yEnd.toFixed(3)} | Height: ${mainSectionHeight}
- EXPERIENCE: Y ${layout.main.experience.yStart.toFixed(3)} to ${layout.main.experience.yEnd.toFixed(3)} | Height: ${mainSectionHeight} | ${layout.main.experience.entryCount} entries
- EDUCATION: Y ${layout.main.education.yStart.toFixed(3)} to ${layout.main.education.yEnd.toFixed(3)} | Height: ${mainSectionHeight} | ${layout.main.education.entryCount} entries

### CONTENT PLACEMENT WITHIN SECTIONS
Each section should:
1. Start with section header at section's yStart
2. Distribute items evenly within the section's allocated space
3. Calculate item spacing: (sectionHeight - headerHeight - totalContentHeight) / (itemCount + 1)
4. Never exceed the section's yEnd boundary

### SPACING CONSTANTS
- Line height: ${SPACING.lineHeight} per text line
- Item spacing: ${SPACING.itemSpacing} between list items
- Section gap: ${SPACING.sectionGap} between sections
`;
}
