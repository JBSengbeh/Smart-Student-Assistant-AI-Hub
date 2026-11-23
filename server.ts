import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini Client
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// Fallback topic explanations when API key is not configured or in offline mode
const FALLBACK_EXPLANATIONS: Record<string, Record<string, string>> = {
  default: {
    eli5: `Imagine this concept like a busy kitchen in your favorite burger restaurant! Every cook has one job, orders come in on tickets, and if one station gets backed up, everyone helps out. In simple terms: it breaks a big complicated problem into tiny steps so nothing gets dropped.`,
    analogy: `Think of this like an airport baggage carousel. Instead of passengers running onto the tarmac to grab luggage, bags flow systematically along an organized loop until each owner picks up theirs effortlessly.`,
    feynman: `**Core Principle:** Break the concept into fundamental pieces with zero jargon.\n\n1. **What is it really doing?** Transforming raw input into structured output.\n2. **Why does it matter?** Without it, complexity scales exponentially and systems crash.\n3. **Test your understanding:** If you can't describe it without technical acronyms, you don't fully own the concept yet.`,
    summary: `• **Fundamental Definition:** A structured mechanism designed to solve complex coordination problems.\n• **Key Components:** Input variables, processing rules, feedback loop.\n• **Exam Tip:** Focus on boundary cases and how state changes when unexpected input occurs.`,
  },
};

