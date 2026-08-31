# Problem Statement: BhashaFlow

## 1.1 Background and Context

India is a sovereign, socialist, secular, democratic republic with a population exceeding 1.4 billion citizens, making it the world's largest democracy. Every day, millions of people across urban, semi-urban, and rural regions interact with various government departments and public service bodies to access essential civic services. These services include water supply management, electricity distribution, road maintenance, sanitation, waste disposal, healthcare support, public transportation, law enforcement, and other welfare-related facilities. Efficient grievance redressal mechanisms are therefore critical to ensure transparency, accountability, and citizen satisfaction in governance.

Over the past decade, the Government of India has undertaken multiple digital transformation initiatives under flagship programmes such as Digital India, Smart Cities Mission, e-Governance Mission Mode Projects, and UMANG. These initiatives aim to modernize public administration, improve accessibility of services, and reduce bureaucratic inefficiencies through technology-driven solutions. While such programmes have significantly improved online access to many government services, a major challenge still remains in the last-mile delivery of grievance registration and complaint resolution systems.

At present, citizens who wish to lodge complaints regarding civic issues such as potholes, streetlight failures, water leakage, sewer blockages, illegal dumping, delayed ration delivery, or power outages often face cumbersome and outdated procedures. In many regions, they are still required to physically visit municipal offices or departmental branches, wait in long queues, complete paper-based forms, and interact with multiple officials to determine the correct authority responsible for the issue. This process is time-consuming, inconvenient, and discouraging, especially for daily wage earners, elderly citizens, women, and people residing in remote areas.

Even in locations where digital complaint portals or mobile applications have been introduced, several limitations continue to hinder their effectiveness. Most existing systems are designed with limited user-centric features and are predominantly available only in English or Hindi. As a result, they fail to cater to the linguistic diversity of India, where citizens communicate in numerous regional languages such as Tamil, Telugu, Bengali, Marathi, Gujarati, Punjabi, Kannada, Malayalam, Odia, Assamese, and many others. Furthermore, many platforms require users to manually categorize complaints, upload documents, and understand departmental structures, which can be confusing for individuals with low digital literacy.

India's linguistic diversity, with 22 constitutionally recognised languages and hundreds of regional dialects, presents a significant accessibility challenge for conventional grievance systems. A farmer in rural Rajasthan wishing to report a damaged irrigation canal, a fisherman in Kerala seeking action on polluted water bodies, or a villager in Assam complaining about an unsafe road may neither be comfortable in English nor sufficiently literate to type a structured complaint online. For such citizens, existing grievance portals become practically inaccessible despite being technically available.

Another major issue is the lack of intelligent automation in traditional complaint management systems. Most portals do not utilize technologies such as Natural Language Processing (NLP), machine learning, voice recognition, sentiment analysis, or automated routing. Consequently, complaints are often delayed, misclassified, forwarded to incorrect departments, or left unresolved for extended periods. Urgent complaints relating to public safety, health hazards, or infrastructure breakdowns may not receive priority treatment, leading to avoidable inconvenience and risks for citizens.

The digital divide further amplifies this problem. Limited internet access, low smartphone penetration in some rural areas, poor awareness of online grievance systems, and lack of trust in digital governance platforms reduce citizen participation. Many people continue to believe that filing complaints is ineffective because of delayed responses, lack of transparency, and absence of real-time tracking mechanisms.

Therefore, there is a pressing need for an inclusive, multilingual, AI-powered grievance redressal platform that simplifies complaint registration, enables voice-based and image-based interaction, automatically understands complaint content in multiple Indian languages, routes issues to the relevant department, prioritises urgent matters, and provides transparent tracking updates to users. Such a system can bridge the gap between citizens and governance, promote digital inclusion, and significantly strengthen participatory democracy in India.

## 1.2 Identified Problem

BhashaFlow addresses five distinct, interrelated challenges in the current grievance redressal ecosystem:

### Challenge 1 — Language Barrier and Accessibility Exclusion

