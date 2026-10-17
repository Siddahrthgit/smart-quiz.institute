import React, { useEffect, useRef, useState } from 'react';
import { FileUp, FileText, Repeat2, Sparkles, BarChart3, BookOpen, Search, Library, ArrowRight } from 'lucide-react';
import { ownerHeaders } from '../lib/ownerAuth';

interface CoreQuestion { question:string; options:string[]; correctAnswer:string; topic?:string; }
interface Suggestion { topic:string; personal:number; branchWide:number; }
type Phase='upload'|'analyzing'|'menu'|'exam'|'submitting';

export function UploadExamPage({onFinished,reattempt}:{onFinished:(attemptId:string)=>void;reattempt?:{docId:string;branch:string;subject:string;parentAttemptId:string;questions:CoreQuestion[]}|null}) {
  const [phase,setPhase]=useState<Phase>(reattempt?'exam':'upload');
  const [error,setError]=useState('');
  const [docId,setDocId]=useState(reattempt?.docId||'');
  const [branch,setBranch]=useState(reattempt?.branch||'');
  const [subject,setSubject]=useState(reattempt?.subject||'');
  const [questions,setQuestions]=useState<CoreQuestion[]>(reattempt?.questions||[]);
  const [answers,setAnswers]=useState<Record<number,string>>({});
  const [suggestions,setSuggestions]=useState<Suggestion[]>([]);
  const [selectedBranch,setSelectedBranch]=useState<string>(()=>localStorage.getItem('studypdf_branch')||'');
  const [notes,setNotes]=useState<any|null>(null);
  const [repeated,setRepeated]=useState<any|null>(null);
  const [generated,setGenerated]=useState<CoreQuestion[]|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{fetch('/api/core/suggestions',{headers:ownerHeaders()}).then(r=>r.json()).then(d=>setSuggestions(d.suggestions||[])).catch(()=>{});},[]);

  async function action(action:'notes'|'repeated'|'generate'){
    setError('');
    const activeDocId = docId || localStorage.getItem('studypdf_doc_id') || '';
    if (!activeDocId) {
      setError('Please upload a PDF first. The study material ID is missing.');
      return;
    }
    const res=await fetch('/api/core/material/action',{method:'POST',headers:{...ownerHeaders(),'Content-Type':'application/json'},body:JSON.stringify({docId:activeDocId,action,count:20})});
    const data=await res.json();
    if(!res.ok) throw new Error(data.message||data.error||'Action failed');
    if(action==='notes') setNotes(data.notes);
    if(action==='repeated') setRepeated(data.repeated);
    if(action==='generate') setGenerated(data.questions);
  }

  async function handleFile(file:File){
    setError('');
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please choose a PDF file.');
      setPhase('upload');
      return;
    }
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError('This PDF is larger than 50 MB. Please choose a smaller PDF.');
      setPhase('upload');
      return;
    }
    setPhase('analyzing');
    try{
      if(!selectedBranch){setError('Please select your branch first.');setPhase('upload');return;}
      localStorage.setItem('studypdf_branch',selectedBranch);
      const fd=new FormData(); fd.append('file',file); fd.append('branch',selectedBranch);
      const res=await fetch('/api/core/upload-and-analyze',{method:'POST',headers:ownerHeaders(),body:fd});
      const data=await res.json(); if(!res.ok) throw new Error(data.message||data.error||'Failed to analyze PDF');
      const builtQuestions = Array.isArray(data.questions) ? data.questions : [];
      if (!builtQuestions.length) {
        throw new Error('PDF text was extracted, but no usable questions could be built. Try a text-based PDF with readable study content.');
      }
      setDocId(data.docId);
      localStorage.setItem('studypdf_doc_id', data.docId);
      setBranch(data.branch);setSubject(data.subject);setQuestions(builtQuestions);setAnswers({});setPhase('menu');
    }catch(e:any){setError(e.message||'Something went wrong');setPhase('upload');}
  }
  async function submit(){
    setPhase('submitting');
    try{
      const res=await fetch('/api/core/exam/submit',{method:'POST',headers:{...ownerHeaders(),'Content-Type':'application/json'},body:JSON.stringify({docId,branch,subject,questions:questions.map((q,i)=>({...q,userAnswer:answers[i]||''}))})});
      const data=await res.json();if(!res.ok)throw new Error(data.message||data.error||'Failed to submit exam');onFinished(data.attemptId);
    }catch(e:any){setError(e.message||'Failed to submit exam');setPhase('exam');}
  }
  async function retryTopic(topic:string){
    setError('');setPhase('analyzing');
    try{
      const libraryTopic = /^(NEC Civil|Loksewa Civil|RCC|Soil & Foundation|Hydraulics|Hydraulics & Water Resources|Transportation & Surveying)$/i.test(topic);
      const res = libraryTopic
        ? await fetch(`/api/core/question-library?branch=${encodeURIComponent(branch||selectedBranch)}&category=${encodeURIComponent(topic)}`,{headers:ownerHeaders()})
        : await fetch('/api/core/exam/from-topic',{method:'POST',headers:{...ownerHeaders(),'Content-Type':'application/json'},body:JSON.stringify({topic})});
      const d=await res.json();
      if(!res.ok)throw new Error(d.message||d.error||'Failed');
      const qs=Array.isArray(d.questions)?d.questions:[];
      if(!qs.length){
        throw new Error(libraryTopic
          ? `The ${topic} library is currently empty. Add verified questions before publishing this category.`
          : `There is not enough readable material to create practice questions for "${topic}".`);
      }
      setDocId(d.docId||(`library_${Date.now()}`));
      setBranch(d.branch||branch||selectedBranch||'');
      setSubject(d.subject||topic);
      setQuestions(qs);
      setAnswers({});
      setPhase('exam');
    }catch(e:any){setError(e.message||'Failed');setPhase('menu');}
  }
  async function performance(){
    setError('');
    try{const r=await fetch('/api/core/attempts/latest',{headers:ownerHeaders()});const d=await r.json();if(!r.ok)throw new Error(d.message||d.error||'Failed');if(!d.hasAttempt)throw new Error('Complete an exam first to see Performance Check.');onFinished(d.attemptId);}
    catch(e:any){setError(e.message||'Failed');}
  }

  if(phase==='upload') return <div className="min-h-screen bg-white text-slate-900"><div className="max-w-2xl mx-auto px-4 py-12">
    <div className="text-center mb-8"><h1 className="text-3xl font-bold">StudyPDF</h1><p className="text-slate-600 mt-2">Start by selecting your branch, then upload your study material.</p><p className="text-xs text-slate-500 mt-2">Have perfect knowledge with studypdf.duckdns.org</p></div>
    <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-5"><label className="text-sm font-semibold block mb-2">What are you studying?</label><select value={selectedBranch} onChange={e=>setSelectedBranch(e.target.value)} className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500"><option value="">Select your branch</option><option>Civil Engineering</option><option>Electrical Engineering</option><option>Mechanical Engineering</option><option>Computer Engineering</option><option>Electronics & Communication Engineering</option><option>Architecture</option><option>Management</option><option>Science</option><option>Other</option></select></div>
    <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-12 text-center cursor-pointer transition-colors">
      <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center"><FileUp className="w-8 h-8 text-indigo-600"/></div>
      <p className="font-semibold">Upload your PDF</p><p className="text-sm text-slate-500 mt-1">Tap to choose a PDF</p><p className="text-xs text-slate-400 mt-2">Maximum file size: 50 MB</p>
    </div>
    <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
    {error&&<p className="text-red-600 text-sm mt-4">{error}</p>}
    <SuggestionsList suggestions={suggestions} onRetry={retryTopic}/>
    <QuestionLibrary branch={selectedBranch} onPractice={retryTopic}/>
  </div></div>;

  if(phase==='analyzing') return <div className="min-h-screen bg-white flex items-center justify-center text-slate-700">
    <div className="text-center px-6">
      <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center animate-pulse"><Sparkles className="w-7 h-7 text-indigo-600"/></div>
      <h2 className="text-xl font-semibold">Building your exam…</h2>
      <p className="text-sm text-slate-500 mt-2">Analyzing your PDF and preparing up to 20 questions.</p>
      <p className="text-xs text-slate-400 mt-3">This can take a little time. Please keep this page open.</p>
    </div>
  </div>;

  if(phase==='menu') return <div className="min-h-screen bg-white text-slate-900"><div className="max-w-3xl mx-auto px-4 py-10">
    <div className="mb-6"><p className="text-xs text-slate-500">UPLOADED MATERIAL</p><h2 className="text-2xl font-bold mt-1">{subject||'Your PDF'}</h2><p className="text-sm text-slate-500 mt-1">{branch}</p></div>
    <div className="grid sm:grid-cols-2 gap-3">
      <Action icon={<BookOpen/>} title="Take Exam" onClick={()=>setPhase('exam')} primary/>
      <Action icon={<FileText/>} title="Study Notes" onClick={()=>action('notes').catch(e=>setError(e.message))}/>
      <Action icon={<Repeat2/>} title="Search Most Repeated Questions" onClick={()=>action('repeated').catch(e=>setError(e.message))}/>
      <Action icon={<Sparkles/>} title="Generate Questions" onClick={()=>action('generate').catch(e=>setError(e.message))}/>
      <Action icon={<BarChart3/>} title="Performance Check — Retry Wrong Questions" onClick={performance}/>
    </div>
    {error&&<p className="text-red-600 text-sm mt-4">{error}</p>}
    {notes&&<Result title="Study Notes"><div className="space-y-3">{(notes.keyPoints||[]).map((n:string,i:number)=><div key={i} className="rounded-lg bg-white border border-slate-200 p-3 text-sm leading-6">{n}</div>)}</div></Result>}
    {repeated&&<Result title="Most Repeated / Emphasized in This PDF"><p className="text-xs text-slate-500 mb-3">{repeated.disclaimer}</p><div className="space-y-2">{(repeated.repeatedConcepts||[]).map((x:any,i:number)=><div key={i} className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm"><span>{x.phrase}</span><span className="text-xs text-slate-500">{x.count}×</span></div>)}</div></Result>}
    {generated&&<Result title="Generated Questions"><div className="space-y-3">{generated.length ? generated.map((q,i)=><div key={i} className="border-t pt-3"><b>Q{i+1}. {q.question}</b><div className="text-sm mt-1">{q.options.join(' • ')}</div></div>) : <p className="text-sm text-slate-500">No questions could be generated from this material.</p>}<button className="mt-4 rounded-lg bg-indigo-600 text-white px-4 py-2" onClick={()=>{setQuestions(generated);setAnswers({});setPhase('exam')}}>Start Exam</button></div></Result>}
    <div className="mt-8"><SuggestionsList suggestions={suggestions} onRetry={retryTopic}/><QuestionLibrary branch={branch} onPractice={retryTopic}/></div>
  </div></div>;

  const answered=Object.keys(answers).length;
  return <div className="min-h-screen bg-white text-slate-900 pb-24"><div className="sticky top-0 bg-white/95 border-b px-4 py-3 z-10"><div className="max-w-3xl mx-auto text-sm text-slate-600">{subject} · {answered}/{questions.length} answered</div></div>
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">{questions.map((q,i)=><div key={i}><p className="text-xs text-slate-500 mb-1">Question {i+1}</p><h2 className="font-semibold mb-3">{q.question}</h2><div className="space-y-2">{q.options.map(o=><button key={o} onClick={()=>setAnswers(a=>({...a,[i]:o}))} className={`w-full text-left p-3 rounded-lg border ${answers[i]===o?'border-indigo-500 bg-indigo-50':'border-slate-200 bg-slate-50'}`}>{o}</button>)}</div></div>)}{error&&<p className="text-red-600 text-sm">{error}</p>}</div>
    <div className="fixed bottom-0 inset-x-0 bg-white border-t p-3"><button disabled={phase==='submitting'} onClick={()=>{const missing=questions.findIndex((_,i)=>!answers[i]);if(missing>=0){setError(`Question ${missing+1} is unanswered`);return;}submit()}} className="max-w-3xl mx-auto block w-full rounded-lg bg-emerald-600 text-white font-semibold py-3">{phase==='submitting'?'Submitting…':`Finish Exam (${answered}/${questions.length})`}</button></div>
  </div>;
}

function Action({icon,title,onClick,primary=false}:{icon:React.ReactNode;title:string;onClick:()=>void;primary?:boolean}){return <button onClick={onClick} className={`rounded-xl border p-5 flex items-center gap-4 text-left transition hover:-translate-y-0.5 ${primary?'bg-indigo-600 text-white border-indigo-600':'bg-white border-slate-200 hover:border-indigo-300'}`}><span className={`w-11 h-11 rounded-xl flex items-center justify-center ${primary?'bg-white/15':'bg-indigo-50 text-indigo-600'}`}>{icon}</span><span className="font-semibold">{title}</span></button>}
function Result({title,children}:{title:string;children:React.ReactNode}){return <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-semibold mb-3">{title}</h3>{children}</div>}
function SuggestionsList({suggestions,onRetry}:{suggestions:Suggestion[];onRetry:(topic:string)=>void}){if(!suggestions.length)return null;return <div className="mt-10"><h3 className="text-sm font-semibold mb-3">Weak Topics</h3><div className="flex flex-wrap gap-2">{suggestions.map(s=><button key={s.topic} onClick={()=>onRetry(s.topic)} className="px-3 py-2 rounded-full border border-slate-200 text-sm hover:border-indigo-400">{s.topic}<ArrowRight className="inline w-3.5 h-3.5 ml-1"/></button>)}</div></div>}
function QuestionLibrary({branch,onPractice}:{branch:string;onPractice:(topic:string)=>void}){const items=branch.toLowerCase().includes('civil')?[['NEC Civil Questions','NEC License Exam practice'],['Loksewa Civil Questions','Loksewa practice questions'],['RCC Questions','Reinforced concrete practice'],['Soil & Foundation','Geotechnical practice'],['Hydraulics & Water Resources','Hydraulics practice'],['Transportation & Surveying','Road, transport and surveying practice']]:[['General Question Library',`${branch||'Your branch'} practice questions`],['Previous Questions','Mixed exam practice'],['Topic Practice','Practice by subject and topic']];return <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-2 mb-1"><Library className="w-5 h-5 text-indigo-600"/><h3 className="font-semibold">Question Library</h3></div><p className="text-xs text-slate-500 mb-4">Practice different questions without removing your Weak Topics.</p><div className="grid sm:grid-cols-2 gap-3">{items.map(([title,sub])=><button key={title} onClick={()=>onPractice(title.replace(/ Questions$/,''))} className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-400 transition"><div className="font-semibold text-sm">{title}</div><div className="text-xs text-slate-500 mt-1">{sub}</div><div className="text-xs text-indigo-600 font-medium mt-3">Practice Questions <ArrowRight className="inline w-3.5 h-3.5"/></div></button>)}</div></div>}
