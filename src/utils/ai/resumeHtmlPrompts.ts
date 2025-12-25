/**
 * Resume HTML Prompt Templates
 * Claude generates HTML/CSS which is then rendered and coordinates extracted
 */

import type { ResumeInputData, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

export function buildResumeHtmlSystemPrompt(
  style: string,
  definition: GenericAITemplateDefinition
): string {
  const { colorScheme, typography } = definition;

  return `You are an expert HTML/CSS developer creating a professional resume layout.

## CRITICAL REQUIREMENTS
1. Output ONLY valid HTML - no markdown, no explanation, no code fences
2. Start with <div class="resume"> and end with </div>
3. Use INLINE STYLES only (no <style> tags)
4. All measurements in pixels (px)
5. Do NOT use any emojis - use only plain text characters

## CONTAINER SPECIFICATIONS
- Container size: ${CANVAS_WIDTH}px width × ${CANVAS_HEIGHT}px height (A4 ratio)
- Use box-sizing: border-box on all elements

## DESIGN STYLE: ${style.toUpperCase()}
Color Scheme:
- Primary (sidebar bg): ${colorScheme.primary}
- Secondary: ${colorScheme.secondary}
- Accent: ${colorScheme.accent}
- Dark text: ${colorScheme.textDark}
- Light text: ${colorScheme.textLight}

Typography:
- Font family: ${typography.fontFamily}, sans-serif
- Name: ${typography.titleSize}px
- Section headings: ${typography.headingSize}px
- Body: ${typography.bodySize}px
- Small: ${typography.smallSize}px

## LAYOUT STRUCTURE (Two-Column with Sidebar)
Use flexbox with two columns:

LEFT SIDEBAR (30% width, ~178px):
- Background: ${colorScheme.primary}
- Text color: white
- Padding: 25px
- Contains: Contact, Skills, Languages, Hobbies

MAIN CONTENT (70% width, ~417px):
- Background: white
- Text color: ${colorScheme.textDark}
- Padding: 30px
- Contains: Name/Title, Profile Summary, Experience, Education

## SECTION STYLING
Each section should have:
- Section title: uppercase, letter-spacing: 2px, margin-bottom: 15px
- Content with appropriate spacing

## SIDEBAR SECTIONS
1. CONTACT - Email, Phone, Address (with icons or labels)
2. SKILLS - List of skills (can use progress bars or simple list)
3. LANGUAGES - Language with proficiency level
4. HOBBIES - Simple list

## MAIN SECTIONS
1. HEADER - Full name (large), Job title below
2. PROFILE - Brief professional summary paragraph
3. EXPERIENCE - Each job with: Title, Company, Dates, Achievements (bullet points)
4. EDUCATION - Each degree with: Degree, Institution, Dates

## TEXT WRAPPING
- All text containers (p, div with text) must have: word-wrap: break-word; overflow-wrap: break-word;
- Long paragraphs like Profile Summary MUST wrap within their section width
- Do NOT let text overflow its container

## HTML STRUCTURE
<div class="resume" style="width: ${CANVAS_WIDTH}px; height: ${CANVAS_HEIGHT}px; display: flex; font-family: ${typography.fontFamily}, sans-serif; box-sizing: border-box; overflow: hidden;">
  <div style="width: 30%; background: ${colorScheme.primary}; color: white; padding: 25px; box-sizing: border-box; overflow: hidden;">
    <!-- Sidebar content - all text must wrap within 128px content width -->
  </div>
  <div style="width: 70%; background: white; padding: 30px; box-sizing: border-box; overflow: hidden;">
    <!-- Main content - all text must wrap within 357px content width -->
  </div>
</div>

OUTPUT ONLY THE HTML. NO OTHER TEXT.`;
}

export function buildResumeHtmlUserPrompt(
  userData: ResumeInputData,
  style: string,
  definition: GenericAITemplateDefinition
): string {
  const experienceText = userData.workExperience.map((exp, i) =>
    `${i + 1}. ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})
   Location: ${exp.location || 'N/A'}
   Achievements: ${exp.achievements?.join('; ') || 'N/A'}`
  ).join('\n');

  const educationText = userData.education.map((edu, i) =>
    `${i + 1}. ${edu.degree} - ${edu.institution} (${edu.startDate} - ${edu.endDate || 'Present'})`
  ).join('\n');

  return `Create an HTML resume with this data:

## PERSONAL INFO
- Full Name: ${userData.fullName}
- Job Title: ${userData.jobTitle}
- Email: ${userData.email}
- Phone: ${userData.phone || 'N/A'}
- Address: ${userData.address || 'N/A'}
- LinkedIn: ${userData.linkedIn || 'N/A'}
- Website: ${userData.website || 'N/A'}

## PROFILE SUMMARY
${userData.profileSummary || 'Professional with experience in the field.'}

## WORK EXPERIENCE (${userData.workExperience.length} positions)
${experienceText || 'No experience listed'}

## EDUCATION (${userData.education.length} entries)
${educationText || 'No education listed'}

## SKILLS
${userData.skills?.join(', ') || 'No skills listed'}

## LANGUAGES
${userData.languages?.map(l => `${l.language}: ${l.proficiency}`).join(', ') || 'No languages listed'}

## HOBBIES
${userData.hobbies?.join(', ') || 'No hobbies listed'}

Generate the complete HTML resume. Start with <div class="resume" and end with </div>.`;
}
