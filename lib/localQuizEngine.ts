export interface LocalQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  source?: string;
}

export interface LocalAnalysis {
  subject: string;
  topics: string[];
  notes: string[];
  repeated: { phrase: string; count: number }[];
  questions: LocalQuestion[];
}

const STOP = new Set(['the','and','for','with','that','this','from','are','was','were','which','shall','will','into','than','then','have','has','had','not','but','can','may','its','their','there','where','when','what','how','who','been','being','also','using','used','such','more','less','each','other','these','those','about','between','through','under','over','per','one','two','three','four','five','section','chapter']);

function sentences(text:string){return text.replace(/\\s+/g,' ').split(/(?<=[.!?])\\s+/).map(s=>s.trim()).filter(s=>s.length>=35);}
function words(text:string){return (text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g)||[]).filter(w=>!STOP.has(w));}
function topicFrom(sentence:string){
  const cleaned=sentence.replace(/[^A-Za-z0-9\\s&/-]/g,' ').trim();
  return cleaned.split(/\\s+/).slice(0,6).join(' ') || 'General';
}
function makeFactQuestion(sentence:string,pool:string[],i:number):LocalQuestion|null{
  const m=sentence.match(/^(.{12,80}?)\\s+(?:is|are|means|refers to|consists of|includes|shall be|should be|must be)\\s+(.{8,180})[.!?]?$/i);
  if(!m) return null;
  const answer=m[2].trim().replace(/[.!?]$/,'');
  if(answer.length<4||answer.length>180) return null;
  const distractors=pool.filter(x=>x!==answer).slice(0,3);
  if(distractors.length<3)return null;
  return {id:'local-'+i,question:`According to the uploaded material, ${m[1].trim()}?`,options:[answer,...distractors],correctAnswer:answer,topic:topicFrom(sentence),source:'Uploaded material'};
}

export function analyzeLocalText(text:string, count=10):LocalAnalysis{
  const ss=sentences(text);
  const freq=new Map<string,number>();
  for(const w of words(text))freq.set(w,(freq.get(w)||0)+1);
  const topWords=[...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0]);
  const topics=topWords.slice(0,6).map(x=>x.charAt(0).toUpperCase()+x.slice(1));
  const notes=ss.slice(0,20).map(s=>s.length>260?s.slice(0,257)+'...':s);
  const repeated=[...freq.entries()].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([phrase,count])=>({phrase,count}));
  const answers=ss.map(s=>s.match(/(?:is|are|means|refers to|consists of|includes|shall be|should be|must be)\\s+(.{8,180})[.!?]?$/i)?.[1]?.trim().replace(/[.!?]$/,'')).filter(Boolean) as string[];
  const unique=[...new Set(answers)].filter(x=>x.length>3);
  const questions:LocalQuestion[]=[];
  for(const s of ss){if(questions.length>=count)break; const q=makeFactQuestion(s,unique,questions.length+1);if(q)questions.push(q);}
  return {subject:topics.slice(0,2).join(' & ')||'Uploaded Study Material',topics,notes,repeated,questions};
}

export function generateLocalQuestions(text:string,count=10){return analyzeLocalText(text,count).questions;}
export function generateLocalNotes(text:string){return analyzeLocalText(text,0).notes;}
export function findLocalRepeated(text:string){return analyzeLocalText(text,0).repeated;}
