import React from 'react';
import { FeatureChatWidget } from './FeatureChatWidget';
import { Sparkles, FileText, Target, ShieldCheck, ArrowRight, UploadCloud, BrainCircuit, ListChecks, TrendingUp, Calculator, FlaskConical, BookOpen, Landmark, Code2, MoreHorizontal } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const subjects = [
  { icon: Calculator, name: 'Mathematics', note: 'Practice problems & concepts', color: 'blue' },
  { icon: FlaskConical, name: 'Science', note: 'Explore and learn', color: 'green' },
  { icon: BookOpen, name: 'English', note: 'Reading & comprehension', color: 'violet' },
  { icon: Landmark, name: 'History', note: 'Key events & facts', color: 'orange' },
  { icon: Code2, name: 'Computer Science', note: 'Programming & tech', color: 'cyan' },
  { icon: MoreHorizontal, name: 'And More', note: 'Many subjects available', color: 'pink' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="studypdf-landing">
      <section className="sp-hero">
        <div className="sp-hero-copy">
          <div className="sp-eyebrow"><Sparkles size={15} /> AI-powered learning</div>
          <h1>Have perfect knowledge with <span>studypdf.duckdns.org</span></h1>
          <p className="sp-lead">Upload your study material, get AI-generated questions, practice with instant feedback and build your confidence.</p>
          <div className="sp-actions">
            <button onClick={onGetStarted} className="sp-button-primary">Start Learning <ArrowRight size={17} /></button>
            <button onClick={onGetStarted} className="sp-button-secondary">Explore how it works</button>
          </div>
          <p className="sp-free-note"><ShieldCheck size={16} /> Free to start · No credit card required</p>
        </div>
        <div className="sp-hero-art" aria-label="StudyPDF PDF learning workflow">
          <div className="sp-paper sp-paper-back"><FileText size={30} /></div>
          <div className="sp-pdf-card"><span className="sp-pdf-label">PDF</span><FileText size={72} strokeWidth={1.35} /></div>
          <div className="sp-workflow">
            <div><BrainCircuit size={19} /><span>Generate questions</span></div>
            <div><ListChecks size={19} /><span>Take quiz</span></div>
            <div><TrendingUp size={19} /><span>Track progress</span></div>
          </div>
        </div>
      </section>

      <section className="sp-benefits" aria-label="StudyPDF benefits">
        <div><span className="sp-benefit-icon"><Sparkles /></span><div><strong>AI-generated questions</strong><p>From your PDFs, instantly</p></div></div>
        <div><span className="sp-benefit-icon"><Target /></span><div><strong>Practice & improve</strong><p>Get helpful explanations</p></div></div>
        <div><span className="sp-benefit-icon"><TrendingUp /></span><div><strong>Track your progress</strong><p>See your performance</p></div></div>
        <div><span className="sp-benefit-icon"><ShieldCheck /></span><div><strong>Free to get started</strong><p>No credit card required</p></div></div>
      </section>

      <section className="sp-how">
        <div className="sp-section-heading"><h2>How It Works</h2><p>Get started in 3 simple steps and take your learning to the next level.</p></div>
        <div className="sp-steps">
          <article><span className="sp-step-icon blue"><UploadCloud /></span><b><i>1</i> Upload PDF</b><p>Add your study material in PDF format.</p></article>
          <span className="sp-step-arrow">→</span>
          <article><span className="sp-step-icon violet"><BrainCircuit /></span><b><i>2</i> Get Questions</b><p>StudyPDF analyses your content and creates relevant questions.</p></article>
          <span className="sp-step-arrow">→</span>
          <article><span className="sp-step-icon green"><ListChecks /></span><b><i>3</i> Take Quiz & Review</b><p>Answer questions, get feedback and review your results.</p></article>
        </div>
      </section>

      <section className="sp-subjects">
        <div className="sp-section-heading"><h2>Popular Subjects</h2><p>Study materials for a wide range of subjects and exams.</p></div>
        <div className="sp-subject-grid">
          {subjects.map(({ icon: Icon, name, note, color }) => <article className="sp-subject-card" key={name}><span className={`sp-subject-icon ${color}`}><Icon /></span><strong>{name}</strong><p>{note}</p></article>)}
        </div>
      </section>

      <section className="sp-cta">
        <div className="sp-cta-mark"><BookOpen size={34} /></div>
        <div><h2>Ready to improve your knowledge?</h2><p>Learn smarter with your own study material and practice tests.</p></div>
        <button onClick={onGetStarted} className="sp-button-primary">Get Started Free <ArrowRight size={17} /></button>
      </section>
      <FeatureChatWidget />
    </div>
  );
};
