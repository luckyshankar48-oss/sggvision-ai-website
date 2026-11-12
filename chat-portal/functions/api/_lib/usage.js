const enc=new TextEncoder();
const pepper=(env)=>env.SESSION_PEPPER||"sggvision-session-v1";
const b64=(a)=>btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
async function digest(value,salt){const key=await crypto.subtle.importKey("raw",enc.encode(value),"PBKDF2",false,["deriveBits"]);return b64(await crypto.subtle.deriveBits({name:"PBKDF2",salt:enc.encode(salt),iterations:210000,hash:"SHA-256"},key,256))}
async function sign(value,secret){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64(await crypto.subtle.sign("HMAC",key,enc.encode(value)))}
function random(){return b64(crypto.getRandomValues(new Uint8Array(24)))}
function getCookie(request,name){const m=(request.headers.get("Cookie")||"").match(new RegExp("(?:^|; )"+name+"=([^;]+)"));return m?m[1]:null}
export async function consumeUsage(request,env){
 if(!env.DB)return {ok:false,status:503,error:"खाते व मोफत वापर सेवा सध्या जोडलेली नाही."};
 const customerToken=getCookie(request,"sgg_customer");
 if(customerToken){const tokenHash=await digest(customerToken,pepper(env));const c=await env.DB.prepare("SELECT c.id FROM customer_sessions s JOIN customers c ON c.id=s.customer_id WHERE s.token_hash=? AND s.expires_at>datetime('now') AND c.status='active'").bind(tokenHash).first();if(c){const sub=await env.DB.prepare("SELECT id FROM subscriptions WHERE customer_id=? AND status='active' AND (ends_at IS NULL OR ends_at>datetime('now')) LIMIT 1").bind(c.id).first();return sub?{ok:true,customerId:c.id}:{ok:false,status:402,error:"तुमचे खाते लॉगिन झाले आहे. AI वापरण्यासाठी कृपया सक्रिय प्लॅन निवडा."}}}
 let guest=getCookie(request,"sgg_guest"),setCookie=null,guestId=null;
 if(guest){const parts=guest.split(".");if(parts.length===2&&/^[A-Za-z0-9_-]{20,64}$/.test(parts[0])&&await sign(parts[0],pepper(env))===parts[1])guestId=parts[0]}
 if(!guestId){guestId=random();setCookie="sgg_guest="+guestId+"."+await sign(guestId,pepper(env))+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000"}
 const row=await env.DB.prepare("INSERT INTO usage_counters(id,guest_id,free_messages_used) VALUES(?,?,1) ON CONFLICT(guest_id) DO UPDATE SET free_messages_used=usage_counters.free_messages_used+1,updated_at=datetime('now') WHERE usage_counters.free_messages_used<5 RETURNING free_messages_used").bind(crypto.randomUUID(),guestId).first();
 if(!row){const used=await env.DB.prepare("SELECT free_messages_used FROM usage_counters WHERE guest_id=?").bind(guestId).first();return {ok:false,status:402,error:"तुमचे ५ मोफत संदेश पूर्ण झाले आहेत. पुढे सुरू ठेवण्यासाठी खाते तयार करा किंवा लॉगिन करून प्लॅन निवडा.",setCookie}}
 return {ok:true,guestId,remaining:5-row.free_messages_used,setCookie};
}


// Refund a reserved guest request when AI processing fails.
// Authenticated subscribers are not charged per request by this pilot quota.
export async function releaseUsage(usage,env){
 if(!usage?.guestId||!env.DB)return;
 await env.DB.prepare("UPDATE usage_counters SET free_messages_used=CASE WHEN free_messages_used>0 THEN free_messages_used-1 ELSE 0 END,updated_at=datetime('now') WHERE guest_id=?").bind(usage.guestId).run();
}
