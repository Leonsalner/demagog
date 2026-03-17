import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Manual .env.local parse
const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const KEY = (process.env.GEMINI_API_KEY || "").trim();
if (!KEY) { console.error("No GEMINI_API_KEY"); process.exit(1); }
console.log("Key loaded: " + KEY.slice(0,8) + "...");

const SYS = "Si jazykový korektor. Oprav IBA: a→š, e→ť, H→ň, G→Ň, d→Ť. Nemeň nič iné. JSON pole reťazcov.";

const INPUTS = [
  "Na Najvyaaom súde vaak rozhodol senát a eate predtým ho odsúdili.",
  "Vláda schválila zvýaenie minimálnej mzdy, mzda sa zvýai z 580 na 623 eur.",
  "Nebola vaak úplne najvyaaia inflačná miera, preto je výrok zavádzajúci.",
  "Prezidentka neudelila milose odsúdenému podnikateľovi.",
  "Školstvo dostáva menej peHazí ako priemer krajín OECD.",
  "Ministerstvo upozorHuje, že vaetky krajiny si môžu slobodne určie svoju orientáciu.",
  "Strana podporuje posilnenie zodpovednosti a rieaenie problémov ako korupcia.",
  "Premiér zároveH uviedol, že počet víz sa medziročne zvýail.",
  "Bývalý predseda PS v rámci prednáaky pre vysokoakolských atudentov rozprával o skúsenosti.",
  "Rodičia nemôžu rozhodovae o vzdelávaní, ktoré je súčaseou osnov, ale škola musí bye informovaná.",
];

interface GeminiPayload {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

async function call(model: string, texts: string[]): Promise<string[]> {
  const prompt = "Oprav diakritiku v " + texts.length + " textoch:\n\n" + texts.map(function(t,i){return (i+1)+". "+t;}).join("\n");
  console.log("Calling " + model + "...");
  const start = Date.now();
  const r = await fetch(API+"/"+model+":generateContent",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-goog-api-key":KEY},
    body:JSON.stringify({
      contents:[{parts:[{text:prompt}]}],
      systemInstruction:{parts:[{text:SYS}]},
      generationConfig:{temperature:0.05,responseMimeType:"application/json"},
    }),
  });
  console.log(model + " responded in " + (Date.now()-start) + "ms, status=" + r.status);
  if(!r.ok){ const b=await r.text(); throw new Error(model+" "+r.status+": "+b.slice(0,200)); }
  const p = (await r.json()) as GeminiPayload;
  const text = p.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(model + " returned no text content");
  }
  return JSON.parse(text) as string[];
}

async function main(){
  const [lite,flash] = await Promise.all([
    call("gemini-3.1-flash-lite-preview", INPUTS),
    call("gemini-3-flash-preview", INPUTS),
  ]);

  console.log("\n");
  for(let i=0;i<INPUTS.length;i++){
    console.log("--- "+(i+1)+" ---");
    console.log("IN:    "+INPUTS[i]);
    console.log("LITE:  "+lite[i]);
    console.log("FLASH: "+flash[i]);
    console.log(lite[i]===flash[i]?"  >> AGREE":"  >> DIFFER");
    console.log("");
  }
}
main().catch(function(e: unknown){
  console.error(e);
  process.exit(1);
});