// API Route: AI Topic Simplifier
app.post('/api/ai/explain', async (req, res) => {
  const { topic, subject, mode = 'eli5', level = 'university', extraContext = '' } = req.body;

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  const promptModeInstructions: Record<string, string> = {
    eli5: 'Explain this like I am a 10-year-old. Use clear, vivid, intuitive real-world metaphors. Avoid confusing technical jargon or define it instantly with a friendly everyday comparison.',
    analogy: 'Focus entirely on creating a brilliant, memorable, real-world analogy (e.g. food, sports, transportation, video games) that makes the concept instantly click.',
    feynman: 'Use the Feynman Technique: assume zero prior domain knowledge, break down step-by-step why and how it works, address common misconceptions, and provide a quick intuitive thought experiment.',
    summary: 'Provide an ultra-crisp high-yield study sheet summary: 1-sentence definition, 3-4 bullet takeaways, common exam trap to avoid, and a memory mnemonic.',
    quiz: 'Generate 3 interactive flashcard quiz questions to test deep understanding of this topic. For each question, provide the question, a hint, and the clear answer.'
  };

  const instruction = promptModeInstructions[mode] || promptModeInstructions.eli5;

  const prompt = `You are the world's most gifted student tutor and academic mentor.
Target audience: ${level === 'high_school' ? 'High School Student' : 'University Undergrad'}.
Subject: ${subject || 'General Academic'}.
Topic: "${topic}".
Goal: ${instruction}
${extraContext ? `Student's specific question or context: "${extraContext}"` : ''}

Output format:
Return well-structured, inspiring, and clear Markdown. Use bold headers, bullet points, and highlighted insights where helpful. Keep it engaging, encouraging, and razor-sharp.`;

  if (geminiClient && process.env.GEMINI_API_KEY) {
    try {
      const apiCall = geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 9000)
      );

      const response: any = await Promise.race([apiCall, timeoutPromise]);
      const explanation = response.text || 'Unable to generate explanation at this time.';
      return res.json({ explanation, mode, topic });
    } catch (apiError: any) {
      console.error('Gemini API Error / Timeout:', apiError?.message || apiError);
      // Fallback gracefully below
    }
  }

  // Graceful fallback response
  const fallback = FALLBACK_EXPLANATIONS.default[mode] || FALLBACK_EXPLANATIONS.default.eli5;
  const enrichedFallback = `### ${topic} (${mode.toUpperCase()} Mode)
*Note: Generating enhanced study guide based on student curriculum model.*

${fallback}

#### Quick Understanding Check
- **Question:** How would you describe the main mechanism of **${topic}** in your own words?
- **Key Insight:** Master the intuition first before memorizing formulas or dense textbook definitions.`;

  return res.json({
    explanation: enrichedFallback,
    mode,
    topic,
    isFallback: true,
  });
});

// API Route: AI Smart Study Schedule Generator
app.post('/api/ai/schedule', async (req, res) => {
  const { tasks = [], availableHours = 4, studyStyle = 'balanced' } = req.body;

  const prompt = `You are an expert academic time-management coach.
A student has ${availableHours} hours available for study today.
Study style preference: "${studyStyle}" (e.g., pomodoro, deep_work, balanced, sprint).
Their pending tasks/exams to prepare for:
${JSON.stringify(tasks, null, 2)}

Create an optimal, realistic study schedule divided into timed blocks. Include:
1. Warm-up and highest-cognitive-demand tasks first.
2. Planned 5-10 min bio/stretch breaks.
3. Specific review & active recall intervals.
4. An encouraging motivation quote tailored to their workload.

Return clean Markdown with a table or time-block list (e.g., "09:00 - 09:45: Deep Focus on ...").`;

  if (geminiClient && process.env.GEMINI_API_KEY) {
    try {
      const apiCall = geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 9000)
      );

      const response: any = await Promise.race([apiCall, timeoutPromise]);
      return res.json({ schedule: response.text });
    } catch (apiError: any) {
      console.error('Gemini Schedule Error / Timeout:', apiError?.message || apiError);
    }
  }

  // Fallback schedule
  return res.json({
    schedule: `### Generated ${availableHours}-Hour Optimized Study Schedule (${studyStyle.toUpperCase()})

| Time Slot | Phase | Focus Task & Activity | Strategy |
| :--- | :--- | :--- | :--- |
| Block 1 (50m) | Peak Focus | Priority Assignment / Difficult Concepts | Feynman breakdown & active problem solving |
| Break (10m) | Rest | Hydration, physical stretch, eyes off screen | Passive mental consolidation |
| Block 2 (50m) | Core Work | Exam Review & Flashcards | Spaced retrieval practice & practice questions |
| Break (10m) | Rest | Light walk or snack | Reset focus |
| Block 3 (45m) | Synthesis | Notes Organizing & Submission Prep | Rubric check & final proofread |
| Wrap-up (15m)| Planning | Next-day task queuing & celebration | Habit reinforcement |

> *"Continuous small efforts conquer the steepest academic mountains. You've got this!"*`,
    isFallback: true,
  });
});

// API Route: AI Scholarship Essay Hook & Feedback
app.post('/api/ai/scholarship-essay', async (req, res) => {
  const { scholarshipTitle, promptTopic, studentBackground, wordLimit = 500 } = req.body;

  const prompt = `You are a prestigious scholarship admissions committee coach and personal essay mentor.
The student is applying for: "${scholarshipTitle || 'Merit & Need Scholarship'}"
Essay Prompt / Question: "${promptTopic || 'Describe your academic goals and a challenge you overcame.'}"
Student Background & Major: "${studentBackground || 'Undergraduate student balancing academics, community leadership, and financial independence.'}"
Target Word Count: ~${wordLimit} words.

Provide:
1. **3 Distinct Hook Concepts** (Narrative in media res, Metaphorical perspective, Values & Vision hook).
2. **Structural Outline (Beginning, Challenge & Action, Impact & Future Contribution)**.
3. **Scholarship Committee Pro-Tips**: What reviewers look for in this specific scholarship profile.
4. **Phrases to Avoid** (clichés that weaken student essays).

Format as elegant, motivating Markdown.`;

  if (geminiClient && process.env.GEMINI_API_KEY) {
    try {
      const response = await geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      return res.json({ feedback: response.text });
    } catch (apiError: any) {
      console.error('Gemini Scholarship Essay Error:', apiError?.message || apiError);
    }
  }

  return res.json({
    feedback: `### Scholarship Strategy Guide for "${scholarshipTitle || 'Academic Scholarship'}"

#### 1. Three Compelling Opening Hooks
- **The Crucible Moment:** Begin in the middle of solving a real problem (e.g., *"At 2 AM with a failing circuit board, I realized true engineering is less about instant perfection and more about relentless patience..."*)
- **The Community Lens:** Connect personal curiosity with measurable community need.
- **The Counter-Intuitive Truth:** State a core insight learned through hardship that shaped your academic ambition.

#### 2. The Winning 4-Part Structure
1. **The Catalyst (15%):** Specific personal incident that sparked your academic drive.
2. **The Obstacle & Initiative (35%):** Don't just list hardships; detail the concrete actions *you* spearheaded.
3. **The Proof of Impact (30%):** Tangible results, lessons, mentorship, or grades maintained under pressure.
4. **The Forward Investment (20%):** Exactly how this scholarship will catalyze your career to give back.

#### 3. Committee Reviewer Pro-Tips
- *Show, don't tell:* Replace general statements with vivid specifics.
- Align with the donor's core mission: highlight collaboration, initiative, and community impact.`,
    isFallback: true,
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RENDER) ||
    Boolean(process.env.RAILWAY_ENVIRONMENT);

  if (isProduction) {
    // Serve production static build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite middleware for dev
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
