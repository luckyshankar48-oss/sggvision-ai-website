const ADMIN_EMAIL="luckyshankar48@gmail.com";const enc=new TextEncoder();
function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function sign(v,s){const k=await crypto.subtle.importKey("raw",enc.encode(s),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64url(await crypto.subtle.sign("HMAC",k,enc.encode(v)))}
async function sha(v){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(v)))].map(x=>x.toString(16).padStart(2,"0")).join("")}
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
export async function onRequestPost({request,env}){
 const origin=request.headers.get("Origin");if(origin){try{if(new URL(origin).host!==new URL(request.url).host)return json({error:"Origin not allowed"},403)}catch{return json({error:"Invalid origin"},403)}}
 if(!env.DB||!env.ADMIN_OTP_SECRET||!env.ADMIN_SESSION_SECRET)return json({error:"Admin OTP सेवा configure केलेली नाही."},503);
 let body;try{body=await request.json()}catch{return json({error:"Invalid request"},400)}
 const email=String(body?.email||"").trim().toLowerCase(),code=String(body?.code||"").trim();
 if(email!==ADMIN_EMAIL||!/^[0-9]{6}$/.test(code))return json({error:"ई-मेल किंवा OTP चुकीचा आहे."},400);
 const row=await env.DB.prepare("SELECT otp_hash,expires_at,attempts FROM admin_otp WHERE email=?").bind(ADMIN_EMAIL).first();
 if(!row)return json({error:"OTP उपलब्ध नाही. नवीन OTP मागवा."},400);
 if(row.attempts>=5){await env.DB.prepare("DELETE FROM admin_otp WHERE email=?").bind(ADMIN_EMAIL).run();return json({error:"चुकीचे प्रयत्न जास्त झाले. नवीन OTP मागवा."},429)}
 if(new Date(row.expires_at.replace(" ","T")+"Z").getTime()<Date.now()){await env.DB.prepare("DELETE FROM admin_otp WHERE email=?").bind(ADMIN_EMAIL).run();return json({error:"OTP कालबाह्य झाला. नवीन OTP मागवा."},400)}
 const hash=await sha(email+":"+code+":"+env.ADMIN_OTP_SECRET);
 if(hash!==row.otp_hash){await env.DB.prepare("UPDATE admin_otp SET attempts=attempts+1 WHERE email=?").bind(ADMIN_EMAIL).run();return json({error:"OTP चुकीचा आहे."},401)}
 await env.DB.prepare("DELETE FROM admin_otp WHERE email=?").bind(ADMIN_EMAIL).run();
 const payload=b64url(enc.encode(JSON.stringify({role:"admin",email:ADMIN_EMAIL,exp:Date.now()+8*60*60*1000})));
 const token=payload+"."+await sign(payload,env.ADMIN_SESSION_SECRET);
 return new Response(JSON.stringify({ok:true}),{status:200,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Set-Cookie":"sgg_admin="+token+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800"}});
}