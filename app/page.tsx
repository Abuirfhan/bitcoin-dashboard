'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

// ── Types ──────────────────────────────────────
interface Snapshot {
  recorded_at: string
  fee_fastest: number
  fee_half_hour: number
  fee_hour: number
  fee_economy: number
  tx_count: number
  mempool_size_mb: number
  block_height: number
  block_miner: string
  block_tx_count: number
  btc_price_usd: number
  sats_per_dollar: number
  hashrate_3d: number
  current_hashrate: number
  lightning_channels: number
  lightning_capacity_btc: number
  lightning_nodes: number
  pool_name_1: string
  pool_share_1: number
  pool_name_2: string
  pool_share_2: number
  pool_name_3: string
  pool_share_3: number
  btc_total_mined: number
  btc_remaining: number
  current_block_reward: number
  next_halving_block: number
  blocks_until_halving: number
  next_halving_reward: number
  epoch_progress: number
  avg_block_time_sec: number
  avg_fees_per_block: number
}

// ── Helpers ────────────────────────────────────
const fmt = (n: number, d = 0) =>
  n?.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '—'

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

const ORANGE = '#F7931A'
const BLUE   = '#3B82F6'
const GREEN  = '#22C55E'
const PURPLE = '#A855F7'
const GRAY   = '#6B7280'

// ── Stat Card ──────────────────────────────────
function StatCard({ title, value, sub, color = ORANGE }: {
  title: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ── Chart Card ─────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-300 text-sm font-semibold mb-4">{title}</p>
      {children}
    </div>
  )
}

