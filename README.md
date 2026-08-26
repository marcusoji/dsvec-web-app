# Umutu Gateway

MASTER DEVELOPMENT PROMPT — DSTVTE UMUTU BRANCH

You are a senior software architect, product designer, UI/UX designer, frontend engineer, backend engineer, database architect, security engineer, accessibility specialist, and DevOps engineer.

Build a production-quality institutional website and digital application/registration platform for:

Delta State Technical and Vocational Education (DSTVTE)
Umutu Branch / Annex

The finished system must feel like a professionally designed and engineered educational institution platform, not an AI-generated template, generic school website, or static landing page.

The system must combine:

1. A public institutional website
2. Technical/vocational unit directory
3. Online student application system
4. Applicant photograph upload
5. Automatic application-number generation
6. Professional downloadable application form
7. Existing-applicant detection
8. Application retrieval/download
9. Supabase backend
10. Secure administrator dashboard
11. Applicant management
12. Registration analytics
13. Efficient database/storage architecture
14. Responsive mobile-first design
15. Dynamic UI/UX and meaningful animations
16. Separate admin application within the same monorepo

---

1. CORE PRODUCT OBJECTIVE

Create a complete digital platform for DSTVTE Umutu Branch that allows prospective students to:

- Learn about the institution
- Explore available vocational/technical units
- Understand the registration process
- Apply online
- Upload their photograph
- Receive a unique application number
- Receive a professional application form
- Download their application form
- Return later and retrieve their existing application
- Avoid accidentally registering multiple times

Applicants must NOT create accounts or passwords.

Only administrators require authentication.

---

2. IMPORTANT BUSINESS RULE

The system must treat:

Registration → Application Number → Application Record → Application Form

as one continuous application lifecycle.

A downloadable form is a representation of an existing application.

It is NOT a separate registration.

Therefore:

- Downloading the form must not create another application.
- Re-downloading must not create another application.
- Regenerating a PDF must not create another application.
- Returning to the registration page must not automatically create another application.
- A duplicate registration attempt must not create another applicant record.
- The application number must never change after it has been generated.

---

3. MONOREPO ARCHITECTURE

Use a professional monorepo structure.

Example:

/apps
  /website
  /admin

/packages
  /ui
  /types
  /utils
  /config

"/apps/website"

Contains:

- Public website
- Registration system
- Application retrieval flow

"/apps/admin"

Contains:

- Admin authentication
- Dashboard
- Applicant management
- Unit management
- Analytics
- Export functionality

The admin application should be capable of being deployed separately while remaining inside the same monorepo.

Shared packages should contain reusable components, types, utilities, validation logic, and configuration where appropriate.

---

4. TECHNOLOGY STACK

Use:

- React
- TypeScript
- Supabase
- PostgreSQL through Supabase
- Supabase Authentication for administrators
- Supabase Storage
- Row Level Security
- Modern component architecture
- Responsive CSS
- Professional PDF/document-generation solution

Do not introduce unnecessary frameworks or dependencies.

Use TypeScript properly throughout the system.

---

5. BACKEND — SUPABASE

Use Supabase as the primary backend.

Supabase should handle:

- PostgreSQL database
- Administrator authentication
- Storage
- Row Level Security
- Database functions where appropriate
- Secure server-side operations where necessary

Applicants do not need Supabase Auth accounts.

Only administrators require authentication.

---

6. DATABASE ARCHITECTURE

Design a professional relational database.

Do NOT place every possible field into one massive table.

Use appropriate normalization.

Potential entities include:

applicants

Fields may include:

- id
- application_number
- first_name
- middle_name
- last_name
- email
- phone
- date_of_birth
- gender
- address
- state
- local_government
- nationality
- selected_unit_id
- registration_status
- created_at
- updated_at

Only collect fields that are genuinely necessary.

---

units

Store vocational/technical units.

Examples may include:

- ICT
- Catering
- Fashion Design
- Electrical Installation
- Plumbing
- Welding & Fabrication
- Automobile
- Carpentry & Joinery
- Cosmetology
- Building/Construction

These are examples only.

Do not present them as official DSTVTE Umutu offerings unless confirmed.

The architecture must allow administrators to:

- Add units
- Edit units
- Activate units
- Deactivate units
- Update descriptions
- Add images
- Update requirements

without changing frontend code.

---

applicant_documents

Store document/file references rather than putting large binary files directly into PostgreSQL.

---

audit/activity records

