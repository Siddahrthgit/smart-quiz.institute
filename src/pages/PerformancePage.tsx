import React,{useEffect,useState} from 'react';
import {Share2,RotateCcw,Upload,AlertCircle} from 'lucide-react';
import {ownerHeaders} from '../lib/ownerAuth';

export function PerformancePage({attemptId,onReattempt,onUploadNew}:{attemptId:string;onReattempt:(r:any)=>void;onUploadNew:()=>void}){
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[score,setScore]=useState(0),[total,setTotal]=useState(0),[subject,setSubject]=useState(''),[wrong,setWrong]=useState<any[]>([]);
 useEffect(()=>{(async()=>{try{const r=await fetch(`/api/core/attempts/${attemptId}`,{headers:ownerHeaders()});const d=await r.json();if(!r.ok)throw new Error(d.error||'Failed to load performance');setScore(d.score);setTotal(d.total);setSubject(d.subject||'');setWrong(d.wrongQuestions||[]);}catch(e:any){setError(e.message||'Failed')}finally{setLoading(false)}})()},[attemptId]);
 async function retry(){try{const r=await fetch(`/api/core/attempts/${attemptId}/reattempt`,{method:'POST',headers:ownerHeaders()});const d=await r.json();if(!r.ok)throw new Error(d.error||'Failed');onReattempt(d)}catch(e:any){setError(e.message||'Failed')}}
 async function share(){const pct=total?Math.round(score/total*100):0;const text=`I scored ${pct}% (${score}/${total}) on ${subject||'my study material'}.`;if(navigator.share){try{await navigator.share({text})}catch{}}else{await navigator.clipboard.writeText(text);alert('Copied!')}}
 if(loading)return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading Performance Check…</div>;
 const pct=total?Math.round(score/total*100):0;
 return <div className="min-h-screen bg-white text-slate-900"><div className="max-w-3xl mx-auto px-4 py-10">
  <h1 className="text-2xl font-bold">Performance Check</h1><p className="text-sm text-slate-500 mt-1">{subject}</p>
  {error&&<p className="mt-4 text-red-600 flex gap-2 items-center"><AlertCircle size={16}/>{error}</p>}
  <div className="mt-6 rounded-2xl border p-6 text-center"><div className="text-5xl font-bold">{pct}%</div><p className="text-slate-500 mt-2">{score} of {total} correct</p><button onClick={share} className="mt-4 inline-flex gap-2 items-center border rounded-full px-4 py-2 text-sm"><Share2 size={15}/> Share</button></div>
  {wrong.length?<><div className="flex items-center justify-between mt-8 mb-3"><h2 className="text-lg font-semibold">Wrong Questions ({wrong.length})</h2><button onClick={retry} className="inline-flex gap-2 items-center bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm"><RotateCcw size={15}/> Retry Wrong Questions</button></div><div className="space-y-3">{wrong.map((q,i)=><div key={i} className="border rounded-xl p-4 bg-slate-50"><p className="font-medium">{q.question}</p><p className="text-sm text-red-600 mt-2">Your answer: {q.userAnswer||'(none)'}</p><p className="text-sm text-emerald-700">Correct answer: {q.correctAnswer}</p>{q.note&&<p className="text-sm text-slate-600 mt-2 border-t pt-2">{q.note}</p>}</div>)}</div></>:<div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800">No wrong answers in this attempt.</div>}
  <div className="grid sm:grid-cols-2 gap-3 mt-8"><button onClick={onUploadNew} className="border rounded-lg py-3 inline-flex justify-center gap-2"><Upload size={17}/> Upload Another PDF</button><button onClick={retry} disabled={!wrong.length} className="border rounded-lg py-3 inline-flex justify-center gap-2 disabled:opacity-40"><RotateCcw size={17}/> Retry Wrong Questions</button></div>
 </div></div>
}