// ── Main Page ──────────────────────────────────
export default function Home() {
  const [data, setData]       = useState<Snapshot[]>([])
  const [latest, setLatest]   = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  const fetchData = async () => {
    const { data: rows } = await supabase
      .from('mempool_snapshots')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(120)  // last 2 hours

    if (rows && rows.length > 0) {
      const sorted = [...rows].reverse()
      setData(sorted)
      setLatest(rows[0])
      setLastUpdate(new Date().toLocaleTimeString())
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl mb-4">₿</p>
        <p className="text-orange-400 text-xl font-bold animate-pulse">Loading Bitcoin data...</p>
      </div>
    </div>
  )

  // Chart data
  const chartData = data.map(d => ({
    time:       fmtTime(d.recorded_at),
    fastest:    d.fee_fastest,
    halfHour:   d.fee_half_hour,
    hour:       d.fee_hour,
    economy:    d.fee_economy,
    txCount:    d.tx_count,
    mempoolMb:  parseFloat((d.mempool_size_mb ?? 0).toFixed(2)),
    hashrate:   parseFloat((d.current_hashrate ?? 0).toFixed(2)),
    price:      d.btc_price_usd,
    channels:   d.lightning_channels,
    capacity:   parseFloat((d.lightning_capacity_btc ?? 0).toFixed(2)),
  }))

  const poolData = latest ? [
    { name: latest.pool_name_1, value: latest.pool_share_1 },
    { name: latest.pool_name_2, value: latest.pool_share_2 },
    { name: latest.pool_name_3, value: latest.pool_share_3 },
    { name: 'Others',           value: Math.max(0, 100 - (latest.pool_share_1 + latest.pool_share_2 + latest.pool_share_3)) },
  ] : []

  const POOL_COLORS = [ORANGE, BLUE, GREEN, GRAY]

  const supplyData = latest ? [
    { name: 'Mined', value: parseFloat(latest.btc_total_mined?.toFixed(0)) },
    { name: 'Remaining', value: parseFloat(latest.btc_remaining?.toFixed(0)) },
  ] : []

  const minedPct = latest ? ((latest.btc_total_mined / 21_000_000) * 100).toFixed(2) : '0'

  const avgBlockMin = latest
    ? `${Math.floor(latest.avg_block_time_sec / 60)}m ${Math.round(latest.avg_block_time_sec % 60)}s`
    : '—'

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">₿</span>
          <div>
            <h1 className="text-xl font-bold text-orange-400">Bitcoin Node Monitor</h1>
            <p className="text-gray-500 text-xs">Sovereign data • Updated every 60s</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">Last update</p>
          <p className="text-orange-400 text-sm font-mono">{lastUpdate}</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="BTC Price"
          value={`$${fmt(latest?.btc_price_usd ?? 0)}`}
          sub={`${fmt(latest?.sats_per_dollar ?? 0)} sats/$1`}
        />
        <StatCard
          title="Block Height"
          value={fmt(latest?.block_height ?? 0)}
          sub={latest?.block_miner ?? '—'}
          color={BLUE}
        />
        <StatCard
          title="Next Block Fee"
          value={`${latest?.fee_fastest ?? '—'} sat/vB`}
          sub={`Economy: ${latest?.fee_economy ?? '—'} sat/vB`}
          color={GREEN}
        />
        <StatCard
          title="Hashrate"
          value={`${fmt(latest?.current_hashrate ?? 0, 1)} EH/s`}
          sub="Current network power"
          color={PURPLE}
        />
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="Mempool"
          value={fmt(latest?.tx_count ?? 0)}
          sub="Pending transactions"
          color={ORANGE}
        />
        <StatCard
          title="Block Reward"
          value={`${latest?.current_block_reward ?? '—'} BTC`}
          sub={`Next: ${latest?.next_halving_reward ?? '—'} BTC`}
          color={BLUE}
        />
        <StatCard
          title="Avg Block Time"
          value={avgBlockMin}
          sub="Target: 10m 0s"
          color={GREEN}
        />
        <StatCard
          title="Epoch Progress"
          value={`${fmt(latest?.epoch_progress ?? 0, 1)}%`}
          sub={`${fmt(latest?.blocks_until_adjust ?? 0)} blocks left`}
          color={PURPLE}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ChartCard title="⚡ Fee Rates (sat/vB)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="fastest"  stroke={ORANGE} dot={false} name="Next Block" strokeWidth={2} />
              <Line type="monotone" dataKey="halfHour" stroke={BLUE}   dot={false} name="30 Min"     strokeWidth={1.5} />
              <Line type="monotone" dataKey="hour"     stroke={GREEN}  dot={false} name="1 Hour"     strokeWidth={1.5} />
              <Line type="monotone" dataKey="economy"  stroke={GRAY}   dot={false} name="Economy"    strokeWidth={1} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="📦 Mempool (Pending TXs)">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="txCount" stroke={ORANGE} fill="#F7931A22" name="Pending TXs" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ChartCard title="⛏️ Network Hashrate (EH/s)">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="hashrate" stroke={PURPLE} fill="#A855F722" name="Hashrate (EH/s)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="💰 BTC Price (USD)">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="price" stroke={GREEN} fill="#22C55E22" name="BTC Price ($)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ChartCard title="⚡ Lightning Network Channels">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="channels" stroke={BLUE} fill="#3B82F622" name="Channels" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="⛏️ Mining Pool Dominance (7d)">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={poolData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
                labelLine={false}
              >
                {poolData.map((_, i) => (
                  <Cell key={i} fill={POOL_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bitcoin Supply */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ChartCard title="₿ Bitcoin Supply">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="40%" height={160}>
              <PieChart>
                <Pie data={supplyData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                  <Cell fill={ORANGE} />
                  <Cell fill="#1F2937" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-gray-400 text-xs">Total Mined</p>
                <p className="text-orange-400 text-xl font-bold">{fmt(latest?.btc_total_mined ?? 0)} BTC</p>
                <p className="text-gray-500 text-xs">{minedPct}% of 21 million</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Remaining</p>
                <p className="text-blue-400 text-xl font-bold">{fmt(latest?.btc_remaining ?? 0)} BTC</p>
                <p className="text-gray-500 text-xs">Forever — no more after this</p>
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="🎯 Next Halving">
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">Next Halving Block</p>
              <p className="text-orange-400 font-bold">{fmt(latest?.next_halving_block ?? 0)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">Blocks Remaining</p>
              <p className="text-blue-400 font-bold">{fmt(latest?.blocks_until_halving ?? 0)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">Current Reward</p>
              <p className="text-green-400 font-bold">{latest?.current_block_reward ?? '—'} BTC</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">Reward After Halving</p>
              <p className="text-purple-400 font-bold">{latest?.next_halving_reward ?? '—'} BTC</p>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${latest?.epoch_progress ?? 0}%`,
                  backgroundColor: ORANGE
                }}
              />
            </div>
            <p className="text-gray-500 text-xs text-center">{fmt(latest?.epoch_progress ?? 0, 1)}% through current epoch</p>
          </div>
        </ChartCard>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-gray-600 text-xs">
        <p>Data sourced from your sovereign Bitcoin node • Powered by Umbrel • Not financial advice</p>
      </div>

    </main>
  )
}