Where useful, store lightweight administrative or application activity such as:

- Registration attempts
- Duplicate-registration attempts
- Administrative status changes

Do not create unnecessary records simply for the sake of tracking everything.

---

7. DATABASE SPACE OPTIMIZATION

Database and storage efficiency is important.

Implement:

- Images stored in Supabase Storage
- Database stores only file paths/references
- Proper indexes
- Appropriate data types
- Foreign keys
- Efficient relationships
- Pagination
- Efficient queries
- No unnecessary duplication
- No large binary data inside normal database rows
- Proper storage bucket organization

Do not sacrifice data integrity simply to save database space.

The goal is:

Efficient + scalable + maintainable architecture.

---

8. APPLICATION NUMBER GENERATION

Every successful registration must automatically receive a unique application number.

A professional example:

DSTVTE-UMU-2026-00001

The exact format can be improved if a better institutional convention is appropriate.

Requirements:

- Unique
- Automatically generated
- Backend/database controlled
- Resistant to concurrent submissions
- Never duplicated
- Searchable by administrators
- Included on the downloadable application form
- Permanently associated with the applicant

Do NOT generate the number purely in frontend JavaScript.

Use a reliable database-backed mechanism.

---

9. REGISTRATION PAGE

The registration page should feel like a genuine institutional application portal.

Do NOT create one giant form.

Use a multi-step process.

Example:

Step 1 — Personal Information
Step 2 — Contact Information
Step 3 — Programme Selection
Step 4 — Photograph
Step 5 — Review
Step 6 — Submit

Include:

- Progress indicator
- Current step
- Completed steps
- Back button
- Continue button
- Validation
- Error messages
- Review stage
- Submission state
- Success state

---

10. STEP 1 — PERSONAL INFORMATION

Collect appropriate information such as:

- First name
- Middle name
- Last name
- Date of birth
- Gender
- Nationality
- State
- Local Government

Do not collect unnecessary personal information.

---

11. STEP 2 — CONTACT INFORMATION

Collect:

- Email
- Phone number
- Residential/address information where appropriate

Validate:

- Email format
- Phone format
- Required fields
- Reasonable input lengths

---

12. STEP 3 — PROGRAMME SELECTION

Allow the applicant to select their preferred vocational/technical unit.

Display units professionally using:

- Name
- Description
- Icon/image
- Skills covered
- Possible career paths
- Availability/status where applicable

The data should come from Supabase rather than being permanently hard-coded into the frontend.

---

13. STEP 4 — PHOTOGRAPH UPLOAD

Provide a professional photograph upload component.

Requirements:

- JPG
- PNG
- WebP where appropriate
- File-size restriction
- Image preview
- Replace image
- Remove image
- Validation
- Mobile file selection
- Camera support where available

Clearly communicate photograph requirements.

Store the image in Supabase Storage.

Do not store the actual image binary inside PostgreSQL.

---

14. STEP 5 — APPLICATION REVIEW

Before submission, show the applicant a complete preview.

Allow them to:

- Review details
- Go back
- Correct information
- Confirm information

The review page should resemble a final application review rather than a generic checkout screen.

---

15. STEP 6 — SUBMISSION

When the applicant submits:

1. Validate frontend information
2. Validate again on the backend
3. Check duplicate-registration conditions
4. Upload photograph
5. Create applicant record
6. Generate application number
7. Associate photograph
8. Generate/retrieve application document
9. Display successful registration

Handle failures carefully.

Do not create partial or duplicate applications.

---

16. DUPLICATE REGISTRATION DETECTION

This is a critical business requirement.

Before creating a new application, check the existing database for a matching:

Email + Phone Number combination.

The check must occur against the backend/database.

Do NOT rely solely on:

- Browser storage
- Cookies
- Frontend JavaScript
- Local state

If the same email + phone combination already exists, do NOT create another applicant.

---

17. EXISTING APPLICANT EXPERIENCE

If a user attempts to register again using an email address and phone number already associated with an application, show:

"You have already registered."

Then explain:

«An application already exists with the email address and phone number you provided.»

Display only appropriate information such as:

- Applicant name
- Application number
- Selected programme/unit
- Registration date

Then show a highly visible:

Download My Application Form

button.

The user should be able to retrieve their existing application form without creating an account.

---

18. EXISTING APPLICATION FLOW

Implement:

Registration
     ↓
Enter Email + Phone
     ↓
Backend Duplicate Check
     ↓
