const ADMIN_EMAIL="luckyshankar48@gmail.com";
const enc=new TextEncoder();
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
async function sha(v){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(v)))].map(x=>x.toString(16).padStart(2,"0")).join("")}
export async function onRequestPost({request,env}){
 const origin=request.headers.get("Origin");if(origin){try{if(new URL(origin).host!==new URL(request.url).host)return json({error:"Origin not allowed"},403)}catch{return json({error:"Invalid origin"},403)}}
 if(!env.DB||!env.RESEND_API_KEY||!env.ADMIN_OTP_SECRET||!env.ADMIN_SESSION_SECRET)return json({error:"OTP सेवा अजून Cloudflare मध्ये configure केलेली नाही. आवश्यक Secrets/DB तपासा."},503);
 let body;try{body=await request.json()}catch{return json({error:"Invalid request"},400)}
 const email=String(body?.email||"").trim().toLowerCase();if(email!==ADMIN_EMAIL)return json({error:"या ई-मेलला Admin प्रवेश नाही."},403);
 const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,"0");
 const hash=await sha(email+":"+code+":"+env.ADMIN_OTP_SECRET);
 const now=new Date();const expires=new Date(now.getTime()+5*60*1000).toISOString().replace("T"," ").slice(0,19);
 const sent=await env.DB.prepare("INSERT INTO admin_otp(email,otp_hash,expires_at,attempts,last_sent_at) VALUES(?,?,?,0,datetime('now')) ON CONFLICT(email) DO UPDATE SET otp_hash=excluded.otp_hash,expires_at=excluded.expires_at,attempts=0,last_sent_at=datetime('now') WHERE admin_otp.last_sent_at <= datetime('now','-60 seconds')").bind(ADMIN_EMAIL,hash,expires).run();
 if(!(sent.meta?.changes>0))return json({error:"नवीन OTP पाठवण्यापूर्वी 60 सेकंद थांबा."},429);
 const from=env.ADMIN_OTP_FROM||"SGGVISION Admin <onboarding@resend.dev>";
 let mail;try{mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from,to:[ADMIN_EMAIL],subject:"SGGVISION Admin Login OTP",text:"तुमचा SGGVISION Admin OTP: "+code+"\nहा कोड 5 मिनिटांत कालबाह्य होईल. तुम्ही हा प्रयत्न केला नसेल तर हा ई-मेल दुर्लक्षित करा.",html:"<div style='font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px'><h2>SGGVISION Admin Login</h2><p>तुमचा पडताळणी कोड:</p><div style='font-size:32px;font-weight:bold;letter-spacing:8px;padding:18px;background:#f2f5f4;text-align:center'>"+code+"</div><p>हा कोड 5 मिनिटांत कालबाह्य होईल. कोणालाही हा कोड सांगू नका.</p></div>"})})}catch{mail=null}
 if(!mail?.ok){await env.DB.prepare("DELETE FROM admin_otp WHERE email=?").bind(ADMIN_EMAIL).run();return json({error:"OTP ई-मेल पाठवता आला नाही. Resend API Key, sender आणि domain/test setup तपासा."},502)}
 return json({ok:true,message:"OTP तुमच्या अधिकृत Gmail वर पाठवला आहे."});
}