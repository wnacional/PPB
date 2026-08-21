import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowRight, ArrowUpCircle, Bell, CreditCard, HelpCircle, Home, Landmark, List, LogOut, Menu, Plus, ReceiptText, Search, Settings, Share2, ShieldCheck, Star, Trash2, WalletCards, X } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import './debt-actions.css'
import './settings.css'
import './responsive.css'
import './workspace.css'
import './brand-alignment.css'
import { PublicPages } from './PublicPages'

type Kind = 'income' | 'expense'
type DebtType = 'loan' | 'credit_card'
type Tx = { id: number; kind: Kind; amount: number; category: string; note: string; date: string }
type Loan = { id: number; name: string; lender: string; balance: number; monthly: number; due: string }
type Card = { id: number; name: string; issuer: string; current_balance: number; minimum_payment: number; due_day: number }
type BudgetAccount = { id: number; account_type: 'bank_wallet' | 'cash_on_hand'; name: string; provider: string; available_balance: number; protected_balance: number; savings_balance: number; color_key: string }
type Debt = { id: number; name: string; provider: string; debtType: DebtType; balance: number; scheduledAmount: number; dueDate: string }
type DebtAction = 'payment' | 'adjustment'
type WorkspacePage = 'overview' | 'activity' | 'debts' | 'premium'

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
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  async function login(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMsg(error?.message || 'Signed in.')
  }
  async function signup() {
    const { error } = await supabase.auth.signUp({ email, password })
    setMsg(error?.message || 'Check your email to confirm your account.')
  }
  async function forgotPassword() {
    if (!email) return setMsg('Enter your email address first.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` })
    setMsg(error?.message || 'Check your email for a password-reset link.')
  }
  return <main className="auth auth-page"><section className="auth-intro"><div className="brand-mark">₱</div><span className="eyebrow">PINOY POCKET BUDGET</span><h1>Ipon, gastos, at utang—organized in one private place.</h1><p>Track your income, daily expenses, and loan progress in Philippine pesos. Your account keeps your budget separate and protected.</p><ul><li>Private account and cloud backup</li><li>Income, expense, and loan tracking</li><li>Built for Filipino households</li></ul></section><section className="auth-card"><div className="auth-mobile-brand"><div className="brand-mark">₱</div><h1>Pinoy Pocket Budget</h1><p>Every peso has a purpose.</p></div><span className="eyebrow">{mode === 'signin' ? 'WELCOME BACK' : 'CREATE YOUR ACCOUNT'}</span><h2>{mode === 'signin' ? 'Sign in' : 'Start budgeting'}</h2><p>Use your email to access your private budget.</p>{!configured && <div className="notice">Add your Supabase publishable key to the deployment environment.</div>}<form onSubmit={mode === 'signin' ? login : e => { e.preventDefault(); void signup() }}><label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required /></label><button className="primary">{mode === 'signin' ? 'Sign in' : 'Create free account'}</button></form><div className="auth-switch">{mode === 'signin' ? <><button onClick={forgotPassword}>Forgot password?</button><span>New here? <button onClick={() => { setMode('signup'); setMsg('') }}>Create account</button></span></> : <button onClick={() => { setMode('signin'); setMsg('') }}>← Back to sign in</button>}</div>{msg && <p className="message">{msg}</p>}<small>By continuing, you agree to the <a href="/terms">Terms of Service</a> and acknowledge the <a href="/privacy">Privacy Policy</a>. Need help? <a href="/help">Open the Help Center</a>.</small></section></main>
}