Existing grievance portals are inaccessible to non-English-speaking and non-literate citizens. Most currently available complaint management systems are designed primarily for users who can read, write, and navigate digital platforms in English or Hindi. This creates a serious barrier for citizens who communicate in regional languages or have limited literacy levels. A large section of the rural and economically weaker population is therefore unable to effectively register complaints or understand the complaint submission process. The exclusion is not merely inconvenient — it is a systemic failure of digital governance to reach those who most need governmental support.

BhashaFlow's solution: Support for multiple input modes in Indian languages — citizens can speak their complaint in their native language, and the system automatically translates and processes it through speech-to-text and translation services (Sarvam API).

### Challenge 2 — Absence of Intelligent Routing and Categorization

Complaints are either manually categorized or placed in a single queue regardless of urgency. In many traditional systems, complaints are manually sorted by staff members without proper classification. As a result, urgent issues such as water shortages, electricity failures, road accidents, or sanitation hazards may receive the same priority as routine complaints. This leads to delays, inefficient handling, and poor resource allocation across departments.

BhashaFlow's solution: AI-powered automatic classification using Google Gemini LLM to analyze complaint content, extract key information, assign urgency scores, and route to the correct government portal or department with structured metadata.

### Challenge 3 — Opaque Resolution Process

Citizens receive little to no feedback after submitting a complaint — the system functions as a black box. Once a complaint is submitted, many users do not receive regular updates regarding its status, progress, or expected resolution timeline. There is often no clear communication on whether the complaint has been assigned, reviewed, or resolved. This lack of transparency reduces public trust and discourages citizens from using grievance platforms in the future.

BhashaFlow's solution: An AI verification step before final submission that shows citizens their complaint summary in their own language, allowing them to correct misunderstandings. A personalized citizen dashboard displays complaint history, real-time status updates, assigned portal information, and expected SLA timelines.

### Challenge 4 — Single-Modal Input Limitations

Multi-modal input — including voice recording and images of handwritten complaints or photographic evidence — is unsupported in most public grievance systems. Most grievance portals only allow typed text submissions through forms, which excludes users who are not comfortable typing or do not possess advanced digital skills. Citizens may prefer speaking their complaint in their native language or uploading a handwritten application or supporting images, but such input methods are generally unavailable.

BhashaFlow's solution: A unified, multi-modal complaint intake system supporting:
- **Text input** in any Indian language
- **Voice/audio input** with automatic speech-to-text conversion
- **Image upload** with OCR for handwritten letters, supporting documentation, and photographic evidence
- **Optional supporting proof** attachments to strengthen complaint credibility

### Challenge 5 — Lack of Administrative Analytics and Insights

Administrators lack analytical dashboards to prioritize critical complaints or track departmental performance. Without proper analytics, decision-making becomes reactive rather than proactive, reducing the government's ability to monitor service quality and improve grievance resolution systems systematically.

BhashaFlow's solution: A secured admin dashboard with:
- Real-time grievance filtering and search capabilities
- AI-powered insights dashboard showing complaint trends, priority clusters, and urgent cases
- Assignment and status update workflows
- Performance metrics and departmental analytics
- Follow-up email automation for resolution tracking

## 1.3 Proposed Solution — BhashaFlow

**BhashaFlow: Multilingual GenAI for Citizen Social Grievances**

BhashaFlow is a full-stack, AI-powered public grievance redressal web application that allows citizens to submit complaints in any Indian language using text, voice, or image (including handwritten letters and supporting documentation). The system employs Google's Gemini large language model and Sarvam's translation and speech services to automatically translate, summarize, categorize, and assign priority scores to each grievance before routing it to the correct government department or portal.

The citizen workflow is designed for maximum accessibility and transparency:
1. **Describe** — Submit grievance via text, voice, or image in their preferred Indian language
2. **Verify** — AI-generated summary and categorization are presented to the citizen for review and correction
3. **Add Details** — Optionally provide supporting documentation or evidence
4. **Review** — Final confirmation before submission
5. **Receive Guidance** — Immediate actionable feedback including the correct government portal, helpline number, and expected SLA timeline