Existing Application?
     ↓
YES
     ↓
"You have already registered"
     ↓
Show Application Number
     ↓
Download Existing Application Form

If no matching application exists:

No Existing Application
        ↓
Continue Registration

---

19. SECURITY OF APPLICATION RETRIEVAL

Do not expose applicant information simply because someone knows an email address.

Require BOTH:

Email + Phone Number

to match an existing record.

The backend must perform the lookup.

Do not expose direct database queries to applicants.

Return only the minimum information required.

Protect application documents and photographs using appropriate Supabase Storage policies/access controls.

---

20. DUPLICATE DATABASE PROTECTION

Protect against:

- Double-clicking submit
- Refreshing during submission
- Multiple browser tabs
- Network retries
- API retries
- Concurrent submissions
- Malicious repeated requests

Use appropriate:

- Database constraints
- Indexes
- Server-side logic
- Idempotency strategies where appropriate

The business rule is:

The same email + phone combination must not create multiple applications.

Do not create an overly restrictive rule that prevents legitimate applicants from sharing an email or phone unless that is an explicit institutional policy.

---

21. SUCCESSFUL REGISTRATION SCREEN

After successful registration, do NOT simply show:

"Success!"

Create a dedicated confirmation screen.

Display:

Registration Successful

Show:

- Applicant's name
- Application number
- Selected programme
- Registration confirmation
- Date of registration

Then clearly instruct:

Download your application form now and keep it for your records.

The primary action should be:

DOWNLOAD APPLICATION FORM

The button should be visually dominant.

The applicant should clearly understand that they should download the form before leaving the page.

---

22. APPLICATION FORM GENERATION

Generate a professional application form that resembles a real institutional application document.

It should contain:

- DSTVTE branding
- Umutu Branch / Annex
- Applicant photograph
- Application number
- Full name
- Email
- Phone
- Personal information
- Selected programme/unit
- Registration date
- Declaration
- Signature area
- Administrative/office-use section where appropriate

The photograph must appear in a properly designated photograph area.

The document must be:

- Printable
- Professionally formatted
- A4-friendly
- Clearly structured
- Legible
- Suitable for physical submission

---

23. APPLICATION DOCUMENT RETRIEVAL

The application form represents the existing database record.

If an applicant downloads it again:

Do NOT create a new application.

If document generation fails:

1. Keep the original application.
2. Keep the original application number.
3. Retry document generation.
4. Allow the applicant to download the generated form.
5. Never create another applicant record.

---

24. RETURNING APPLICANT

If an applicant returns later and enters their existing email + phone combination:

Display something similar to:

You have already registered.

Application Number:
DSTVTE-UMU-2026-00042

Programme:
ICT

Registered:
August 24, 2026

[ Download Application Form ]

Always return the same application number.

---

25. ADMIN APPLICATION

Create the admin application separately:

/apps/admin

It must use Supabase Authentication.

Protect every admin route.

Unauthenticated users must not access applicant information.

---

26. ADMIN LOGIN

Create a professional admin login interface.

Include:

- Email
- Password
- Login
- Loading state
- Error state
- Session handling
- Logout

Do not expose admin credentials.

Use Supabase Auth.

---

27. ADMIN DASHBOARD

Dashboard should display meaningful statistics:

- Total applications
- Today's applications
- Applications this week
- Applications this month
- Applications per unit
- Pending applications
- Completed applications

Use charts only where they help decision-making.

Avoid decorative charts with meaningless information.

---

28. APPLICANT MANAGEMENT

Administrators should be able to:

- View applicants
- Search applicants
- Search application number
- Search name
- Search email
- Search phone
- Filter by unit
- Filter by date
- Filter by status
- View applicant details
- View photograph
- Download application form
- Update appropriate administrative status
- Export records

Use server-side pagination.

Do not load thousands of applicants into the browser at once.

---

29. APPLICANT DETAIL PAGE

When an administrator selects an applicant, show:

- Applicant photograph
- Application number
- Full name
- Email
- Phone
- Personal information
- Address
- Selected unit
- Registration date
- Application status
- Application document
- Administrative notes if appropriate

Use a clean administrative layout.

---

30. ADMIN UNIT MANAGEMENT

Allow authorized administrators to:

- Add units
- Edit units
- Activate/deactivate units
- Change descriptions
- Update requirements
- Add/update images

Do not allow a unit deletion to accidentally destroy historical applicant records.

