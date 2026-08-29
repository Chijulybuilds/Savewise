import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  formatMoney,
  toMajor,
  type CategoryBreakdownDto,
  type CurrencyCode,
  type MonthlyPointDto,
} from '@savewise/shared';

import { ChartLegend, ChartTooltip } from './ChartCard';
import { useChartTheme } from './useChartTheme';

/**
 * The chart set.
 *
 * Shared conventions across all of them:
 *
 * - Money is converted to **major units** for the axis only. The underlying
 *   values stay integer minor units everywhere else; a chart is the one place
 *   a rounded float is harmless.
 * - Axis ticks are compact (`₦120k`), because a naira axis in full digits eats
 *   a third of the plot area on a phone.
 * - `ResponsiveContainer` everywhere, with the height set by the parent card.
 * - Entrance animation is short and runs once. A chart that redraws itself on
 *   every state change is exhausting to read.
 */

const ANIMATION_MS = 700;

function compactTick(currency: CurrencyCode) {
  return (value: number) => formatMoney(value, currency, { compact: true });
}

/* -------------------------------------------------------------------------- */
/* Spending trend                                                              */
/* -------------------------------------------------------------------------- */

interface TrendProps {
  data: MonthlyPointDto[];
  currency: CurrencyCode;
  height?: number;
}

/** Monthly spend over time. An area chart, because the magnitude is the story. */
export function SpendingTrendChart({ data, currency, height = 260 }: TrendProps) {
  const theme = useChartTheme();
  const points = data.map((point) => ({ ...point, expensesMajor: toMajor(point.expenses) }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.series[0]} stopOpacity={0.22} />
            <stop offset="100%" stopColor={theme.series[0]} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Horizontal rules only — vertical grid lines add noise without
            helping anyone read a value off a time axis. */}
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          dy={6}
        />
        <YAxis
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={compactTick(currency)}
          width={56}
        />
        <Tooltip
          content={<ChartTooltip currency={currency} />}
          cursor={{ stroke: theme.border, strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          name="Spent"
          stroke={theme.series[0]}
          strokeWidth={2}
          fill="url(#spendFill)"
          animationDuration={ANIMATION_MS}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* Income vs expenses                                                          */
/* -------------------------------------------------------------------------- */

/** Grouped bars — the comparison between the two is the whole point. */
export function IncomeExpenseChart({ data, currency, height = 300 }: TrendProps) {
  const theme = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barGap={2}>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          dy={6}
        />
        <YAxis
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={compactTick(currency)}
          width={56}
        />
        <Tooltip
          content={<ChartTooltip currency={currency} />}
          cursor={{ fill: theme.grid, fillOpacity: 0.35 }}
        />
        <Legend
          verticalAlign="top"
          align="left"
          height={32}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: theme.inkMuted }}
        />
        <Bar
          dataKey="income"
          name="Income"
          fill={theme.series[0]}
          radius={[4, 4, 0, 0]}
          animationDuration={ANIMATION_MS}
        />
        <Bar
          dataKey="expenses"
          name="Spent"
          fill={theme.series[1]}
          radius={[4, 4, 0, 0]}
          animationDuration={ANIMATION_MS}
        />
        <Bar
          dataKey="savings"
          name="Saved"
          fill={theme.series[2]}
          radius={[4, 4, 0, 0]}
          animationDuration={ANIMATION_MS}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* Savings growth                                                              */
/* -------------------------------------------------------------------------- */

interface GrowthProps {
  data: { label: string; balance: number }[];
  currency: CurrencyCode;
  height?: number;
  /** Index from which the line becomes a projection rather than history. */
  projectedFrom?: number;
}

/**
 * Cumulative savings. A line, because the *direction* is what matters — and
 * because a rising line is the single clearest picture of a habit working.
 */
export function SavingsGrowthChart({ data, currency, height = 260 }: GrowthProps) {
  const theme = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          dy={6}
        />
        <YAxis
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={compactTick(currency)}
          width={56}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: theme.border }} />
        <Line
          type="monotone"
          dataKey="balance"
          name="Total saved"
          stroke={theme.series[0]}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
          animationDuration={ANIMATION_MS}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* Category breakdown                                                          */
/* -------------------------------------------------------------------------- */

interface CategoryChartProps {
  data: CategoryBreakdownDto[];
  currency: CurrencyCode;
  height?: number;
  /** Categories beyond this are grouped into "Other" so the chart stays readable. */
  maxSlices?: number;
}

/**
 * Category split as a donut.
 *
 * Capped at six slices plus an "Other" — a pie with fifteen wedges answers no
 * question anyone actually has. The hole in the middle is not decoration: it
 * makes the arc lengths easier to compare than a full pie's areas.
 */
export function CategoryDonut({ data, currency, height = 260, maxSlices = 6 }: CategoryChartProps) {
  const theme = useChartTheme();

  const top = data.slice(0, maxSlices);
  const rest = data.slice(maxSlices);
  const slices = [
    ...top,
    ...(rest.length > 0
      ? [
          {
            category: '__other',
            label: `${rest.length} more`,
            amount: rest.reduce((sum, item) => sum + item.amount, 0),
            percentage: rest.reduce((sum, item) => sum + item.percentage, 0),
          },
        ]
      : []),
  ];

  const colours = slices.map(
    (_, index) => theme.series[index % theme.series.length] ?? theme.primary,
  );

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="label"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              stroke={theme.surface}
              strokeWidth={2}
              animationDuration={ANIMATION_MS}
            >
              {slices.map((slice, index) => (
                <Cell key={slice.category} fill={colours[index]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* The legend doubles as the data table — every value is readable as text,
          not only by hovering a wedge. */}
      <ul className="w-full space-y-2 sm:w-52">
        {slices.map((slice, index) => (
          <li key={slice.category} className="flex items-center gap-2.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: colours[index] }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-ink-muted">{slice.label}</span>
            <span className="tabular shrink-0 font-medium text-ink">
              {formatMoney(slice.amount, currency, { compact: true })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Budget bars                                                                 */
/* -------------------------------------------------------------------------- */

interface BudgetComparisonProps {
  data: { label: string; budgeted: number; spent: number }[];
  currency: CurrencyCode;
  height?: number;
}

/**
 * Budgeted against spent, per category.
 *
 * Horizontal bars, because category names are words: vertical bars would force
 * either rotated labels or truncation, and both are worse than turning the
 * chart on its side.
 */
export function BudgetComparisonChart({ data, currency, height = 320 }: BudgetComparisonProps) {
  const theme = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
        barGap={2}
      >
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={compactTick(currency)}
        />
        <YAxis
          type="category"
          dataKey="label"
          stroke={theme.axis}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          width={92}
        />
        <Tooltip
          content={<ChartTooltip currency={currency} />}
          cursor={{ fill: theme.grid, fillOpacity: 0.35 }}
        />
        <Bar
          dataKey="budgeted"
          name="Budgeted"
          fill={theme.grid}
          radius={[0, 4, 4, 0]}
          animationDuration={ANIMATION_MS}
        />
        <Bar
          dataKey="spent"
          name="Spent"
          fill={theme.series[0]}
          radius={[0, 4, 4, 0]}
          animationDuration={ANIMATION_MS}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { ChartLegend };
