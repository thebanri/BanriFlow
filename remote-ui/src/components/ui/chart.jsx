import React, { createContext, useContext, useId } from "react"
import { Tooltip, Legend, ResponsiveContainer } from "recharts"

const ChartContext = createContext(null)

export function ChartContainer({
  id,
  className,
  config,
  children,
  ...props
}) {
  const generatedId = useId()
  const chartId = id || generatedId

  // Format id for selector safely (replace colon from useId if present)
  const safeChartId = chartId.replace(/:/g, "")

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        id={safeChartId}
        className={`flex justify-center text-xs w-full ${className || ""}`}
        {...props}
      >
        <ChartStyle id={safeChartId} config={config} />
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }) {
  const styles = Object.entries(config)
    .map(([key, item]) => {
      const color = item.color
      return color ? `#${id} { --color-${key}: ${color}; }` : ""
    })
    .filter(Boolean)
    .join("\n")

  if (!styles) return null

  return <style dangerouslySetInnerHTML={{ __html: styles }} />
}

export const ChartTooltip = Tooltip

export function ChartTooltipContent({
  active,
  payload,
  label,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  labelKey,
  nameKey,
}) {
  const { config } = useContext(ChartContext) || {}

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="p-3 bg-slate-900/95 border border-slate-700/60 rounded-xl shadow-2xl backdrop-blur-md text-xs font-semibold flex flex-col gap-1.5 min-w-[120px]">
      {!hideLabel && (
        <div className="text-slate-400 font-mono">{label}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => {
          const key = nameKey || item.nameKey || item.name || item.dataKey
          const itemConfig = config?.[key]
          const color = item.color || item.fill || itemConfig?.color

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                {!hideIndicator && (
                  <div
                    className={`w-2.5 h-2.5 rounded-sm ${indicator === 'line' ? 'h-0.5 w-3' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="text-slate-300">
                  {itemConfig?.label || item.name}
                </span>
              </div>
              <span className="text-slate-100 font-mono">
                {item.value.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const ChartLegend = Legend

export function ChartLegendContent({ payload }) {
  const { config } = useContext(ChartContext) || {}

  if (!payload?.length) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-300">
      {payload.map((item, index) => {
        const key = item.value
        const itemConfig = config?.[key]
        const color = item.color || itemConfig?.color

        return (
          <div key={index} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span>{itemConfig?.label || item.value}</span>
          </div>
        )
      })}
    </div>
  )
}
