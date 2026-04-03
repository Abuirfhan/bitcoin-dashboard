'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

interface Snapshot {
  recorded_at: string
  fee_fastest: number
  fee_half_hour: number
  fee_hour: number
  fee_economy: number
  fee_minimum: number
  tx_count: number
  mempool_size_mb: number
  total_fees_btc: number
  block_height: number
  block_size_mb: number
  block_tx_count: number
  block_miner: string
  block_time: string
  btc_price_usd: number
  sats_per_dollar: number
  hashrate_3d: number
  hashrate_1w: number
  current_hashrate: number
  current_difficulty: number
  lightning_channels: number
  lightning_capacity_btc: number
  lightning_nodes: number
  lightning_tor_nodes: number
  lightning_clearnet_nodes: number
  next_block_fee: number
  second_block_fee: number
  third_block_fee: number
  pool_name_1: string
  pool_share_1: number
  pool_name_2: string
  pool_share_2: number
  pool_name_3: string
  pool_share_3: number
  epoch_progress: number
  blocks_until_adjust: number
  expected_blocks: number
  avg_block_time_sec: number
  prev_difficulty_change: number
  btc_total_mined: number
  btc_remaining: number
  current_block_reward: number
  next_halving_block: number
  blocks_until_halving: number
  next_halving_reward: number
  avg_fees_per_block: number
  difficulty: number
  estimated_retarget: number
}

interface BlockRow {
  block_height: number
  block_miner: string
  block_tx_count: number
  block_size_mb: number
  block_time: string
  total_fees_btc: number
}

const fmt = (n: number, d = 0) =>
  n?.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '—'

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const ORANGE = '#F7931A'
const BLUE   = '#3B82F6'
const GREEN  = '#22C55E'
const PURPLE = '#A855F7'
const RED    = '#EF4444'
const TEAL   = '#14B8A6'
const GRAY   = '#6B7280'

const TOOLTIP_STYLE = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#fff'
}

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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-300 text-sm font-semibold mb-4">{title}</p>
      {children}
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-gray-800" />
      <p className="text-orange-400 text-xs uppercase tracking-widest font-bold">{title}</p>
      <div className="h-px flex-1 bg-gray-800" />
    </div>
  )
}

