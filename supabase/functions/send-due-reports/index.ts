import {createClient} from 'npm:@supabase/supabase-js@2'

const jsonHeaders={'content-type':'application/json'}
const encoder=new TextEncoder()

function secureEqual(a:string,b:string){
 const left=encoder.encode(a),right=encoder.encode(b)
 if(left.length!==right.length)return false
 let result=0
 for(let i=0;i<left.length;i++)result|=left[i]^right[i]
 return result===0
}

function isoDate(date:Date){return date.toISOString().slice(0,10)}
function addDays(date:Date,days:number){const next=new Date(date);next.setUTCDate(next.getUTCDate()+days);return next}
function money(value:number){return new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(value)}
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]!))}

Deno.serve(async request=>{
 try{
  if(request.method!=='POST')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:jsonHeaders})
  const expected=Deno.env.get('DUE_REPORT_CRON_SECRET')||''
  const supplied=request.headers.get('x-cron-secret')
   ||request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
   ||''
  if(!expected||!secureEqual(supplied,expected))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:jsonHeaders})

  const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
  const resendKey=Deno.env.get('RESEND_API_KEY')
  const from=Deno.env.get('REPORT_FROM_EMAIL')
  if(!resendKey||!from)throw new Error('Email delivery secrets are incomplete')

  const body=await request.json().catch(()=>({})) as {today?:string;dry_run?:boolean}
  const today=body.today?new Date(`${body.today}T00:00:00.000Z`):new Date()
  const upcomingDate=isoDate(addDays(today,15)),overdueDate=isoDate(addDays(today,-3))
  const {data:items,error}=await supabase.from('due_report_items').select('*').in('due_date',[upcomingDate,overdueDate]).gt('amount_due',0)
  if(error)throw error

  let sent=0,skipped=0
  for(const item of items||[]){
   const reportType=item.due_date===upcomingDate?'upcoming_15_days':'overdue_3_days'
   const {data:settings}=await supabase.from('user_notification_settings').select('due_reports_enabled').eq('user_id',item.user_id).maybeSingle()
   if(settings?.due_reports_enabled===false){skipped++;continue}
   const {data:userResult}=await supabase.auth.admin.getUserById(item.user_id)
   const email=userResult.user?.email
   if(!email||!userResult.user?.email_confirmed_at){skipped++;continue}
   const {data:prior}=await supabase.from('due_report_deliveries').select('id').eq('user_id',item.user_id).eq('debt_type',item.debt_type).eq('debt_id',item.debt_id).eq('due_date',item.due_date).eq('report_type',reportType).maybeSingle()
   if(prior){skipped++;continue}
   if(body.dry_run){sent++;continue}

   const title=reportType==='upcoming_15_days'?`${item.name} is due in 15 days`:`${item.name} is 3 days overdue`
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${resendKey}`,'content-type':'application/json'},body:JSON.stringify({from,to:[email],reply_to:'support@pinoypocketbudget.app',subject:`Pinoy Pocket Budget: ${title}`,html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#19362f"><div style="background:#123e34;color:white;padding:24px;border-radius:18px 18px 0 0"><h1 style="margin:0;font-size:24px">Pinoy Pocket Budget</h1></div><div style="padding:24px;border:1px solid #dfe7e3;border-top:0;border-radius:0 0 18px 18px"><h2>${escapeHtml(title)}</h2><p>Your ${escapeHtml(item.debt_type==='credit_card'?'credit card':'loan')} payment has an outstanding balance of <strong>${money(Number(item.amount_due))}</strong>.</p><p><strong>Due date:</strong> ${escapeHtml(item.due_date)}</p><p>Open Pinoy Pocket Budget to review the account or record a payment.</p></div></div>`})})
   if(!response.ok)throw new Error(`Resend failed (${response.status}): ${await response.text()}`)
   const delivery=await response.json()
   const {error:logError}=await supabase.from('due_report_deliveries').insert({user_id:item.user_id,debt_type:item.debt_type,debt_id:item.debt_id,due_date:item.due_date,report_type:reportType,resend_email_id:delivery.id})
   if(logError)throw logError
   sent++
  }
  return new Response(JSON.stringify({ok:true,sent,skipped,upcoming_date:upcomingDate,overdue_date:overdueDate}),{headers:jsonHeaders})
 }catch(error){console.error(error);return new Response(JSON.stringify({ok:false,error:error instanceof Error?error.message:'Unknown error'}),{status:500,headers:jsonHeaders})}
})
