import { createClient } from "npm:@supabase/supabase-js@2";
const APP_URL = "https://pinoypocketbudget.app";
const LOGO_URL = `${APP_URL}/pinoy-pocket-budget-logo.png`;
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP"
});
const duePattern = /\n\[\[PPB_DUE:(\d{4}-\d{2}-\d{2})\]\]/;
const paidPattern = /\n\[\[PPB_DUE_PAID:((?:loan|credit_card):\d+:\d{4}-\d{2}-\d{2})\]\]/;
const appliedPattern = /\n\[\[PPB_DUE_APPLIED:((?:loan|credit_card):\d+:\d{4}-\d{2}-\d{2}):([0-9.]+)\]\]/g;
const chargePattern = /\n\[\[PPB_CHARGE:(bank|credit_card):(\d+)\]\]/;
const debtPattern = /\n\[\[PPB_DEBT:(loan|credit_card):(\d+)\]\]/;
const endPattern = /\n\[\[PPB_END:(\d{4}-\d{2}-\d{2})\]\]/;
const metadataPatterns = /\n\[\[PPB_[^\]]+\]\]/g;
function dateKey(date) {
  return date.toISOString().slice(0, 10);
}
function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
function cleanNote(note) {
  return note.replace(metadataPatterns, "").trim();
}
function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char)=>({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
}
function recurrence(category) {
  if (!category.startsWith("Recurring template · ")) return null;
  const text = category.slice("Recurring template · ".length);
  const [frequency, ...rest] = text.split(" · ");
  if (![
    "monthly",
    "quarterly",
    "annually"
  ].includes(frequency)) return null;
  return {
    frequency,
    category: rest.join(" · ") || "Recurring expense"
  };
}
function isOccurrence(startKey, targetKey, frequency) {
  const start = new Date(`${startKey}T00:00:00Z`), target = new Date(`${targetKey}T00:00:00Z`);
  if (target < start) return false;
  const months = (target.getUTCFullYear() - start.getUTCFullYear()) * 12 + target.getUTCMonth() - start.getUTCMonth();
  const interval = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  return months % interval === 0 && target.getUTCDate() === Math.min(start.getUTCDate(), daysInMonth(target.getUTCFullYear(), target.getUTCMonth()));
}
function structuredChargeAmounts(adjustments, allocations, debtType, debtId, targetKey) {
  if (!adjustments || !allocations) return null;
  const allocated = new Map();
  for (const row of allocations) {
    if (row.adjustment_id == null) continue;
    allocated.set(Number(row.adjustment_id), (allocated.get(Number(row.adjustment_id)) || 0) + Number(row.amount));
  }
  let netOutstanding = 0, duePositive = 0;
  for (const row of adjustments) {
    const targetId = debtType === "loan" ? row.loan_id : row.credit_card_id;
    if (row.status !== "posted" || row.debt_type !== debtType || Number(targetId) !== Number(debtId)) continue;
    const signed = Number(row.signed_amount);
    const remaining = signed > 0 ? Math.max(0, signed - (allocated.get(Number(row.id)) || 0)) : signed;
    netOutstanding += remaining;
    if (remaining > 0 && row.due_date === targetKey) duePositive += remaining;
  }
  netOutstanding = Math.max(0, netOutstanding);
  return { total: netOutstanding, due: Math.min(netOutstanding, duePositive) };
}
function collectDueItems(target, today, tx, loans, cards, structured = null) {
  const targetKey = dateKey(target), days = Math.round((target.getTime() - today.getTime()) / 86400000);
  const paid = new Set();
  const applied = new Map();
  for (const item of tx){
    const paidKey = item.note.match(paidPattern)?.[1];
    if (paidKey) paid.add(paidKey);
    for (const match of item.note.matchAll(appliedPattern))applied.set(match[1], (applied.get(match[1]) || 0) + Number(match[2]));
  }
  const items = [];
  for (const loan of loans){
    const key = `loan:${loan.id}:${targetKey}`;
    if (loan.balance > 0 && loan.due === targetKey && !paid.has(key)) {
      const charges = structuredChargeAmounts(structured?.adjustments, structured?.allocations, "loan", loan.id, targetKey);
      const scheduledBase = charges ? Math.max(0, Number(loan.balance) - charges.total) : Number(loan.balance);
      const amount = Math.max(0, Math.min(Number(loan.monthly), scheduledBase) - (applied.get(key) || 0) + (charges?.due || 0));
      if (amount > 0) items.push({
        key,
        name: loan.name,
        source: loan.lender ? `Loan · ${loan.lender}` : "Loan",
        amount,
        dueDate: targetKey,
        days
      });
    }
  }
  for (const card of cards){
    const expectedDay = Math.min(Number(card.due_day), daysInMonth(target.getUTCFullYear(), target.getUTCMonth()));
    const key = `credit_card:${card.id}:${targetKey}`;
    if (card.current_balance > 0 && target.getUTCDate() === expectedDay && !paid.has(key)) {
      const charges = structuredChargeAmounts(structured?.adjustments, structured?.allocations, "credit_card", card.id, targetKey);
      const rawBase = Number(card.statement_balance) > 0 ? Number(card.statement_balance) : Number(card.current_balance);
      const base = charges ? Math.max(0, rawBase - charges.total) : rawBase;
      const amount = Math.max(0, base - (applied.get(key) || 0) + (charges?.due || 0));
      if (amount > 0) items.push({
        key,
        name: card.name,
        source: card.issuer ? `Credit card · ${card.issuer}` : "Credit card",
        amount,
        dueDate: targetKey,
        days
      });
    }
  }
  for (const item of tx){
    if (item.kind !== "expense") continue;
    if (structured?.linkedSourceTransactionIds?.has(Number(item.id))) continue;
    const rule = recurrence(item.category);
    if (rule) {
      if (days < 0 || item.note.match(debtPattern) || item.note.match(chargePattern)?.[1] === "credit_card") continue;
      const end = item.note.match(endPattern)?.[1];
      if ((!end || targetKey <= end) && isOccurrence(item.date, targetKey, rule.frequency)) {
        items.push({
          key: `recurring:${item.id}:${targetKey}`,
          name: cleanNote(item.note) || rule.category,
          source: `${rule.category} · ${rule.frequency[0].toUpperCase()}${rule.frequency.slice(1)}`,
          amount: Number(item.amount),
          dueDate: targetKey,
          days
        });
      }
      continue;
    }
    const due = item.note.match(duePattern)?.[1];
    if (due !== targetKey || item.note.match(chargePattern)?.[1] === "credit_card" || item.category.startsWith("Credit card · ") || item.category.startsWith("Credit card payment · ") || item.category.startsWith("Loan payment · ")) continue;
    items.push({
      key: `expense:${item.id}:${targetKey}`,
      name: cleanNote(item.note) || item.category,
      source: item.category,
      amount: Number(item.amount),
      dueDate: targetKey,
      days
    });
  }
  return items;
}
function rows(items, overdue) {
  return items.map((item)=>`<tr><td style="padding:16px 0;border-bottom:1px solid #e5e0d6"><strong style="display:block;color:#1d2420">${safe(item.name)}</strong><span style="color:#7d827d;font-size:13px">${safe(item.source)} · Due ${safe(new Date(`${item.dueDate}T00:00:00Z`).toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }))}</span></td><td style="padding:16px 0;border-bottom:1px solid #e5e0d6;text-align:right"><strong style="display:block;color:${overdue ? "#a6372d" : "#285f4b"}">${safe(peso.format(item.amount))}</strong><span style="font-size:13px;color:${overdue ? "#a6372d" : "#285f4b"}">${overdue ? "3 days overdue" : "Due in 15 days"}</span></td></tr>`).join("");
}
function emailHtml(firstName, upcoming, overdue) {
  const overdueTotal = overdue.reduce((sum, item)=>sum + item.amount, 0), upcomingTotal = upcoming.reduce((sum, item)=>sum + item.amount, 0);
  return `<!doctype html><html><body style="margin:0;background:#f5f2eb;font-family:Arial,sans-serif;color:#1d2420"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:auto;background:#fffdf8;border:1px solid #e5e0d6;border-radius:24px;overflow:hidden"><tr><td style="padding:28px 24px;background:#285f4b;color:#fffdf8"><table role="presentation"><tr><td style="padding:8px;background:#fffdf8;border:3px solid #d6b865;border-radius:20px"><img src="${LOGO_URL}" width="88" height="88" alt="Pinoy Pocket Budget" style="display:block;object-fit:contain"></td><td style="padding-left:14px;color:#fffdf8"><strong style="font-size:18px">Pinoy Pocket Budget</strong><br><span style="color:#d6e3dc">Your personal budget companion</span></td></tr></table><p style="margin:24px 0 8px;color:#d6e3dc;text-transform:uppercase;letter-spacing:2px;font-size:12px">Payment reminder</p><h1 style="margin:0 0 8px;font-family:Georgia,serif;font-weight:normal;color:#fffdf8">Your overdue and upcoming dues</h1><p style="margin:0;color:#d6e3dc">Account update as of ${safe(todayLabel())}</p></td></tr><tr><td style="padding:24px"><p>Hi ${safe(firstName || "there")}, here is your scheduled payment report.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${overdue.length ? `<td style="padding:16px;background:#f5f2eb;border-radius:14px"><span style="color:#7d827d">Total overdue</span><br><strong style="font:24px Georgia,serif;color:#a6372d">${safe(peso.format(overdueTotal))}</strong></td>` : ""}${upcoming.length ? `<td width="12"></td><td style="padding:16px;background:#f5f2eb;border-radius:14px"><span style="color:#7d827d">Due in 15 days</span><br><strong style="font:24px Georgia,serif;color:#285f4b">${safe(peso.format(upcomingTotal))}</strong></td>` : ""}</tr></table>${overdue.length ? `<h2 style="margin:26px 0 0;font:20px Georgia,serif">Overdue details</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows(overdue, true)}</table>` : ""}${upcoming.length ? `<h2 style="margin:26px 0 0;font:20px Georgia,serif">Upcoming dues</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows(upcoming, false)}</table>` : ""}<p style="text-align:center;margin:26px 0"><a href="${APP_URL}" style="display:inline-block;padding:14px 22px;border:2px solid #203d33;border-radius:12px;background:#285f4b;color:#fffdf8;text-decoration:none;font-weight:bold">Review and record payments</a></p><p style="padding:14px;border-left:4px solid #d6b865;background:#f5f2eb;color:#7d827d">Balances are based on entries recorded in Pinoy Pocket Budget. If you already paid an item, record or confirm the payment in the app.</p></td></tr><tr><td style="padding:18px 24px;text-align:center;background:#f5f2eb;color:#7d827d;font-size:12px">Sent to the email address on your account.<br>Manage email reports in Account Settings · support@pinoypocketbudget.app</td></tr></table></td></tr></table></body></html>`;
}
function todayLabel() {
  return new Date().toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila"
  });
}
Deno.serve(async (req)=>{
  if (req.method !== "POST") return new Response("Method not allowed", {
    status: 405
  });
  const cronSecret = Deno.env.get("DUE_REPORT_CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) return new Response("Unauthorized", {
    status: 401
  });
  const supabaseUrl = Deno.env.get("SUPABASE_URL"), serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), resendKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !serviceRoleKey || !resendKey) return new Response("Missing server configuration", {
    status: 500
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const now = new Date(), phNow = new Date(now.toLocaleString("en-US", {
    timeZone: "Asia/Manila"
  }));
  const today = new Date(Date.UTC(phNow.getFullYear(), phNow.getMonth(), phNow.getDate()));
  const upcomingDate = addDays(today, 15), overdueDate = addDays(today, -3);
  let page = 1, sent = 0, skipped = 0;
  while(true){
    const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000
    });
    if (usersError) throw usersError;
    for (const user of usersPage.users){
      if (!user.email || user.user_metadata?.due_email_reports === false) {
        skipped++;
        continue;
      }
      const [txResult, loansResult, cardsResult, adjustmentsResult, allocationsResult] = await Promise.all([
        admin.from("transactions").select("id,kind,amount,category,note,date").eq("user_id", user.id),
        admin.from("loans").select("id,name,lender,balance,monthly,due").eq("user_id", user.id),
        admin.from("credit_cards").select("id,name,issuer,current_balance,statement_balance,due_day").eq("user_id", user.id),
        admin.from("debt_adjustments").select("id,debt_type,loan_id,credit_card_id,signed_amount,due_date,source_transaction_id,status").eq("user_id", user.id).eq("status", "posted"),
        admin.from("payment_allocations").select("adjustment_id,amount").eq("user_id", user.id)
      ]);
      const structured = !adjustmentsResult.error && !allocationsResult.error ? {
        adjustments: adjustmentsResult.data || [],
        allocations: allocationsResult.data || [],
        linkedSourceTransactionIds: new Set((adjustmentsResult.data || []).flatMap((item)=>item.source_transaction_id == null ? [] : [Number(item.source_transaction_id)]))
      } : null;
      const tx = txResult.data || [], loans = loansResult.data || [], cards = cardsResult.data || [];
      const upcoming = collectDueItems(upcomingDate, today, tx, loans, cards, structured), overdue = collectDueItems(overdueDate, today, tx, loans, cards, structured);
      const candidates = [
        ...upcoming.map((item)=>({
            ...item,
            type: "upcoming_15_days"
          })),
        ...overdue.map((item)=>({
            ...item,
            type: "overdue_3_days"
          }))
      ];
      if (!candidates.length) continue;
      const { data: delivered } = await admin.from("email_reminder_deliveries").select("reminder_type,due_key").eq("user_id", user.id).in("due_key", candidates.map((item)=>item.key));
      const deliveredKeys = new Set((delivered || []).map((item)=>`${item.reminder_type}:${item.due_key}`));
      const freshUpcoming = upcoming.filter((item)=>!deliveredKeys.has(`upcoming_15_days:${item.key}`)), freshOverdue = overdue.filter((item)=>!deliveredKeys.has(`overdue_3_days:${item.key}`));
      if (!freshUpcoming.length && !freshOverdue.length) continue;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: Deno.env.get("REPORT_FROM_EMAIL") || "Pinoy Pocket Budget <reports@updates.pinoypocketbudget.app>",
          reply_to: "support@pinoypocketbudget.app",
          to: [
            user.email
          ],
          subject: freshOverdue.length ? "Action needed: overdue and upcoming dues" : "Upcoming dues in 15 days",
          html: emailHtml(user.user_metadata?.first_name || "", freshUpcoming, freshOverdue)
        })
      });
      const result = await response.json();
      if (!response.ok) {
        console.error("Resend error", user.id, result);
        continue;
      }
      await admin.from("email_reminder_deliveries").insert([
        ...freshUpcoming.map((item)=>({
            user_id: user.id,
            reminder_type: "upcoming_15_days",
            due_key: item.key,
            due_date: item.dueDate,
            recipient_email: user.email,
            provider_message_id: result.id
          })),
        ...freshOverdue.map((item)=>({
            user_id: user.id,
            reminder_type: "overdue_3_days",
            due_key: item.key,
            due_date: item.dueDate,
            recipient_email: user.email,
            provider_message_id: result.id
          }))
      ]);
      sent++;
    }
    if (usersPage.users.length < 1000) break;
    page++;
  }
  return Response.json({
    ok: true,
    sent,
    skipped,
    upcoming_date: dateKey(upcomingDate),
    overdue_date: dateKey(overdueDate)
  });
});
