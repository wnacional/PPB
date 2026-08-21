import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, CreditCard, LogOut, Plus, ReceiptText, WalletCards } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import './debt-actions.css'

type Kind = 'income' | 'expense'
type DebtType = 'loan' | 'credit_card'
type Tx = { id: number; kind: Kind; amount: number; category: string; note: string; date: string }
type Loan = { id: number; name: string; lender: string; balance: number; monthly: number; due: string }
type Card = { id: number; name: string; issuer: string; current_balance: number; minimum_payment: number; due_day: number }
type Debt = { id: number; name: string; provider: string; debtType: DebtType; balance: number; scheduledAmount: number; dueDate: string }
type DebtAction = 'payment' | 'adjustment'

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
const today = () => new Date().toISOString().slice(0, 10)
const newTransactionId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000)

function cardDueDate(dueDay: number) {
  const now = new Date()
  const safeDate = (year: number, month: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate()
    return new Date(year, month, Math.min(dueDay, lastDay))
  }
  let due = safeDate(now.getFullYear(), now.getMonth())
  if (due < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    due = safeDate(now.getFullYear(), now.getMonth() + 1)
  }
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`
}

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  async function login(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMsg(error?.message || 'Signed in.')
  }
  async function signup() {
    const { error } = await supabase.auth.signUp({ email, password })
    setMsg(error?.message || 'Check your email to confirm your account.')
  }
  return <main className="auth"><section className="auth-card"><div className="brand-mark">₱</div><h1>Pinoy Pocket Budget</h1><p>Every peso has a purpose.</p>{!configured && <div className="notice">Add your Supabase anon key to <code>.env</code>.</div>}<form onSubmit={login}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required /></label><button className="primary">Sign in</button><button type="button" className="secondary" onClick={signup}>Create account</button></form>{msg && <p className="message">{msg}</p>}</section></main>
}

function DebtActionForm({ session, debt, action, onClose, onSaved }: { session: Session; debt: Debt; action: DebtAction; onClose(): void; onSaved(): Promise<void> }) {
  const chargeOptions = debt.debtType === 'loan'
    ? [['late_fee', 'Late-payment penalty'], ['additional_interest', 'Additional interest'], ['collection_fee', 'Collection fee'], ['restructuring_fee', 'Restructuring fee'], ['other_charge', 'Other loan charge']]
    : [['finance_charge', 'Finance charge'], ['late_fee', 'Late-payment fee'], ['over_limit_fee', 'Over-limit fee'], ['annual_fee', 'Annual fee'], ['other_charge', 'Other card charge']]
  const suggestedPayment = Math.min(debt.balance, debt.scheduledAmount || debt.balance)
  const [amount, setAmount] = useState(action === 'payment' ? String(suggestedPayment) : '')
  const [date, setDate] = useState(today())
  const [dueDate, setDueDate] = useState(debt.dueDate)
  const [adjustmentType, setAdjustmentType] = useState(chargeOptions[0][0])
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const numericAmount = Number(amount)
    const id = newTransactionId()
    const category = `${debt.debtType === 'loan' ? 'Loan' : 'Credit card'} ${action} · ${debt.name}`
    const defaultDescription = chargeOptions.find(item => item[0] === adjustmentType)?.[1] || 'Debt adjustment'
    const note = description.trim() || (action === 'payment' ? `Payment for ${debt.name}` : defaultDescription)
    const args = action === 'payment' ? {
      p_user_id: session.user.id, p_debt_type: debt.debtType, p_debt_id: debt.id,
      p_amount: numericAmount, p_payment_date: date, p_due_date: dueDate,
      p_source_account_key: 'budget-balance', p_transaction_id: id,
      p_transaction_category: category, p_transaction_note: note, p_advanced_due_date: null,
    } : {
      p_user_id: session.user.id, p_debt_type: debt.debtType, p_debt_id: debt.id,
      p_adjustment_type: adjustmentType, p_amount: numericAmount, p_effective_date: date,
      p_due_date: dueDate, p_description: note, p_transaction_id: id,
      p_transaction_category: category, p_transaction_note: note, p_reverses_adjustment_id: null,
    }
    const functionName = action === 'payment' ? 'record_debt_payment' : 'record_debt_adjustment'
    const { error: rpcError } = await supabase.rpc(functionName, args)
    if (rpcError) {
      setError(rpcError.message)
      setBusy(false)
      return
    }
    await onSaved()
    onClose()
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}><span className="eyebrow">{action === 'payment' ? 'RECORD PAYMENT' : 'BALANCE ADJUSTMENT'}</span><h2>{debt.name}</h2><p className="form-summary">Current balance: <strong>{peso.format(debt.balance)}</strong></p>{action === 'adjustment' && <label>Adjustment type<select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value)} disabled={busy}>{chargeOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>}<label>Amount<input type="number" min="0.01" max={action === 'payment' ? debt.balance : undefined} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required disabled={busy} /></label><label>{action === 'payment' ? 'Payment date' : 'Effective date'}<input type="date" value={date} onChange={e => setDate(e.target.value)} required disabled={busy} /></label><label>Due date<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required disabled={busy} /></label><label>Note<textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" disabled={busy} /></label>{action === 'payment' && <p className="form-note">The payment is deducted from your budget balance and applied atomically to this debt.</p>}{error && <p className="form-error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Saving…' : action === 'payment' ? 'Record payment' : 'Record adjustment'}</button><button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancel</button></form></div>
}

function Dashboard({ session }: { session: Session }) {
  const [tx, setTx] = useState<Tx[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [open, setOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<{ debt: Debt; action: DebtAction } | null>(null)
  const [kind, setKind] = useState<Kind>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [note, setNote] = useState('')
  const [loadError, setLoadError] = useState('')

  async function load() {
    const [t, l, c] = await Promise.all([
      supabase.from('transactions').select('id,kind,amount,category,note,date').order('date', { ascending: false }).limit(50),
      supabase.from('loans').select('id,name,lender,balance,monthly,due').order('created_at', { ascending: false }),
      supabase.from('credit_cards').select('id,name,issuer,current_balance,minimum_payment,due_day').order('created_at', { ascending: false }),
    ])
    const firstError = t.error || l.error || c.error
    setLoadError(firstError?.message || '')
    setTx((t.data || []) as Tx[])
    setLoans((l.data || []) as Loan[])
    setCards((c.data || []) as Card[])
  }
  useEffect(() => { void load() }, [])

  const debts = useMemo<Debt[]>(() => [
    ...loans.map(loan => ({ id: loan.id, name: loan.name, provider: loan.lender, debtType: 'loan' as const, balance: Number(loan.balance), scheduledAmount: Number(loan.monthly), dueDate: loan.due })),
    ...cards.map(card => ({ id: card.id, name: card.name, provider: card.issuer, debtType: 'credit_card' as const, balance: Number(card.current_balance), scheduledAmount: Number(card.minimum_payment), dueDate: cardDueDate(card.due_day) })),
  ], [loans, cards])
  const totals = useMemo(() => {
    const income = tx.filter(item => item.kind === 'income').reduce((sum, item) => sum + Number(item.amount), 0)
    const expense = tx.filter(item => item.kind === 'expense').reduce((sum, item) => sum + Number(item.amount), 0)
    return { income, expense, balance: income - expense, debt: debts.reduce((sum, item) => sum + item.balance, 0) }
  }, [tx, debts])

  async function add(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('transactions').insert({ id: newTransactionId(), user_id: session.user.id, kind, amount: Number(amount), category, note, date: today() })
    if (error) return alert(error.message)
    setAmount('')
    setNote('')
    setOpen(false)
    await load()
  }

  return <div className="shell"><header><div><span className="eyebrow">MAGANDANG ARAW</span><h1>My Budget</h1></div><button className="icon" onClick={() => supabase.auth.signOut()} title="Sign out"><LogOut /></button></header><main className="content">{loadError && <div className="notice" role="alert">Could not load all budget data: {loadError}</div>}<section className="balance"><span>Income balance</span><strong>{peso.format(totals.balance)}</strong><small>Income minus expenses</small></section><section className="metrics"><article><ArrowUpCircle /><span>Income</span><strong>{peso.format(totals.income)}</strong></article><article><ArrowDownCircle /><span>Expenses</span><strong>{peso.format(totals.expense)}</strong></article><article><WalletCards /><span>Total debt</span><strong>{peso.format(totals.debt)}</strong></article></section><section className="section-title"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Transactions</h2></div><button className="primary compact" onClick={() => setOpen(true)}><Plus /> Add</button></section><section className="list">{tx.length ? tx.map(item => <article key={item.id}><div className={`tx-icon ${item.kind}`}>{item.kind === 'income' ? <ArrowUpCircle /> : <ArrowDownCircle />}</div><div><strong>{item.note || item.category}</strong><span>{item.category} · {new Date(`${item.date}T00:00:00`).toLocaleDateString('en-PH')}</span></div><b className={item.kind}>{item.kind === 'income' ? '+' : '−'}{peso.format(Number(item.amount))}</b></article>) : <div className="empty">No transactions yet. Add your first income or expense.</div>}</section><section className="section-title"><div><span className="eyebrow">WHAT YOU OWE</span><h2>Loans & credit cards</h2></div></section><section className="list debt-list">{debts.length ? debts.map(debt => <article key={`${debt.debtType}-${debt.id}`}><div className="tx-icon debt"><CreditCard /></div><div><strong>{debt.name}</strong><span>{debt.provider} · Due {new Date(`${debt.dueDate}T00:00:00`).toLocaleDateString('en-PH')}</span></div><b>{peso.format(debt.balance)}</b><div className="debt-actions"><button className="action payment" onClick={() => setSelectedDebt({ debt, action: 'payment' })}>Pay</button><button className="action" onClick={() => setSelectedDebt({ debt, action: 'adjustment' })}><ReceiptText /> Adjust</button></div></article>) : <div className="empty">Your loan and credit-card overview will appear here.</div>}</section></main>{open && <div className="modal-backdrop" onMouseDown={() => setOpen(false)}><form className="modal" onSubmit={add} onMouseDown={e => e.stopPropagation()}><h2>Add transaction</h2><div className="segmented"><button type="button" className={kind === 'expense' ? 'active' : ''} onClick={() => setKind('expense')}>Expense</button><button type="button" className={kind === 'income' ? 'active' : ''} onClick={() => setKind('income')}>Income</button></div><label>Amount<input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{['Food', 'Bills', 'Transport', 'Shopping', 'Salary', 'Freelance', 'Other'].map(item => <option key={item}>{item}</option>)}</select></label><label>Note<textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></label><button className="primary">Save transaction</button><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button></form></div>}{selectedDebt && <DebtActionForm session={session} debt={selectedDebt.debt} action={selectedDebt.action} onClose={() => setSelectedDebt(null)} onSaved={load} />}</div>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!ready) return <div className="loading">Loading…</div>
  return session ? <Dashboard session={session} /> : <Auth />
}