function AccountSettings({ session, onClose, onRestartTutorial, onAvatarChange = () => undefined }: { session: Session; onClose(): void; onRestartTutorial(): void; onAvatarChange?(url: string): void }) {
  const [enabled, setEnabled] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(session.user.email || '')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [profile, setProfile] = useState({ first_name: '', surname: '', mobile_number: '', house_unit: '', street_barangay: '', city_municipality: '', province: '', country: '', zip_code: '' })
  const updateProfile = (key: keyof typeof profile, value: string) => setProfile(current => ({ ...current, [key]: value }))

  useEffect(() => {
    void Promise.all([
      supabase.from('user_notification_settings').select('due_reports_enabled').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('user_profiles').select('first_name,surname,mobile_number,house_unit,street_barangay,city_municipality,province,country,zip_code,avatar_path').eq('user_id', session.user.id).maybeSingle(),
    ]).then(async ([notificationResult, profileResult]) => {
      if (notificationResult.error || profileResult.error) setMessage(notificationResult.error?.message || profileResult.error?.message || '')
      setEnabled(notificationResult.data?.due_reports_enabled ?? true)
      if (profileResult.data) {
        const { avatar_path, ...personal } = profileResult.data
        setProfile(personal as typeof profile); setAvatarPath(avatar_path)
        if (avatar_path) {
          const { data } = await supabase.storage.from('profile-photos').createSignedUrl(avatar_path, 3600)
          setAvatarUrl(data?.signedUrl || '')
        }
      }
      setLoaded(true)
    })
  }, [session.user.id])

  async function saveNotifications() {
    setSaving(true)
    const { error } = await supabase.from('user_notification_settings').upsert({ user_id: session.user.id, due_reports_enabled: enabled, updated_at: new Date().toISOString() })
    setSaving(false)
    setMessage(error?.message || 'Notification settings saved.')
  }

  async function savePersonalInformation(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('')
    if (email !== session.user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email })
      if (emailError) { setSaving(false); setMessage(emailError.message); return }
    }
    const { error } = await supabase.from('user_profiles').upsert({ user_id: session.user.id, ...profile, avatar_path: avatarPath, updated_at: new Date().toISOString() })
    setSaving(false); setMessage(error?.message || (email !== session.user.email ? 'Personal information saved. Check both email inboxes to confirm the address change.' : 'Personal information saved.'))
  }

  async function uploadPhoto(file?: File) {
    if (!file) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setMessage('Choose a JPG, PNG, or WebP image up to 5 MB.'); return }
    setSaving(true); setMessage('')
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
    const path = `${session.user.id}/avatar.${extension}`
    const { error } = await supabase.storage.from('profile-photos').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setSaving(false); setMessage(error.message); return }
    if (avatarPath && avatarPath !== path) await supabase.storage.from('profile-photos').remove([avatarPath])
    const { error: profileError } = await supabase.from('user_profiles').upsert({ user_id: session.user.id, ...profile, avatar_path: path, updated_at: new Date().toISOString() })
    const { data } = await supabase.storage.from('profile-photos').createSignedUrl(path, 3600)
    const nextAvatarUrl = data?.signedUrl || ''
    setAvatarPath(path); setAvatarUrl(nextAvatarUrl); onAvatarChange(nextAvatarUrl); setSaving(false); setMessage(profileError?.message || 'Profile photo saved.')
  }

  async function removePhoto() {
    if (!avatarPath) return
    setSaving(true); const { error } = await supabase.storage.from('profile-photos').remove([avatarPath])
    if (!error) await supabase.from('user_profiles').upsert({ user_id: session.user.id, ...profile, avatar_path: null, updated_at: new Date().toISOString() })
    setAvatarPath(null); setAvatarUrl(''); onAvatarChange(''); setSaving(false); setMessage(error?.message || 'Profile photo removed.')
  }

  async function restartTutorial() {
    await supabase.from('user_profiles').upsert({ user_id: session.user.id, ...profile, avatar_path: avatarPath, tutorial_completed_at: null, updated_at: new Date().toISOString() })
    localStorage.removeItem('ppb-tutorial-seen'); onClose(); onRestartTutorial()
  }

  async function deleteAccount() {
    if (confirmation !== 'DELETE') return
    setSaving(true)
    setMessage('')
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
    if (error) {
      setSaving(false)
      setMessage(error.message)
      return
    }
    await supabase.auth.signOut()
  }

  return <div className="settings-backdrop" onMouseDown={onClose}><section className="settings-panel profile-settings" onMouseDown={event => event.stopPropagation()} aria-label="Account settings"><header><h2>Account settings</h2><button className="plain-icon" onClick={onClose} aria-label="Close settings"><X /></button></header><section className="profile-photo-card"><div className="photo-row"><div className="profile-photo">{avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <span>{email.slice(0,1).toUpperCase()}</span>}</div><div><h3>Profile photo</h3><p>JPG, PNG, or WebP · up to 5 MB</p></div></div><label className="photo-picker">Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadPhoto(event.target.files?.[0])} disabled={saving} /></label>{avatarPath && <button className="remove-photo" onClick={() => void removePhoto()} disabled={saving}>Remove</button>}</section><section className="signed-in-card"><b>Signed in as</b><span>{session.user.email}</span></section><section className="email-report-card"><Bell /><div><h3>Email due reports</h3><p>Send a branded report to {session.user.email} 15 days before a due date and 3 days after it becomes overdue.</p></div><label className="toggle full-toggle"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} disabled={!loaded || saving} /><span>{enabled ? 'Enabled' : 'Paused'}</span></label><button className="primary" onClick={saveNotifications} disabled={!loaded || saving}>Save email preference</button></section><form className="personal-card" onSubmit={savePersonalInformation}><header><div><h3>Personal information</h3><p>Optional — add only the details you want to keep.</p></div><span>PRIVATE</span></header><div className="personal-grid"><label>First name (optional)<input value={profile.first_name} onChange={event => updateProfile('first_name', event.target.value)} placeholder="First name" /></label><label>Surname (optional)<input value={profile.surname} onChange={event => updateProfile('surname', event.target.value)} placeholder="Surname" /></label></div><label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} required /><small>Changing this may require confirmation through your current and new email inboxes.</small></label><label>Mobile number (optional)<input value={profile.mobile_number} onChange={event => updateProfile('mobile_number', event.target.value)} placeholder="e.g. +63 917 123 4567" /></label><div className="address-heading"><b>Address</b><span>All fields optional</span></div><label>House or unit number<input value={profile.house_unit} onChange={event => updateProfile('house_unit', event.target.value)} placeholder="e.g. 123 or Unit 4B" /></label><label>Street / barangay<input value={profile.street_barangay} onChange={event => updateProfile('street_barangay', event.target.value)} placeholder="Street and barangay" /></label><label>City or municipality<input value={profile.city_municipality} onChange={event => updateProfile('city_municipality', event.target.value)} placeholder="City or municipality" /></label><div className="personal-grid"><label>Province<input value={profile.province} onChange={event => updateProfile('province', event.target.value)} placeholder="Province" /></label><label>Country<input value={profile.country} onChange={event => updateProfile('country', event.target.value)} placeholder="e.g. Philippines" /></label></div><label>ZIP code<input value={profile.zip_code} onChange={event => updateProfile('zip_code', event.target.value)} placeholder="ZIP code" /></label><button className="workspace-primary" disabled={saving}>{saving ? 'Saving…' : 'Save personal information'}</button></form><nav className="settings-menu"><button>Refer a friend <span>›</span></button><button onClick={() => void restartTutorial()}>Restart getting-started tutorial <span>›</span></button><a href="/help">Help Center <span>›</span></a><a href="/privacy">Privacy Policy <span>›</span></a><a href="/terms">Terms of Service <span>›</span></a><a href="mailto:support@pinoypocketbudget.app">Contact support <span>›</span></a></nav><button className="sign-out-button" onClick={() => supabase.auth.signOut()}><LogOut /> Sign out</button><section className="settings-danger"><span className="eyebrow">DANGER ZONE</span><h3>Delete your account</h3><p>This permanently removes your profile, transactions, loans, credit cards, and sign-in access.</p><label>Type DELETE to confirm<input value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label><button className="danger-button" disabled={confirmation !== 'DELETE' || saving} onClick={deleteAccount}><Trash2 /> Delete account</button></section>{message && <p className="message sticky-message" role="status">{message}</p>}</section></div>
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

