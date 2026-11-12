import { consumeUsage, releaseUsage } from "./_lib/usage.js";
const MAX_PROMPT=1800;
export async function onRequestPost({request,env}){
  const origin=request.headers.get("Origin");
  const host=new URL(request.url).host;
  if(origin){try{if(new URL(origin).host!==host)return json({error:"Origin not allowed."},403)}catch{return json({error:"Invalid origin."},403)}}
  if(!(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))return json({error:"Content-Type must be application/json."},415);
  const length=Number(request.headers.get("Content-Length")||0);
  if(length>8192)return json({error:"Prompt request is too large."},413);
  let body;try{body=await request.json()}catch{return json({error:"Invalid JSON."},400)}
  if(!body||typeof body.prompt!=="string"||!body.prompt.trim()||body.prompt.length>MAX_PROMPT)return json({error:"चित्रासाठी 1 ते 1800 अक्षरांचा स्पष्ट prompt लिहा."},400);
  if(!env.AI||typeof env.AI.run!=="function")return json({error:"Cloudflare Workers AI binding उपलब्ध नाही."},503);
  const usage=await consumeUsage(request,env).catch(()=>({ok:false,status:503,error:"वापर मर्यादा तपासता आली नाही."}));
  if(!usage.ok)return json({error:usage.error,remaining:0},usage.status,usage.setCookie);
  try{
    // Convert Marathi, Hindi, Romanized Marathi and English requests into a clear
    // English visual brief before sending it to the image model. Keep the subject exact.
    let visualPrompt = body.prompt.trim();
    try {
      const brief = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
        messages: [
          { role: "system", content: "Rewrite the user's image request as a concise, detailed English prompt for a photorealistic image model. Understand Marathi, Hindi, Romanized Marathi and English. Preserve the exact named person, historical event, place and action. For Chhatrapati Shivaji Maharaj, depict the historical Maratha king as a human ruler in historically inspired Maratha attire, NOT Lord Shiva or any deity. Do not add unrelated religious figures, symbols or subjects. Do not include any text, letters, captions, watermarks or logos in the image. Return only the image prompt." },
          { role: "user", content: body.prompt.trim() }
        ],
        max_tokens: 350
      });
      const briefText = typeof brief?.response === "string" ? brief.response :
        typeof brief?.choices?.[0]?.message?.content === "string" ? brief.choices[0].message.content : "";
      if (briefText.trim()) visualPrompt = briefText.trim();
    } catch (error) {
      console.error("Image prompt enhancement unavailable:", error?.message || "unknown error");
    }
    visualPrompt += " Create only the requested scene. No text, typography, captions, letters, logos or watermarks.";
    const result=await env.AI.run("@cf/black-forest-labs/flux-1-schnell",{prompt:visualPrompt,steps:4});
    if(!result||typeof result.image!=="string"||!result.image){await releaseUsage(usage,env).catch(()=>{});return json({error:"Image model ने चित्र परत दिले नाही. पुन्हा प्रयत्न करा."},502,usage.setCookie)}
    return json({dataURI:"data:image/jpeg;charset=utf-8;base64,"+result.image,remaining:usage.remaining??null},200,usage.setCookie);
  }catch(error){
    console.error("SGGVISION image generation failed:",error?.message||"unknown error");
    await releaseUsage(usage,env).catch(()=>{});
    return json({error:"चित्र तयार करताना AI सेवा अयशस्वी झाली. थोड्या वेळाने पुन्हा प्रयत्न करा."},502,usage.setCookie);
  }
}
function json(data,status,cookie){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...(cookie?{"Set-Cookie":cookie}:{})}})}