Use deactivation/soft deletion where appropriate.

---

31. ADMIN EXPORT

Allow administrators to export filtered application records.

Examples:

- All ICT applicants
- All applicants this month
- All pending applicants
- All applications between two dates

Support:

- CSV
- Excel-compatible export

Do not export unnecessary sensitive information.

---

32. ADMIN DUPLICATE ATTEMPT VISIBILITY

Duplicate registration attempts should NOT create applicant records.

If useful, maintain a lightweight audit/activity record containing information appropriate for administrators.

Example:

Duplicate registration attempt
Email: example@email.com
Phone: ***********
Existing application: DSTVTE-UMU-2026-00042
Date: ...

Do not store excessive information simply for logging.

---

33. PUBLIC WEBSITE — HOME PAGE

Create a polished institutional homepage.

The homepage should immediately communicate:

- What DSTVTE is
- What the Umutu Branch offers
- Who it serves
- Available technical/vocational opportunities
- How to register

---

34. HERO SECTION

Create a strong hero section.

Use professional messaging around themes such as:

Skills. Opportunity. A Better Future.

Do not blindly use this exact wording if a stronger institutional message can be developed.

Include:

- Strong headline
- Supporting copy
- Register Now CTA
- Explore Programmes CTA
- Professional visual

Avoid generic AI-style hero designs.

---

35. ABOUT SECTION

Include:

- Brief institution introduction
- Umutu Branch introduction
- Practical training philosophy
- Student development

Do not invent:

- Accreditations
- Partnerships
- Statistics
- Government claims
- Official achievements

If information is unavailable, use clearly editable placeholder content.

---

36. PROGRAMMES SECTION

Display vocational/technical units dynamically.

Each unit should have:

- Name
- Description
- Image/icon
- Skills
- Career direction
- Status

---

37. WHY CHOOSE US

Possible themes:

- Practical learning
- Industry-relevant skills
- Experienced instructors
- Hands-on training
- Career development
- Entrepreneurship
- Technical competence

Only present factual institutional claims when confirmed.

---

38. REGISTRATION CTA

Create a strong section encouraging prospective students to register.

Include:

Register Now

with a clear explanation of the process.

---

39. CONTACT PREVIEW

Show basic contact information on the homepage and provide a link to the full contact page.

---

40. FOOTER

Include:

- DSTVTE Umutu Branch
- Navigation
- Programmes
- Registration
- Contact
- Social links if available
- Copyright
- Important notices

---

41. PROGRAMMES PAGE

Create a dedicated programmes page.

Users should be able to browse all available units.

Use dynamic cards and/or detailed programme sections.

The architecture should support future additions.

---

42. ABOUT PAGE

Include:

- About DSTVTE
- About Umutu Branch
- Mission
- Vision
- Values
- Training approach
- Student development

Keep content professional.

---

43. CONTACT PAGE

Include:

- Address/location
- Phone
- Email
- Opening hours
- Contact information
- Map/location section where appropriate
- Contact form if useful

Design it properly for mobile.

---

44. BRAND & VISUAL IDENTITY

The physical Umutu Branch has a light yellow/warm yellow appearance, but the website must NOT be completely yellow.

Use the yellow as a strategic accent.

Possible palette direction:

- Warm/light institutional yellow
- Off-white
- Deep charcoal
- Dark complementary institutional tone
- Neutral grey
- Subtle borders

Use yellow for:

- Primary CTAs
- Highlights
- Active states
- Icons
- Important information
- Accent elements

Do not turn every section yellow.

Maintain excellent contrast.

---

45. UI/UX DESIGN PHILOSOPHY

The website must NOT look AI-generated.

Avoid:

- Generic purple/blue AI gradients
- Excessive glassmorphism
- Excessive rounded cards
- Floating decorative elements everywhere
- Generic template layouts
- Excessive shadows
- Huge meaningless typography
- Over-animation
- Stock-looking compositions

The visual language should communicate:

Education + Technical Skills + Trust + Practicality + Nigerian institutional context + Modern professionalism.

---

46. DESIGN SYSTEM

Before building the final UI, establish a consistent design system.

Define:

- Typography
- Font hierarchy
- Color tokens
- Spacing
- Border radius
- Shadows
- Buttons
- Inputs
- Cards
- Tables
- Modals
- Tabs
- Badges
- Toasts
- Upload components
- Loading states
- Empty states
- Error states

Use reusable components.

---

47. DYNAMIC UI