const tutorialSteps = [
  { title: 'Welcome to Pinoy Pocket Budget', body: 'Set up your money sources before recording transactions so every balance, debt, due date, and projection stays accurate.', points: ['This guide takes about 3 minutes.', 'Nothing is added until you save a form.', 'You can restart this tutorial from Account settings.'] },
  { title: '1. Add Accounts and Cash', body: 'Start with every bank, digital wallet, and Cash on Hand balance you currently use.', points: ['Tap Add account on Home.', 'Choose the provider and enter an account nickname.', 'Enter only the money currently available in that account.'] },
  { title: '2. Add credit cards and loans', body: 'Open Debts and add each credit card and loan before recording purchases or repayments.', points: ['For cards, enter the limit, current balance, statement day, and due day.', 'For loans, enter the original amount, remaining balance, monthly payment, and next due date.', 'These balances are liabilities and do not increase Total Available Funds.'] },
  { title: '3. Record income', body: 'Use Add income whenever money is received, then select exactly where the money was deposited.', points: ['Choose the receiving bank, wallet, or Cash on Hand.', 'Optionally allocate part of the income to savings.', 'Income increases the selected account and Total Available Funds.'] },
  { title: '4. Record an expense', body: 'Select the account charged first, then enter the amount, category, description, and transaction date.', points: ['Bank, wallet, and cash expenses reduce Total Available Funds.', 'Credit-card purchases increase card utilization but do not reduce cash yet.', 'Use a due date for non-card bills when you want them included in reminders.'] },
  { title: '5. Recurring and installment transactions', body: 'Choose Monthly, Quarterly, or Annually for repeating expenses. Credit-card installments use a start date and 1–60 monthly payments.', points: ['Recurring schedules create dated transactions automatically.', 'Enter the monthly repayment amount for an installment—not the full purchase total.', 'Future occurrences appear in the disposable-income projection.'] },
  { title: '6. Record debt payments', body: 'Pay from the Loans or Credit Cards overview, or record a Bills Payment and link it to the correct debt.', points: ['Select the bank, wallet, or cash account used for payment.', 'Partial payments reduce the remaining due; full payments clear the notice.', 'Repayments reduce cash and debt but are not counted again as ordinary spending.'] },
  { title: '7. Review and maintain your records', body: 'Recent Activity shows the latest four entries. Open Activity to search, filter dates, view all transactions, and edit or delete entries.', points: ['Red means money going out; green means money coming in.', 'Check the synchronization notice on Home for accounting issues.', 'Review the disposable-income projection before upcoming due dates.'] },
]

function GettingStarted({ onClose, onFinish }: { onClose(): void; onFinish(): void }) {
  const [step, setStep] = useState(0)
  const item = tutorialSteps[step]
  return <div className="modal-backdrop tutorial-backdrop" onMouseDown={onClose}><section className="tutorial-card" onMouseDown={event => event.stopPropagation()} aria-label="Getting started tutorial"><header><h2>Getting started</h2><button className="plain-icon" onClick={onClose} aria-label="Close tutorial"><X /></button></header><div className="tutorial-progress" aria-label={`Step ${step + 1} of 8`}>{tutorialSteps.map((_, index) => <span className={index <= step ? 'complete' : ''} key={index} />)}</div><span className="eyebrow">STEP {step + 1} OF 8</span><div className="tutorial-icon">{step === 2 || step === 6 ? <CreditCard /> : step === 3 ? <ArrowDownCircle /> : step === 4 ? <ArrowUpCircle /> : <List />}</div><h3>{item.title}</h3><p>{item.body}</p><ul>{item.points.map(point => <li key={point}>✓ <span>{point}</span></li>)}</ul><div className="tutorial-actions">{step > 0 && <button className="secondary" onClick={() => setStep(value => value - 1)}>Back</button>}<button className="workspace-primary" onClick={() => step === 7 ? onFinish() : setStep(value => value + 1)}>{step === 7 ? 'Finish and add my first account' : 'Next'}</button></div><button className="skip-link" onClick={onClose}>Skip tutorial</button></section></div>
}