Citizens can track their complaints on a personalized dashboard with real-time status updates.

The administrative workflow provides officials with:
- A secured grievance management panel accessible only to authorized government users
- Advanced filtering, search, and categorization of complaints
- Real-time priority indicators and urgency flags
- Batch assignment capabilities and status update workflows
- AI-powered analytics showing complaint patterns, critical issues, and departmental performance
- Automated follow-up email systems for resolution tracking

## 1.4 Key Features

- **Multilingual support** across Indian languages (Tamil, Telugu, Bengali, Marathi, Gujarati, Punjabi, Kannada, Malayalam, Odia, Assamese, and others)
- **Multi-modal input**: text, voice/audio, OCR from images, and supporting documentation
- **AI-powered analysis** using Google Gemini for intelligent categorization and summarization
- **Automatic translation** via Sarvam API between Indian languages and English
- **Smart routing** to correct government departments and portals
- **Priority scoring** for urgent civic issues
- **Citizen authentication** via Google OAuth and email/password
- **Forgot-password flow** with secure email reset tokens
- **AI verification step** before final submission for transparency
- **Citizen dashboard** with grievance history, real-time status, and portal guidance
- **Admin dashboard** for filtering, assignment, status updates, and analytics
- **PDF summary generation** for grievance records
- **Automated follow-up** emails for resolution tracking
- **Service Level Agreement (SLA) tracking** for resolution timelines
- **Complaint prioritization** for urgent public safety and health issues

## 1.5 Problem Scope and Boundaries

BhashaFlow is scoped to municipal and civic grievances — issues handled by local government bodies, municipal corporations, and state departments. The system does not address:
- Judicial complaints or legal matters
- Parliamentary petitions
- Private-sector consumer disputes
- Police complaints (criminal matters)

BhashaFlow operates in an Indian governance context and currently supports department categories covering the most common civic complaint types including water supply, electricity, roads and infrastructure, sanitation, waste management, public transportation, healthcare, law and order, and welfare services.

### Technical Boundaries:
- Requires an active internet connection for AI-powered analysis (Google Gemini and Sarvam APIs)
- Designed for web browser access via React SPA
- Voice input supported on Chromium-based browsers (Chrome, Edge) via Web Speech API
- OCR functionality powered by EasyOCR with support for Indian language character recognition
- Multi-language translation and speech services provided by Sarvam API
- Backend deployed on cloud services (Render) with MongoDB Atlas for data persistence
- Production frontend hosted on Vercel for global accessibility and performance

### Data Privacy and Security:
- All personal information (email, phone number, identity documents) encrypted in transit and at rest
- Google OAuth integration for secure authentication without storing passwords
- JWT-based session management for citizen and admin access
- Compliant with Data Protection principles for handling citizen grievances
- Secure API communication between frontend, backend, and AI services
- Admin access restricted to authorized government users only

## 1.6 Expected Outcomes and Impact

Upon successful implementation and deployment, BhashaFlow is expected to:

1. **Increase citizen participation** by removing language and literacy barriers, enabling millions of non-English speakers to file complaints through voice and image inputs
2. **Reduce complaint resolution time** through intelligent routing, eliminating manual categorization delays
3. **Improve departmental accountability** with transparent status tracking and real-time analytics
4. **Enhance government efficiency** by directing resources to high-priority urgent complaints
5. **Strengthen participatory democracy** by giving every citizen, regardless of language proficiency or digital literacy, a voice in civic governance
6. **Promote digital inclusion** by demonstrating inclusive design principles for government technology
7. **Generate actionable insights** through analytics dashboards that help administrators identify systemic issues and trends
8. **Build citizen trust** through transparency, multilingual support, and responsive grievance handling

---

**Document Status:** Problem Statement for BhashaFlow - NIIT University B.Tech CSE Capstone Project  
**Last Updated:** April 2026
