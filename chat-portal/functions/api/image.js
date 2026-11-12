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
  try{
    const result=await env.AI.run("@cf/black-forest-labs/flux-1-schnell",{prompt:body.prompt.trim(),steps:4});
    if(!result||typeof result.image!=="string"||!result.image)return json({error:"Image model ने चित्र परत दिले नाही. पुन्हा प्रयत्न करा."},502);
    return json({dataURI:"data:image/jpeg;charset=utf-8;base64,"+result.image},200);
  }catch(error){
    console.error("SGGVISION image generation failed:",error?.message||"unknown error");
    return json({error:"चित्र तयार करताना AI सेवा अयशस्वी झाली. थोड्या वेळाने पुन्हा प्रयत्न करा."},502);
  }
}
function json(data,status){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
