'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Plus, TrendingDown, AlertTriangle, Info, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const EXPENSE_CATEGORIES = [
  'Home care aide',
  'Facility cost',
  'Medication',
  'Transportation',
  'Medical copays',
  'Home modification',
  'Adult day program',
  'Other',
]

const INCOME_TYPES = [
  'Social Security',
  'Pension',
  'Investment income',
  'Long-term care insurance benefit',
  'VA benefit',
  'Rental income',
  'Other',
]

interface Expense {
  id: string
  category: string
  amount: number
  frequency: string
  isActive: boolean
  notes: string | null
}

interface Income {
  id: string
  sourceName: string
  sourceType: string
  monthlyAmount: number
  notes: string | null
}

function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly': return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'monthly': return amount
    case 'quarterly': return amount / 3
    case 'annually': return amount / 12
    default: return amount
  }
}

export default function FundingPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [liquidAssets, setLiquidAssets] = useState('')
  const [loading, setLoading] = useState(true)
  const [addingExpense, setAddingExpense] = useState(false)
  const [addingIncome, setAddingIncome] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', frequency: 'monthly', notes: '' })
  const [incomeForm, setIncomeForm] = useState({ sourceName: '', sourceType: '', monthlyAmount: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [expRes, incRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/income-offsets'),
      ])
      if (expRes.ok) setExpenses(await expRes.json())
      if (incRes.ok) setIncomes(await incRes.json())
      setLoading(false)
    }
    load()
  }, [])

  const totalMonthlyExpenses = expenses
    .filter((e) => e.isActive)
    .reduce((sum, e) => sum + toMonthly(e.amount, e.frequency), 0)

  const totalMonthlyIncome = incomes.reduce((sum, i) => sum + i.monthlyAmount, 0)
  const monthlyBurn = totalMonthlyExpenses - totalMonthlyIncome
  const assets = parseFloat(liquidAssets.replace(/[^0-9.]/g, '')) || 0
  const runwayMonths = monthlyBurn > 0 && assets > 0 ? Math.floor(assets / monthlyBurn) : null

  const handleAddExpense = async () => {
    if (!expenseForm.category || !expenseForm.amount) return
    setSubmitting(true)
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...expenseForm, amount: parseFloat(expenseForm.amount) }),
    })
    if (res.ok) {
      const exp = await res.json()
      setExpenses([...expenses, exp])
      setExpenseForm({ category: '', amount: '', frequency: 'monthly', notes: '' })
      setAddingExpense(false)
    }
    setSubmitting(false)
  }

  const handleDeleteExpense = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) setExpenses(expenses.filter((expense) => expense.id !== id))
  }

  const handleAddIncome = async () => {
    if (!incomeForm.sourceName || !incomeForm.monthlyAmount) return
    setSubmitting(true)
    const res = await fetch('/api/income-offsets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...incomeForm, monthlyAmount: parseFloat(incomeForm.monthlyAmount) }),
    })
    if (res.ok) {
      const inc = await res.json()
      setIncomes([...incomes, inc])
      setIncomeForm({ sourceName: '', sourceType: '', monthlyAmount: '', notes: '' })
      setAddingIncome(false)
    }
    setSubmitting(false)
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Funding"
        description="Track care costs and get a starter estimate of financial runway. This is an organizational tool, not financial advice."
      />

      {/* Summary row */}
      {(expenses.length > 0 || incomes.length > 0) && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Monthly care costs</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(totalMonthlyExpenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Monthly income/offsets</p>
              <p className="text-2xl font-bold text-green-600">{fmt(totalMonthlyIncome)}</p>
            </CardContent>
          </Card>
          <Card className={monthlyBurn > 0 ? 'border-amber-200' : ''}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Monthly net burn</p>
              <p className={cn('text-2xl font-bold', monthlyBurn > 0 ? 'text-amber-600' : 'text-green-600')}>
                {monthlyBurn > 0 ? fmt(monthlyBurn) : 'Income covers costs'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Runway estimate */}
      {monthlyBurn > 0 && (
        <Card className={cn('mb-6', runwayMonths !== null && runwayMonths < 6 ? 'border-red-200 bg-red-50' : runwayMonths !== null && runwayMonths < 12 ? 'border-amber-200 bg-amber-50' : '')}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <TrendingDown className={cn('h-5 w-5 mt-0.5 flex-shrink-0', runwayMonths !== null && runwayMonths < 6 ? 'text-red-500' : 'text-amber-500')} />
              <div className="flex-1">
                <h3 className="font-medium text-slate-900 mb-2">Funding Runway Estimate</h3>
                <div className="mb-3">
                  <label className="text-xs text-slate-500 mb-1 block">
                    Estimated accessible assets (savings, checking, investments — your estimate)
                  </label>
                  <Input
                    placeholder="e.g., 250000"
                    value={liquidAssets}
                    onChange={(e) => setLiquidAssets(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                {runwayMonths !== null && (
                  <div>
                    <p className={cn(
                      'text-lg font-semibold mb-1',
                      runwayMonths < 6 ? 'text-red-700' : runwayMonths < 12 ? 'text-amber-700' : 'text-slate-800'
                    )}>
                      Approximately {runwayMonths} months of runway at current burn rate
                    </p>
                    {runwayMonths < 6 && (
                      <div className="flex items-center gap-2 text-red-700 text-sm mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        Immediate financial planning attention may be warranted.
                      </div>
                    )}
                    {runwayMonths >= 6 && runwayMonths < 12 && (
                      <div className="flex items-center gap-2 text-amber-700 text-sm mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        Planning pressure is increasing. Consider discussing options with a financial planner.
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-start gap-2 text-xs text-slate-500 mt-3 bg-white/60 rounded p-2 border border-slate-200">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    This is an estimate for planning orientation only — not a financial projection, investment advice, or benefits calculation.
                    A financial advisor, elder law attorney, or geriatric care manager can help evaluate your options.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expenses */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Monthly Care Expenses</h2>
            <Button size="sm" onClick={() => setAddingExpense(true)} variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {addingExpense && (
            <Card className="mb-3 border-indigo-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Add Expense</h4>
                  <button onClick={() => setAddingExpense(false)}><X className="h-4 w-4 text-slate-400" /></button>
                </div>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Amount ($)"
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  />
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={expenseForm.frequency}
                    onChange={(e) => setExpenseForm({ ...expenseForm, frequency: e.target.value })}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
                <Input placeholder="Notes (optional)" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddExpense} disabled={submitting || !expenseForm.category || !expenseForm.amount}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingExpense(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {expenses.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">No expenses recorded yet</p>
              <Button size="sm" className="mt-3" onClick={() => setAddingExpense(true)}>Add first expense</Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {expenses.map((exp) => (
                <div key={exp.id} className={cn('flex items-center gap-3 p-3 bg-white', !exp.isActive && 'opacity-50')}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{exp.category}</p>
                    <p className="text-xs text-slate-500 capitalize">{exp.frequency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{fmt(exp.amount)}</p>
                    {exp.frequency !== 'monthly' && (
                      <p className="text-xs text-slate-400">{fmt(toMonthly(exp.amount, exp.frequency))}/mo</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="text-xs text-red-600 hover:underline"
                    aria-label={`Delete ${exp.category}`}
                  >
                    Delete
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-slate-50 font-medium">
                <span className="text-sm">Total monthly</span>
                <span className="text-sm">{fmt(totalMonthlyExpenses)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Income offsets */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Income & Offsets</h2>
            <Button size="sm" onClick={() => setAddingIncome(true)} variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {addingIncome && (
            <Card className="mb-3 border-green-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Add Income Source</h4>
                  <button onClick={() => setAddingIncome(false)}><X className="h-4 w-4 text-slate-400" /></button>
                </div>
                <Input placeholder="Source name (e.g., Social Security)" value={incomeForm.sourceName} onChange={(e) => setIncomeForm({ ...incomeForm, sourceName: e.target.value })} />
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={incomeForm.sourceType}
                  onChange={(e) => setIncomeForm({ ...incomeForm, sourceType: e.target.value })}
                >
                  <option value="">Select type</option>
                  {INCOME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <Input placeholder="Monthly amount ($)" type="number" value={incomeForm.monthlyAmount} onChange={(e) => setIncomeForm({ ...incomeForm, monthlyAmount: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddIncome} disabled={submitting || !incomeForm.sourceName || !incomeForm.monthlyAmount}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingIncome(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {incomes.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">No income sources recorded yet</p>
              <Button size="sm" className="mt-3" onClick={() => setAddingIncome(true)}>Add income source</Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {incomes.map((inc) => (
                <div key={inc.id} className="flex items-center gap-3 p-3 bg-white">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{inc.sourceName}</p>
                    <p className="text-xs text-slate-500">{inc.sourceType}</p>
                  </div>
                  <p className="text-sm font-medium text-green-700">{fmt(inc.monthlyAmount)}/mo</p>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-slate-50 font-medium">
                <span className="text-sm">Total monthly</span>
                <span className="text-sm text-green-700">{fmt(totalMonthlyIncome)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