The UI must NOT feel static.

Implement meaningful interactions such as:

- Smooth page transitions
- Interactive navigation
- Hover states
- Animated programme cards
- Scroll-based reveals
- Dynamic registration progress
- Form validation animations
- Photograph preview
- Search
- Filtering
- Expandable information
- Modals
- Toast notifications
- Skeleton loaders
- Success animations

Animations should improve the experience, not distract from it.

---

48. LOADING EXPERIENCE

For serious actions, provide a deliberate processing experience.

Examples:

Registration

Submitting Application...
        ↓
Validating Information...
        ↓
Uploading Photograph...
        ↓
Creating Application...
        ↓
Generating Application Number...
        ↓
Preparing Application Form...
        ↓
Registration Successful

For serious/critical actions, use approximately the requested 4-second processing experience where appropriate.

Do NOT force four-second delays on:

- Navigation
- Hover
- Opening menus
- Simple UI changes
- Basic local filtering
- Form field interaction

If a real operation takes longer, show genuine progress instead of hiding the delay.

---

49. RESPONSIVE DESIGN

Design mobile-first.

Support:

- Android
- iPhone
- Tablets
- Laptops
- Desktop

Pay particular attention to users on:

- Small screens
- Mobile browsers
- Slow connections
- Older Android devices

Optimize:

- Images
- Fonts
- JavaScript
- Network requests
- API calls

---

50. ACCESSIBILITY

Target WCAG 2.2 AA where practical.

Implement:

- Keyboard navigation
- Semantic HTML
- Proper labels
- Accessible forms
- Focus states
- Screen-reader-friendly errors
- Good contrast
- Accessible buttons
- Appropriate ARIA

---

51. SECURITY

Implement:

- Supabase Row Level Security
- Secure admin authentication
- Protected admin routes
- Input validation
- Server-side validation
- File validation
- File-size limits
- Secure storage policies
- Environment variables
- No exposed service-role key
- Appropriate rate limiting/abuse protection
- Duplicate submission protection

Never expose:

- Supabase service-role keys
- Private credentials
- Admin secrets
- Sensitive environment variables

---

52. DATA PRIVACY

Applicant data is private.

Applicants must never be able to browse other applicants.

Do not publicly expose:

- Names
- Phone numbers
- Emails
- Photographs
- Application forms
- Addresses

Protect applicant documents and photographs through appropriate access controls.

---

53. ERROR HANDLING

Create polished states for:

- Network failure
- Invalid form
- Invalid photograph
- Upload failure
- Database failure
- PDF generation failure
- Duplicate registration
- Session expiration
- Unauthorized admin access
- Empty results
- No applications
- Server errors

Never expose raw database errors to users.

---

54. PERFORMANCE

Implement:

- Lazy loading
- Optimized images
- Efficient database queries
- Pagination
- Appropriate caching
- Code splitting where useful
- Minimal unnecessary dependencies

The application must remain fast despite dynamic functionality.

---

55. APPLICATION STATISTICS

Admin analytics should include useful information such as:

- Total applications
- Applications by unit
- Daily registrations
- Monthly registrations
- Registration trends
- Status breakdown

Make statistics useful for actual institutional decisions.

---

56. CONTENT MANAGEMENT

Units and appropriate institutional content should be data-driven where practical.

Do not hard-code every programme into the frontend.

The system should be able to evolve as the institution adds new programmes.

---

57. SEED DATA

Provide development seed data.

Clearly identify fictional information.

Never present invented statistics or official claims as real.

Make institutional content editable/configurable.

---

58. PROJECT STRUCTURE

Keep the codebase clean.

Separate:

- Pages
- Components
- UI
- Hooks
- Services
- Supabase client
- Database types
- Validation
- PDF generation
- Authentication
- Admin functionality
- Utilities

Avoid giant components.

Avoid unnecessary abstraction.

---

59. CODE QUALITY

Write production-quality code.

Requirements:

- TypeScript
- Strong typing
- Clear naming
- Reusable components
- No unnecessary duplication
- Proper error handling
- Proper loading states
- No hard-coded secrets
- No fake backend
- No fake database
- No unnecessary mock API after Supabase is implemented
- Proper environment configuration

---

60. PRIMARY PUBLIC USER FLOW

HOME
 ↓
Explore Programmes
 ↓
Register Now
 ↓
Enter Email + Phone
 ↓