export default function Home() {
  const [data, setData]       = useState<Snapshot[]>([])
  const [latest, setLatest]   = useState<Snapshot | null>(null)
  const [blocks, setBlocks]   = useState<BlockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  const fetchData = async () => {
    const { data: rows } = await supabase
      .from('mempool_snapshots')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(120)

    const { data: blockRows } = await supabase
      .from('mempool_snapshots')
      .select('block_height, block_miner, block_tx_count, block_size_mb, block_time, total_fees_btc')
      .order('block_height', { ascending: false })
      .limit(100)

    if (rows && rows.length > 0) {
      setData([...rows].reverse())
      setLatest(rows[0])
      setLastUpdate(new Date().toLocaleTimeString())
    }

    if (blockRows) {
      const seen = new Set()
      const unique = blockRows.filter(b => {
        if (!b.block_height || seen.has(b.block_height)) return false
        seen.add(b.block_height)
        return true
      }).slice(0, 10)
      setBlocks(unique)
    }

    setLoading(false)
  }

 useEffect(() => {
    // Check session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/login'
        return
      }
      fetchData()
    })

    // Also listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        window.location.href = '/login'
      }
    })

    const interval = setInterval(fetchData, 60000)
    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl mb-4">₿</p>
        <p className="text-orange-400 text-xl font-bold animate-pulse">Loading Bitcoin data...</p>
        <p className="text-gray-600 text-sm mt-2">Connecting to your node...</p>
      </div>
    </div>
  )

  const chartData = data.map(d => ({
    time:         fmtTime(d.recorded_at),
    fastest:      d.fee_fastest,
    halfHour:     d.fee_half_hour,
    hour:         d.fee_hour,
    economy:      d.fee_economy,
    txCount:      d.tx_count,
    mempoolMb:    parseFloat((d.mempool_size_mb ?? 0).toFixed(2)),
    hashrate:     parseFloat((d.current_hashrate ?? 0).toFixed(2)),
    hashrate3d:   parseFloat((d.hashrate_3d ?? 0).toFixed(2)),
    hashrate1w:   parseFloat((d.hashrate_1w ?? 0).toFixed(2)),
    price:        d.btc_price_usd,
    satsPerDollar: d.sats_per_dollar,
    channels:     d.lightning_channels,
    capacity:     parseFloat((d.lightning_capacity_btc ?? 0).toFixed(2)),
    torNodes:     d.lightning_tor_nodes,
    clearNodes:   d.lightning_clearnet_nodes,
    nextFee:      d.next_block_fee,
    secondFee:    d.second_block_fee,
    thirdFee:     d.third_block_fee,
    totalFees:    parseFloat((d.total_fees_btc ?? 0).toFixed(8)),
  }))

  const poolData = latest ? [
    { name: latest.pool_name_1 ?? 'Pool 1', value: latest.pool_share_1 ?? 0 },
    { name: latest.pool_name_2 ?? 'Pool 2', value: latest.pool_share_2 ?? 0 },
    { name: latest.pool_name_3 ?? 'Pool 3', value: latest.pool_share_3 ?? 0 },
    { name: 'Others', value: Math.max(0, 100 - ((latest.pool_share_1 ?? 0) + (latest.pool_share_2 ?? 0) + (latest.pool_share_3 ?? 0))) },
  ] : []

  const POOL_COLORS = [ORANGE, BLUE, GREEN, GRAY]

  const supplyData = latest ? [
    { name: 'Mined',     value: parseFloat((latest.btc_total_mined ?? 0).toFixed(0)) },
    { name: 'Remaining', value: parseFloat((latest.btc_remaining ?? 0).toFixed(0)) },
  ] : []

  const minedPct    = latest ? ((latest.btc_total_mined / 21_000_000) * 100).toFixed(2) : '0'
  const avgBlockMin = latest
    ? `${Math.floor(latest.avg_block_time_sec / 60)}m ${Math.round(latest.avg_block_time_sec % 60)}s`
    : '—'

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">₿</span>
          <div>
            <h1 className="text-xl font-bold text-orange-400">Bitcoin Node Monitor</h1>
            <p className="text-gray-500 text-xs">Sovereign data • Updated every 60s</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-green-400 text-xs">Live</p>
            </div>
            <p className="text-gray-500 text-xs">{lastUpdate}</p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs px-3 py-2 rounded-lg transition-colors border border-gray-700"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Price & Network ── */}
      <SectionTitle title="Price & Network" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard
          title="BTC Price"
          value={`$${fmt(latest?.btc_price_usd ?? 0)}`}
          sub={`${fmt(latest?.sats_per_dollar ?? 0)} sats per $1`}
        />
        <StatCard
          title="Block Height"
          value={fmt(latest?.block_height ?? 0)}
          sub={latest?.block_miner ?? '—'}
          color={BLUE}
        />
        <StatCard
          title="Hashrate"
          value={`${fmt(latest?.current_hashrate ?? 0, 1)} EH/s`}
          sub={`3d avg: ${fmt(latest?.hashrate_3d ?? 0, 1)} EH/s`}
          color={PURPLE}
        />
        <StatCard
          title="Difficulty"
          value={`${((latest?.current_difficulty ?? 0) / 1e12).toFixed(1)}T`}
          sub={`Retarget: ${fmt(latest?.estimated_retarget ?? 0, 2)}%`}
          color={TEAL}
        />
      </div>

      {/* ── Fees & Mempool ── */}
      <SectionTitle title="Fees & Mempool" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard
          title="Next Block Fee"
          value={`${latest?.fee_fastest ?? '—'} sat/vB`}
          sub={`30min: ${latest?.fee_half_hour ?? '—'} sat/vB`}
          color={ORANGE}
        />
        <StatCard
          title="Economy Fee"
          value={`${latest?.fee_economy ?? '—'} sat/vB`}
          sub={`Min: ${latest?.fee_minimum ?? '—'} sat/vB`}
          color={GREEN}
        />
        <StatCard
          title="Mempool"
          value={fmt(latest?.tx_count ?? 0)}
          sub={`${fmt(latest?.mempool_size_mb ?? 0, 2)} MB`}
          color={ORANGE}
        />
        <StatCard
          title="Total Fees"
          value={`${fmt(latest?.total_fees_btc ?? 0, 4)} BTC`}
          sub={`Avg/block: ${fmt(latest?.avg_fees_per_block ?? 0, 4)} BTC`}
          color={RED}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ChartCard title="⚡ Fee Rates (sat/vB)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Line type="monotone" dataKey="fastest"  stroke={ORANGE} dot={false} name="Next Block" strokeWidth={2} />
              <Line type="monotone" dataKey="halfHour" stroke={BLUE}   dot={false} name="30 Min"     strokeWidth={1.5} />
              <Line type="monotone" dataKey="hour"     stroke={GREEN}  dot={false} name="1 Hour"     strokeWidth={1.5} />
              <Line type="monotone" dataKey="economy"  stroke={GRAY}   dot={false} name="Economy"    strokeWidth={1} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🔮 Next 3 Block Fee Projections (sat/vB)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Line type="monotone" dataKey="nextFee"   stroke={ORANGE} dot={false} name="Next Block" strokeWidth={2} />
              <Line type="monotone" dataKey="secondFee" stroke={BLUE}   dot={false} name="2nd Block"  strokeWidth={1.5} />
              <Line type="monotone" dataKey="thirdFee"  stroke={GREEN}  dot={false} name="3rd Block"  strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ChartCard title="📦 Mempool Pending Transactions">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="txCount" stroke={ORANGE} fill="#F7931A22" name="Pending TXs" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="💸 Total Fees in Mempool (BTC)">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="totalFees" stroke={RED} fill="#EF444422" name="Total Fees (BTC)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Mining ── */}
      <SectionTitle title="Mining & Hashrate" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard
          title="Block Reward"
          value={`${latest?.current_block_reward ?? '—'} BTC`}
          sub={`Next halving: ${latest?.next_halving_reward ?? '—'} BTC`}
          color={ORANGE}
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
        <StatCard
          title="Expected Retarget"
          value={`${fmt(latest?.estimated_retarget ?? 0, 2)}%`}
          sub={`Prev: ${fmt(latest?.prev_difficulty_change ?? 0, 2)}%`}
          color={TEAL}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ChartCard title="⛏️ Network Hashrate (EH/s)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Line type="monotone" dataKey="hashrate"   stroke={PURPLE} dot={false} name="Current" strokeWidth={2} />
              <Line type="monotone" dataKey="hashrate3d" stroke={BLUE}   dot={false} name="3d Avg"  strokeWidth={1.5} />
              <Line type="monotone" dataKey="hashrate1w" stroke={GREEN}  dot={false} name="1w Avg"  strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="⛏️ Mining Pool Dominance (7d)">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={poolData}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value?.toFixed(1)}%`}
                labelLine={false}
              >
                {poolData.map((_, i) => <Cell key={i} fill={POOL_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
        <p className="text-gray-300 text-sm font-semibold mb-3">🏆 Pool Leaderboard (Last 7 Days)</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { rank: '🥇', name: latest?.pool_name_1, share: latest?.pool_share_1, color: ORANGE },
            { rank: '🥈', name: latest?.pool_name_2, share: latest?.pool_share_2, color: BLUE },
            { rank: '🥉', name: latest?.pool_name_3, share: latest?.pool_share_3, color: GREEN },
          ].map((p, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl mb-1">{p.rank}</p>
              <p className="font-bold text-sm" style={{ color: p.color }}>{p.name ?? '—'}</p>
              <p className="text-gray-400 text-xs">{fmt(p.share ?? 0, 1)}% of blocks</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
        <p className="text-gray-300 text-sm font-semibold mb-3">🧱 Recent Blocks</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                <th className="text-left py-2 pr-4">Height</th>
                <th className="text-left py-2 pr-4">Miner</th>
                <th className="text-right py-2 pr-4">TXs</th>
                <th className="text-right py-2 pr-4">Size (MB)</th>
                <th className="text-right py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                  <td className="py-2 pr-4 text-orange-400 font-mono font-bold">{fmt(b.block_height)}</td>
                  <td className="py-2 pr-4 text-gray-300">{b.block_miner ?? '—'}</td>
                  <td className="py-2 pr-4 text-right text-gray-300">{fmt(b.block_tx_count ?? 0)}</td>
                  <td className="py-2 pr-4 text-right text-gray-300">{fmt(b.block_size_mb ?? 0, 2)}</td>
                  <td className="py-2 text-right text-gray-500 text-xs">{b.block_time ? fmtDate(b.block_time) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Price ── */}
      <SectionTitle title="Price & Value" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ChartCard title="💰 BTC Price (USD)">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="price" stroke={GREEN} fill="#22C55E22" name="BTC Price ($)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🪙 Sats per Dollar">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="satsPerDollar" stroke={ORANGE} fill="#F7931A22" name="Sats/$1" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Lightning ── */}
      <SectionTitle title="Lightning Network" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard
          title="Channels"
          value={fmt(latest?.lightning_channels ?? 0)}
          sub="Active payment channels"
          color={PURPLE}
        />
        <StatCard
          title="Capacity"
          value={`${fmt(latest?.lightning_capacity_btc ?? 0, 0)} BTC`}
          sub="Total BTC locked"
          color={BLUE}
        />
        <StatCard
          title="Tor Nodes"
          value={fmt(latest?.lightning_tor_nodes ?? 0)}
          sub="Private/anonymous"
          color={ORANGE}
        />
        <StatCard
          title="Clearnet Nodes"
          value={fmt(latest?.lightning_clearnet_nodes ?? 0)}
          sub="Public internet"
          color={GREEN}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ChartCard title="⚡ Lightning Channels Over Time">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="channels" stroke={PURPLE} fill="#A855F722" name="Channels" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🌐 Lightning Node Types (Tor vs Clearnet)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10 }} interval={19} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Line type="monotone" dataKey="torNodes"   stroke={ORANGE} dot={false} name="Tor Nodes"      strokeWidth={2} />
              <Line type="monotone" dataKey="clearNodes" stroke={BLUE}   dot={false} name="Clearnet Nodes" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Supply & Halving ── */}
      <SectionTitle title="Bitcoin Supply & Halving" />
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
                <p className="text-gray-400 text-xs">Remaining Forever</p>
                <p className="text-blue-400 text-xl font-bold">{fmt(latest?.btc_remaining ?? 0)} BTC</p>
                <p className="text-gray-500 text-xs">Will never exceed 21,000,000</p>
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="🎯 Next Halving">
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">Next Halving Block</p>
              <p className="text-orange-400 font-bold font-mono">{fmt(latest?.next_halving_block ?? 0)}</p>
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
                className="h-2 rounded-full transition-all"
                style={{ width: `${latest?.epoch_progress ?? 0}%`, backgroundColor: ORANGE }}
              />
            </div>
            <p className="text-gray-500 text-xs text-center">
              {fmt(latest?.epoch_progress ?? 0, 1)}% through current epoch
            </p>
          </div>
        </ChartCard>
      </div>

      {/* ── Footer ── */}
      <div className="text-center mt-8 text-gray-600 text-xs space-y-1">
        <p>₿ Data sourced from your sovereign Bitcoin node running on Umbrel</p>
        <p>Not financial advice • Updates every 60 seconds • All data from your own node</p>
      </div>

    </main>
  )
}