function AddDebtForm({ session, type, onClose, onSaved }: { session: Session; type: DebtType; onClose(): void; onSaved(): Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState<Record<string, string>>({ due: today(), statement_day: '1', due_day: '1' })
  const change = (key: string, value: string) => setValues(current => ({ ...current, [key]: value }))
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    const saveResult = type === 'loan'
      ? await supabase.from('loans').insert({ user_id: session.user.id, name: values.name, lender: values.provider, original: Number(values.original), balance: Number(values.balance), monthly: Number(values.monthly), due: values.due })
      : await supabase.from('credit_cards').insert({ user_id: session.user.id, name: values.name, issuer: values.provider, credit_limit: Number(values.credit_limit), current_balance: Number(values.balance), statement_balance: Number(values.statement_balance || values.balance || 0), minimum_payment: Number(values.minimum_payment), statement_day: Number(values.statement_day), due_day: Number(values.due_day) })
    const saveError = saveResult.error
    if (saveError) { setError(saveError.message); setBusy(false); return }
    await onSaved(); onClose()
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal creation-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}><header><h2>{type === 'loan' ? 'Add a loan' : 'Add a credit card'}</h2><button type="button" className="plain-icon" onClick={onClose}><X /></button></header><label>{type === 'loan' ? 'Loan name' : 'Card name'}<input value={values.name || ''} onChange={e => change('name', e.target.value)} placeholder={type === 'loan' ? 'e.g. Car loan' : 'e.g. Rewards Visa'} required /></label><label>{type === 'loan' ? 'Lender' : 'Card issuer'}<input value={values.provider || ''} onChange={e => change('provider', e.target.value)} placeholder={type === 'loan' ? 'Bank or lender' : 'Bank or card company'} required /></label><div className="field-grid">{type === 'loan' ? <><label>Original amount<input type="number" min="0" step="0.01" value={values.original || ''} onChange={e => change('original', e.target.value)} required /></label><label>Current balance<input type="number" min="0" step="0.01" value={values.balance || ''} onChange={e => change('balance', e.target.value)} required /></label><label>Monthly payment<input type="number" min="0" step="0.01" value={values.monthly || ''} onChange={e => change('monthly', e.target.value)} required /></label><label>Next due date<input type="date" value={values.due} onChange={e => change('due', e.target.value)} required /></label></> : <><label>Credit limit<input type="number" min="0" step="0.01" value={values.credit_limit || ''} onChange={e => change('credit_limit', e.target.value)} required /></label><label>Current balance<input type="number" min="0" step="0.01" value={values.balance || ''} onChange={e => change('balance', e.target.value)} required /></label><label>Statement balance<input type="number" min="0" step="0.01" value={values.statement_balance || ''} onChange={e => change('statement_balance', e.target.value)} required /></label><label>Minimum payment<input type="number" min="0" step="0.01" value={values.minimum_payment || ''} onChange={e => change('minimum_payment', e.target.value)} required /></label><label>Statement day<input type="number" min="1" max="31" value={values.statement_day} onChange={e => change('statement_day', e.target.value)} required /></label><label>Payment due day<input type="number" min="1" max="31" value={values.due_day} onChange={e => change('due_day', e.target.value)} required /></label></>}</div>{error && <p className="form-error">{error}</p>}<button className="workspace-primary" disabled={busy}>{busy ? 'Saving…' : type === 'loan' ? 'Save loan' : 'Save credit card'}</button></form></div>
}

function AddAccountForm({ session, onClose, onSaved }: { session: Session; onClose(): void; onSaved(): Promise<void> }) {
  const [accountType, setAccountType] = useState<'bank_wallet' | 'cash_on_hand'>('bank_wallet')
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('')
  const [balance, setBalance] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    const { error: saveError } = await supabase.from('budget_accounts').insert({ user_id: session.user.id, account_type: accountType, name: name.trim(), provider: accountType === 'cash_on_hand' ? 'Cash on Hand' : provider.trim(), available_balance: Number(balance), protected_balance: 0, savings_balance: 0, color_key: accountType === 'cash_on_hand' ? 'gold' : 'emerald' })
    if (saveError) { setError(saveError.message); setBusy(false); return }
    await onSaved(); onClose()
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal creation-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}><header><h2>Add account</h2><button type="button" className="plain-icon" onClick={onClose}><X /></button></header><label>Account type<select value={accountType} onChange={event => setAccountType(event.target.value as 'bank_wallet' | 'cash_on_hand')}><option value="bank_wallet">Bank or digital wallet</option><option value="cash_on_hand">Cash on Hand</option></select></label><label>Account name<input value={name} onChange={event => setName(event.target.value)} placeholder={accountType === 'cash_on_hand' ? 'e.g. Everyday cash' : 'e.g. Emergency Savings'} maxLength={80} required /></label>{accountType === 'bank_wallet' && <label>Bank or wallet<input value={provider} onChange={event => setProvider(event.target.value)} placeholder="e.g. BDO, BPI, Maya" maxLength={80} required /><small>Select a listed provider for easier identification, or type another provider.</small></label>}<label>Available balance<input type="number" min="0" step="0.01" value={balance} onChange={event => setBalance(event.target.value)} placeholder="₱ 0.00" required /><small>This opening balance is included in Total Available Funds and is not counted as income.</small></label>{error && <p className="form-error">{error}</p>}<button className="workspace-primary" disabled={busy}>{busy ? 'Saving…' : 'Add account and balance'}</button></form></div>
}