Check Existing Application
 ↓
 ┌───────────────────────┐
 │ Existing application? │
 └───────────────────────┘
       ↓             ↓
      YES            NO
       ↓              ↓
Already Registered   Continue
       ↓           Registration
Download Existing       ↓
Application Form    Personal Info
                       ↓
                   Contact Info
                       ↓
                  Select Programme
                       ↓
                  Upload Photograph
                       ↓
                    Review
                       ↓
                   Submit
                       ↓
                  Processing
                       ↓
             Generate Application #
                       ↓
             Generate Application Form
                       ↓
             Registration Successful
                       ↓
             DOWNLOAD APPLICATION FORM

---

61. ADMIN FLOW

ADMIN APPLICATION
        ↓
LOGIN
        ↓
SUPABASE AUTHENTICATION
        ↓
ADMIN DASHBOARD
        ↓
 ┌───────────────┬───────────────┬───────────────┐
 │ Applications  │ Analytics     │ Units         │
 └───────────────┴───────────────┴───────────────┘
        ↓
Search / Filter
        ↓
Applicant Details
        ↓
View Photograph
        ↓
View / Download Application
        ↓
Update Status
        ↓
Export Records

---

62. DOCUMENTATION REQUIRED

Before or alongside implementation, produce:

1. System architecture
2. Monorepo architecture
3. Database schema
4. Entity Relationship Diagram
5. Registration flowchart
6. Duplicate-registration flow
7. Application-number generation flow
8. Application-document generation flow
9. Supabase storage architecture
10. Authentication architecture
11. Security model
12. UI design system
13. Page hierarchy
14. Component hierarchy
15. Admin dashboard architecture
16. Deployment architecture

Documentation should be understandable to another professional developer.

---

63. QUALITY ASSURANCE

Before declaring the project complete, perform a full audit.

Frontend

Verify:

- Every page works
- Navigation works
- Mobile layout works
- Desktop layout works
- Forms work
- Validation works
- Loading states work
- Error states work
- Animations work
- No broken links
- No dead buttons

Registration

Verify:

- Required information is collected
- Photograph upload works
- Photograph validation works
- Duplicate detection works
- Application number is unique
- Database record is created correctly
- Application form is generated
- Photograph appears correctly
- Download works
- Returning applicants can retrieve their form
- Duplicate attempts do not create another record

Supabase

Verify:

- Tables are correctly structured
- Relationships work
- Storage works
- RLS is enabled
- Admin authentication works
- Applicant privacy is protected
- No service-role keys are exposed
- Queries are efficient

Admin

Verify:

- Login works
- Protected routes work
- Dashboard works
- Applicant list works
- Search works
- Filtering works
- Applicant details work
- Application download works
- Export works
- Unit management works
- Duplicate attempts can be audited where implemented

UX

Verify:

- No confusing steps
- No unexplained errors
- No unnecessary delays
- No layout overflow
- No mobile usability problems
- No inaccessible form controls
- Clear registration confirmation
- Clear "Download Application Form" CTA

---

64. FINAL DESIGN STANDARD

Approach the project as if it is being commissioned by a serious educational institution.

Do NOT optimize for:

«"This looks impressive because AI built it."»

Optimize for:

«"This looks like a professionally designed and engineered institutional platform."»

The final system should be:

- Modern
- Trustworthy
- Accessible
- Fast
- Responsive
- Professional
- Secure
- Scalable
- Maintainable
- Visually polished
- Institutionally appropriate

---

65. MOST IMPORTANT INSTRUCTION

Do not rush directly into coding.

First reason through the requirements as a:

Senior Product Designer + Software Architect + Database Engineer + Security Engineer + UX Designer.

Where my requirements are technically weak, ambiguous, inefficient, insecure, or inconsistent with professional standards:

Improve them rather than blindly following them.

Do not remove a requested feature without explaining why.

Do not add unnecessary features simply to make the project appear larger.

Use established standards for:

- Software architecture
- UI/UX
- Accessibility
- Database design
- Security
- Privacy
- Performance
- Responsive web development
- Supabase architecture
- Document generation

The final product must be a real-world production-ready DSTVTE Umutu Branch institutional website and registration platform, not a demo.

Most importantly, the system must provide a seamless lifecycle:

Discover → Register → Validate → Generate Application Number → Generate Form → Download → Return Later → Detect Existing Application → Download Existing Form

with secure administration and efficient Supabase data management behind it.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/95908de4-ffc7-43f1-8ebd-114d1ec86f81).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