function LegacyDashboard({ session }: { session: Session }) {
  const [tx, setTx] = useState<Tx[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [accounts, setAccounts] = useState<BudgetAccount[]>([])
  const [avatarUrl, setAvatarUrl] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<{ debt: Debt; action: DebtAction } | null>(null)
  const [kind, setKind] = useState<Kind>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [note, setNote] = useState('')
  const [loadError, setLoadError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  return <div className="shell"><header><div><span className="eyebrow">MAGANDANG ARAW</span><h1>My Budget</h1></div><button className="icon" onClick={() => setSettingsOpen(true)} title="Account settings"><Settings /></button></header><main className="content">{loadError && <div className="notice" role="alert">Could not load all budget data: {loadError}</div>}<section className="balance"><span>Income balance</span><strong>{peso.format(totals.balance)}</strong><small>Income minus expenses</small></section><section className="metrics"><article><ArrowUpCircle /><span>Income</span><strong>{peso.format(totals.income)}</strong></article><article><ArrowDownCircle /><span>Expenses</span><strong>{peso.format(totals.expense)}</strong></article><article><WalletCards /><span>Total debt</span><strong>{peso.format(totals.debt)}</strong></article></section><section className="section-title"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Transactions</h2></div><button className="primary compact" onClick={() => setOpen(true)}><Plus /> Add</button></section><section className="list">{tx.length ? tx.map(item => <article key={item.id}><div className={`tx-icon ${item.kind}`}>{item.kind === 'income' ? <ArrowUpCircle /> : <ArrowDownCircle />}</div><div><strong>{item.note || item.category}</strong><span>{item.category} · {new Date(`${item.date}T00:00:00`).toLocaleDateString('en-PH')}</span></div><b className={item.kind}>{item.kind === 'income' ? '+' : '−'}{peso.format(Number(item.amount))}</b></article>) : <div className="empty">No transactions yet. Add your first income or expense.</div>}</section><section className="section-title"><div><span className="eyebrow">WHAT YOU OWE</span><h2>Loans & credit cards</h2></div></section><section className="list debt-list">{debts.length ? debts.map(debt => <article key={`${debt.debtType}-${debt.id}`}><div className="tx-icon debt"><CreditCard /></div><div><strong>{debt.name}</strong><span>{debt.provider} · Due {new Date(`${debt.dueDate}T00:00:00`).toLocaleDateString('en-PH')}</span></div><b>{peso.format(debt.balance)}</b><div className="debt-actions"><button className="action payment" onClick={() => setSelectedDebt({ debt, action: 'payment' })}>Pay</button><button className="action" onClick={() => setSelectedDebt({ debt, action: 'adjustment' })}><ReceiptText /> Adjust</button></div></article>) : <div className="empty">Your loan and credit-card overview will appear here.</div>}</section></main>{open && <div className="modal-backdrop" onMouseDown={() => setOpen(false)}><form className="modal" onSubmit={add} onMouseDown={e => e.stopPropagation()}><h2>Add transaction</h2><div className="segmented"><button type="button" className={kind === 'expense' ? 'active' : ''} onClick={() => setKind('expense')}>Expense</button><button type="button" className={kind === 'income' ? 'active' : ''} onClick={() => setKind('income')}>Income</button></div><label>Amount<input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{['Food', 'Bills', 'Transport', 'Shopping', 'Salary', 'Freelance', 'Other'].map(item => <option key={item}>{item}</option>)}</select></label><label>Note<textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></label><button className="primary">Save transaction</button><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button></form></div>}{settingsOpen && <AccountSettings session={session} onClose={() => setSettingsOpen(false)} onRestartTutorial={() => undefined} />}{selectedDebt && <DebtActionForm session={session} debt={selectedDebt.debt} action={selectedDebt.action} onClose={() => setSelectedDebt(null)} onSaved={load} />}</div>
}

function Dashboard({ session }: { session: Session }) {
  const [page, setPage] = useState<WorkspacePage>('overview')
  const [tx, setTx] = useState<Tx[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [accounts, setAccounts] = useState<BudgetAccount[]>([])
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loadError, setLoadError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [remindersOpen, setRemindersOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(() => localStorage.getItem('ppb-tutorial-seen') !== 'true')
  const [transactionOpen, setTransactionOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [debtForm, setDebtForm] = useState<DebtType | null>(null)
  const [selectedDebt, setSelectedDebt] = useState<{ debt: Debt; action: DebtAction } | null>(null)
  const [kind, setKind] = useState<Kind>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [note, setNote] = useState('')
  const [transactionDate, setTransactionDate] = useState(today())
  const [sourceKey, setSourceKey] = useState('')
  const [savingsAmount, setSavingsAmount] = useState('0')
  const [dueDate, setDueDate] = useState('')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [debtTab, setDebtTab] = useState<DebtType>('loan')

  async function load() {
    const [t, l, c, a, p] = await Promise.all([
      supabase.from('transactions').select('id,kind,amount,category,note,date').order('date', { ascending: false }).limit(200),
      supabase.from('loans').select('id,name,lender,balance,monthly,due').order('created_at', { ascending: false }),
      supabase.from('credit_cards').select('id,name,issuer,current_balance,minimum_payment,due_day').order('created_at', { ascending: false }),
      supabase.from('budget_accounts').select('id,account_type,name,provider,available_balance,protected_balance,savings_balance,color_key').order('created_at', { ascending: true }),
      supabase.from('user_profiles').select('tutorial_completed_at,avatar_path').eq('user_id', session.user.id).maybeSingle(),
    ])
    const firstError = t.error || l.error || c.error || a.error || p.error
    setLoadError(firstError?.message || '')
    setTx((t.data || []) as Tx[]); setLoans((l.data || []) as Loan[]); setCards((c.data || []) as Card[]); setAccounts((a.data || []) as BudgetAccount[])
    if (p.data?.tutorial_completed_at) {
      localStorage.setItem('ppb-tutorial-seen', 'true')
      setTutorialOpen(false)
    }
    if (p.data?.avatar_path) {
      const { data } = await supabase.storage.from('profile-photos').createSignedUrl(p.data.avatar_path, 3600)
      setAvatarUrl(data?.signedUrl || '')
    } else setAvatarUrl('')
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
  const accountTotals = useMemo(() => ({
    available: accounts.reduce((sum, item) => sum + Number(item.available_balance), 0),
    protected: accounts.reduce((sum, item) => sum + Number(item.protected_balance), 0),
    savings: accounts.reduce((sum, item) => sum + Number(item.savings_balance), 0),
  }), [accounts])
  const filteredTx = useMemo(() => tx.filter(item => {
    const words = `${item.note} ${item.category}`.toLowerCase()
    return words.includes(search.toLowerCase()) && (!fromDate || item.date >= fromDate) && (!toDate || item.date <= toDate)
  }), [tx, search, fromDate, toDate])

  async function addTransaction(event: FormEvent) {
    event.preventDefault()
    const [sourceType, sourceId] = sourceKey.split(':')
    const { error } = await supabase.rpc('record_budget_transaction', { p_transaction_id: newTransactionId(), p_kind: kind, p_amount: Number(amount), p_category: category, p_note: note, p_transaction_date: transactionDate, p_account_id: sourceType === 'account' ? Number(sourceId) : null, p_credit_card_id: sourceType === 'card' ? Number(sourceId) : null, p_savings_amount: kind === 'income' ? Number(savingsAmount || 0) : 0, p_due_date: kind === 'expense' && dueDate ? dueDate : null })
    if (error) return alert(error.message)
    setAmount(''); setNote(''); setSavingsAmount('0'); setDueDate(''); setTransactionOpen(false); await load()
  }
  async function completeTutorial() {
    localStorage.setItem('ppb-tutorial-seen', 'true')
    setTutorialOpen(false)
    setPage('overview')
    await supabase.from('user_profiles').upsert({ user_id: session.user.id, tutorial_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  }
  function go(next: WorkspacePage) { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const pageTitle = page === 'overview' ? 'Your money, made clear' : page === 'activity' ? 'Your activity' : page === 'debts' ? 'Debt tracker' : 'Pinoy Pocket Budget Premium'
  const nav = [{ id: 'overview' as const, label: 'Overview', icon: Home }, { id: 'activity' as const, label: 'Activity', icon: Menu }, { id: 'debts' as const, label: 'Debts', icon: CreditCard }, { id: 'premium' as const, label: 'Premium', icon: Star }]

  const launchBanner = <aside className="launch-banner"><div><strong>Public launch upgrade underway</strong><span>Account sign-up, secure cloud sync, and payments will activate after final service verification.</span></div><button onClick={() => go('premium')}>View plans</button></aside>
  const transactionList = (items: Tx[]) => <section className="workspace-card transaction-list">{items.length ? items.map(item => <article key={item.id}><div className={`tx-icon ${item.kind}`}>{item.kind === 'income' ? <ArrowDownCircle /> : <ArrowUpCircle />}</div><div><strong>{item.note || item.category}</strong><span>{item.category} · {new Date(`${item.date}T00:00:00`).toLocaleDateString('en-PH')}</span></div><b className={item.kind}>{item.kind === 'income' ? '+' : '−'}{peso.format(Number(item.amount))}</b></article>) : <div className="workspace-empty">No transactions found.</div>}</section>

  return <div className="workspace-shell"><aside className="workspace-sidebar"><div className="workspace-logo">₱</div>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => go(item.id)}><Icon /><span>{item.label}</span></button> })}</aside><div className="workspace-body"><header className="workspace-header"><div><span className="eyebrow">PINOY POCKET BUDGET</span><h1>{pageTitle}</h1></div><div className="header-actions"><button className="refer-button"><Share2 /> <span>Refer a friend</span></button><button className="round-button" onClick={() => setRemindersOpen(true)} aria-label="Due date reminders"><Bell /></button><button className={`avatar-button ${avatarUrl ? 'has-photo' : ''}`} onClick={() => setSettingsOpen(true)} aria-label="Account settings">{avatarUrl ? <img src={avatarUrl} alt="Profile" /> : session.user.email?.slice(0, 1).toUpperCase()}</button></div></header><main className="workspace-main">{loadError && <div className="notice">Could not load all budget data: {loadError}</div>}{page !== 'premium' && launchBanner}

  {page === 'overview' && <><section className="funds-grid"><article className="funds-card"><span>Total Available Funds</span><strong>{peso.format(accountTotals.available)}</strong><p>Cash currently available across your accounts</p><small>Protected maintaining balances <b>{peso.format(accountTotals.protected)}</b></small><small>Safe to spend <b>{peso.format(accountTotals.available - accountTotals.protected - accountTotals.savings)}</b></small></article><article className="savings-card"><span>Savings</span><strong>{peso.format(accountTotals.savings)}</strong><p>Current reserved savings</p></article></section><section className="quick-actions"><button onClick={() => { setKind('income'); setSourceKey(accounts[0] ? `account:${accounts[0].id}` : ''); setTransactionOpen(true) }}><ArrowDownCircle /><span><b>Add income</b><small>Money coming in</small></span></button><button onClick={() => { setKind('expense'); setSourceKey(accounts[0] ? `account:${accounts[0].id}` : cards[0] ? `card:${cards[0].id}` : ''); setTransactionOpen(true) }}><ArrowUpCircle /><span><b>Add expense</b><small>Money going out</small></span></button><button onClick={() => setAccountOpen(true)}><Landmark /><span><b>Add account</b><small>Initial funds available</small></span></button><button onClick={() => setDebtForm('loan')}><CreditCard /><span><b>Add loan</b><small>Track a balance</small></span></button></section><aside className="setup-banner"><div><b>Finish setting up Pinoy Pocket Budget</b><span>Continue the guided setup to keep every balance accurate.</span></div><button onClick={() => setTutorialOpen(true)}>Continue tutorial</button></aside><aside className="sync-banner"><ShieldCheck /><div><b>Accounts synchronized</b><span>No broken account links, duplicate schedules, or invalid debt balances detected.</span></div></aside><section className="workspace-card accounts-card"><header><div><span className="eyebrow">AVAILABLE FUNDS</span><h2>Accounts</h2></div><button onClick={() => setAccountOpen(true)}><Plus /> Add account</button></header>{accounts.length ? <div className="account-list">{accounts.map(account => <article key={account.id}><div><b>{account.name}</b><span>{account.provider}</span></div><strong>{peso.format(Number(account.available_balance))}</strong></article>)}</div> : <p>Add your first bank, wallet, or Cash on Hand account to include its balance in Total Available Funds.</p>}</section><section className="workspace-card projection-card"><div><span className="eyebrow">CUSTOM PERIOD</span><h2>Disposable income projection</h2><p>See what may remain after upcoming and recurring expenses, including scheduled loan payments.</p><label>Project through<input type="date" defaultValue={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10)} /></label></div><aside><span className="eyebrow">PROJECTED DISPOSABLE INCOME</span><strong>{peso.format(accountTotals.available - accountTotals.protected - accountTotals.savings)}</strong><small>Upcoming & recurring expenses <b>−{peso.format(0)}</b></small><button>View included expense details</button></aside></section><section className="overview-columns"><article className="workspace-card"><span className="eyebrow">THIS MONTH</span><h2>Spending by category</h2><div className="workspace-empty">{totals.expense ? `${peso.format(totals.expense)} recorded` : 'No expenses recorded this month.'}</div></article><article className="workspace-card"><span className="eyebrow">DEBT OVERVIEW</span><h2>Loans and cards</h2><div className="debt-summary"><span>Loan overview <b>{peso.format(loans.reduce((sum, item) => sum + Number(item.balance), 0))}</b></span><span>Credit-card overview <b>{peso.format(cards.reduce((sum, item) => sum + Number(item.current_balance), 0))}</b></span></div></article></section><section className="section-heading"><div><span className="eyebrow">MONEY MOVEMENT</span><h2>Recent activity</h2></div></section>{transactionList(tx.slice(0, 4))}<button className="text-link" onClick={() => go('activity')}>View all transactions <ArrowRight /></button></>}

  {page === 'activity' && <><section className="activity-toolbar"><label><Search /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions" /></label><button className="workspace-primary compact" onClick={() => setTransactionOpen(true)}><Plus /> Add</button></section><section className="workspace-card date-filter"><b>TRANSACTION DATE</b><label>From<input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></label><label>To<input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></label><span>{filteredTx.length} transactions</span></section><section className="activity-totals"><article><span>Income</span><strong>{peso.format(totals.income)}</strong></article><article><span>Expenses</span><strong className="expense">{peso.format(totals.expense)}</strong></article><article><span>Current total available funds</span><strong>{peso.format(totals.balance)}</strong></article></section><section className="section-heading"><div><span className="eyebrow">MONEY MOVEMENT</span><h2>All transactions</h2></div></section>{transactionList(filteredTx)}</>}

  {page === 'debts' && <><div className="debt-tabs"><button className={debtTab === 'loan' ? 'active' : ''} onClick={() => setDebtTab('loan')}>Loans</button><button className={debtTab === 'credit_card' ? 'active' : ''} onClick={() => setDebtTab('credit_card')}>Credit cards</button></div><section className="debt-toolbar"><p>{debtTab === 'loan' ? 'Track installment loans and celebrate every payment.' : 'Monitor balances, payment dates, and credit utilization.'}</p><button className="workspace-primary compact" onClick={() => setDebtForm(debtTab)}><Plus /> {debtTab === 'loan' ? 'Add loan' : 'Add card'}</button></section>{debtTab === 'credit_card' && <aside className="launch-banner card-note"><span><b>Recording a card payment:</b> add an expense under Bills Payment, connect it to this card, then confirm it here to update the card balance.</span></aside>}<section className="debt-workspace">{debts.filter(item => item.debtType === debtTab).length ? debts.filter(item => item.debtType === debtTab).map(debt => <article className="workspace-card debt-card" key={`${debt.debtType}-${debt.id}`}><div><span>{debt.provider}</span><h3>{debt.name}</h3><strong>{peso.format(debt.balance)}</strong><small>Due {new Date(`${debt.dueDate}T00:00:00`).toLocaleDateString('en-PH')}</small></div><div><button onClick={() => setSelectedDebt({ debt, action: 'payment' })}>Record payment</button><button onClick={() => setSelectedDebt({ debt, action: 'adjustment' })}>Adjust balance</button></div></article>) : <div className="workspace-empty">No {debtTab === 'loan' ? 'loans' : 'credit cards'} added yet.</div>}</section></>}

  {page === 'premium' && <section className="premium-page"><div className="premium-hero"><div className="premium-star"><Star /></div><span className="eyebrow">SIMPLE, SECURE, UNLIMITED</span><h2>Build better money habits without complicated spreadsheets.</h2><p>Upgrade for unlimited transactions and loans, cloud backup, recurring entries, complete reports, and future premium tools.</p></div><div className="plans">{[{ name: 'Monthly', price: '₱99', term: 'every month' }, { name: 'Quarterly', price: '₱249', term: 'every 3 months', badge: 'Save ₱48' }, { name: 'Annual', price: '₱799', term: 'every year', badge: 'Best value · Save ₱389' }].map(plan => <article className={`workspace-card ${plan.name === 'Annual' ? 'featured' : ''}`} key={plan.name}><header><b>{plan.name}</b>{plan.badge && <span>{plan.badge}</span>}</header><strong>{plan.price}</strong><small>{plan.term}</small><ul><li>✓ Unlimited transactions</li><li>✓ Unlimited loan tracking</li><li>✓ Cloud backup and sync</li><li>✓ Advanced monthly reports</li></ul><button disabled title="Payments activate after final service verification">Choose {plan.name}</button></article>)}</div><p className="pricing-note">Prices are in Philippine pesos. Payment checkout is temporarily unavailable during final service verification.</p></section>}
  </main><footer className="workspace-footer">© 2026 Pinoy Pocket Budget <a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a><a href="mailto:support@pinoypocketbudget.app">Support</a></footer></div><nav className="mobile-nav">{nav.slice(0, 3).map(item => { const Icon = item.icon; return <button className={page === item.id ? 'active' : ''} onClick={() => go(item.id)} key={item.id}><Icon /><span>{item.label}</span></button> })}<button className="mobile-add" onClick={() => setTransactionOpen(true)}><Plus /></button><button className={page === 'premium' ? 'active' : ''} onClick={() => go('premium')}><Star /><span>Premium</span></button></nav>

  {transactionOpen && <div className="modal-backdrop" onMouseDown={() => setTransactionOpen(false)}><form className="modal creation-modal" onSubmit={addTransaction} onMouseDown={e => e.stopPropagation()}><header><h2>Add transaction</h2><button type="button" className="plain-icon" onClick={() => setTransactionOpen(false)}><X /></button></header><div className="segmented"><button type="button" className={kind === 'expense' ? 'active' : ''} onClick={() => { setKind('expense'); setCategory('Food'); setSavingsAmount('0') }}>Expense</button><button type="button" className={kind === 'income' ? 'active' : ''} onClick={() => { setKind('income'); setCategory('Salary'); if (sourceKey.startsWith('card:')) setSourceKey(accounts[0] ? `account:${accounts[0].id}` : '') }}>Income</button></div><label>{kind === 'income' ? 'Add income to' : 'Account to use'}<select value={sourceKey} onChange={event => setSourceKey(event.target.value)} required><option value="">Select {kind === 'income' ? 'where the income is kept' : 'an account or credit card'}</option>{accounts.map(account => <option value={`account:${account.id}`} key={`account-${account.id}`}>{account.name} · {peso.format(Number(account.available_balance))}</option>)}{kind === 'expense' && cards.map(card => <option value={`card:${card.id}`} key={`card-${card.id}`}>{card.name} credit card</option>)}</select></label><label>Amount<input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₱ 0.00" required /></label>{kind === 'income' && <label>Savings allocation (optional)<input type="number" min="0" max={amount || undefined} step="0.01" value={savingsAmount} onChange={event => setSavingsAmount(event.target.value)} placeholder="₱ 0.00" /></label>}<label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{(kind === 'income' ? ['Salary', 'Freelance', 'Business', 'Other'] : ['Food', 'Bills Payment', 'Transport', 'Shopping', 'Health', 'Other']).map(item => <option key={item}>{item}</option>)}</select></label>{kind === 'expense' && <label>Due date (optional)<input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /><small>Upcoming dues appear in reminders and disposable-income projections.</small></label>}<label>Description<input value={note} onChange={e => setNote(e.target.value)} placeholder="What was this for?" /></label><label>Transaction date<input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} required /></label><button className="workspace-primary">Save {kind}</button></form></div>}
  {debtForm && <AddDebtForm session={session} type={debtForm} onClose={() => setDebtForm(null)} onSaved={load} />}
  {accountOpen && <AddAccountForm session={session} onClose={() => setAccountOpen(false)} onSaved={load} />}
  {selectedDebt && <DebtActionForm session={session} debt={selectedDebt.debt} action={selectedDebt.action} onClose={() => setSelectedDebt(null)} onSaved={load} />}
  {settingsOpen && <AccountSettings session={session} onClose={() => setSettingsOpen(false)} onRestartTutorial={() => setTutorialOpen(true)} onAvatarChange={setAvatarUrl} />}
  {tutorialOpen && <GettingStarted onClose={completeTutorial} onFinish={completeTutorial} />}
  {remindersOpen && <div className="modal-backdrop" onMouseDown={() => setRemindersOpen(false)}><section className="modal reminder-modal" onMouseDown={e => e.stopPropagation()}><header><h2>Due date reminders</h2><button className="plain-icon" onClick={() => setRemindersOpen(false)}><X /></button></header><label>Show upcoming dues within<select defaultValue="7"><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option></select></label><div className="workspace-empty">You have no overdue or upcoming payments within the selected reminder period.</div><p>These reminders appear when you open Pinoy Pocket Budget. When email reports are enabled, reports are sent 15 days before a due date and again 3 days after an unpaid due date.</p></section></div>}
  </div>
}

export default function App() {
  const publicPage = window.location.pathname.slice(1)
  if (publicPage === 'help' || publicPage === 'privacy' || publicPage === 'terms') return <PublicPages page={publicPage} />
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
